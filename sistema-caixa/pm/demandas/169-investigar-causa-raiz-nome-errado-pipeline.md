# 169 — Investigar e corrigir a causa raiz do nome errado de contato no pipeline de log

Status: concluída
Criada em: 2026-07-13
Aprovada em: 2026-07-13
Concluída em: 2026-07-15
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Ver demanda 168 (02-DADOS) pro achado completo: pelo menos 29 contatos reais de WhatsApp estão
gravados com `jsgrafica_contatos.lead_name = "J S Gráfica"` (o nome da própria empresa) em vez do
nome real de quem manda mensagem, e outros 35 com nome vazio. Isso só pode estar acontecendo no
workflow `01 - LOG MSG RECEBIDAS` (é o único ponto que grava/atualiza `lead_name` a partir do
payload da Z-API) — suspeita: para contatos que chegam só com "LID" (identificador oculto por
privacidade, sem `pushName`/nome de exibição real no payload), algum nó cai num fallback errado e
usa o nome da própria conta conectada/empresa em vez de deixar vazio ou usar outro campo
disponível do payload.

## Objetivo
Encontrar exatamente qual nó/lógica causa o nome errado, corrigir pra nunca gravar o nome da
empresa como se fosse o nome do cliente, e confirmar que contatos novos LID-only entram com nome
vazio (ou o melhor campo disponível) em vez de errado.

## Escopo
- Incluído: ler nó a nó o workflow `01 - LOG MSG RECEBIDAS` na parte que grava/atualiza
  `jsgrafica_contatos.lead_name` (e campos relacionados: `lead_chat_name`, `lead_sender_name`,
  `lead_push_name`, `lead_notify_name`) — comparar contra o payload real da Z-API pra pelo menos
  1 dos 29 casos (usar as execuções recentes do contato `9324776665254@lid`, telefone
  `558199744479`, se ainda estiver no histórico de execuções do n8n) e achar onde o valor "J S
  Gráfica" (ou `empresa_nome` de `jsgrafica_agent_config`) entra no lugar errado.
- Corrigir a lógica pra nunca usar o nome da empresa/conta conectada como nome do contato —
  fallback correto é nulo (ou o melhor campo real disponível do payload, ex. `lead_chat_name` já
  cru se for mais informativo que nada).
- Explicitamente fora de escopo: corrigir os dados já existentes (demanda 168, 02-DADOS).

## Critérios de aceite
- [ ] Nó/lógica exata identificada e explicada no relato (qual campo do payload confundiu com o
      quê)
- [ ] Corrigido de forma que uma mensagem nova de contato LID-only sem nome real não grave o nome
      da empresa
- [ ] Testado com uma mensagem real ou simulada equivalente ao caso encontrado
- [ ] Nenhuma mudança que afete o roteamento pra atendimento automático ou outro comportamento do
      workflow além da gravação do nome

## Riscos e cuidados
Workflow `01` é crítico (todo o log de mensagens passa por ele) — mudar só o nó relevante, testar
isoladamente antes de considerar concluído, não mexer em roteamento/autorização.

## Referências
Workflow `01 - LOG MSG RECEBIDAS` (id `lcFEt1kbyqNfTS89`, ver
`pm/conhecimento/mapa-workflows-n8n.md`). Demanda 168 (02-DADOS, dados já existentes). Achado
original: contato `9324776665254@lid` / Laura Isabel.

## Relato de execução

**Status final: concluída**

### Causa raiz (confirmada com dado real, não suposição)
No node `Processar Evento` (workflow `01`), o cálculo de `leadName` pra chat privado (não-grupo)
já tinha proteção via `nomeValido()` contra o valor virar o próprio telefone/LID, mas usava:

```js
const leadName = isGroup
  ? (...)
  : ([rawZapi.chatName, rawZapi.senderName].find(n => nomeValido(n, phone, chatLid)) ?? null);
```

`senderName`, num evento de chat privado, representa **quem enviou aquela mensagem
especificamente** — pra mensagem enviada pela própria gráfica (`fromMe: true`), isso é sempre o
nome da própria conta conectada (`"J S Gráfica"`), nunca o nome do cliente. Quando `chatName`
vem `null` (não `""`, não o LID — literalmente ausente do payload), o candidato pulava direto
pra `senderName`, e como `"J S Gráfica"` não é igual a `phone`/`chatLid`, passava em
`nomeValido()` como "válido" e virava o nome do contato.

**Confirmado com evento real**: contato `262663154229436@lid` / telefone `558183950414` (um dos
29 do achado), evento de `2026-07-14`, `notification: "REVOKE"` (notificação de mensagem
apagada — parece ser o tipo de evento mais comum pra isso, já que não carrega texto/contexto
normal): `"fromMe":true, "chatName":null, "senderName":"J S Gráfica"`. Bate exatamente com a
lógica acima.

### O que foi feito
No mesmo node, condicionei o cálculo pra **nunca considerar `senderName` como candidato quando
`fromMe === true`** em chat privado — nesse caso, o `senderName` é garantidamente o nome da
própria conta, nunca o do cliente:

```js
const leadName = isGroup
  ? ([rawZapi.senderName, rawZapi.pushName].find(n => nomeValido(n, participantPhone, participantLid)) ?? null)
  : (fromMe
      ? ([rawZapi.chatName].find(n => nomeValido(n, phone, chatLid)) ?? null)
      : ([rawZapi.chatName, rawZapi.senderName].find(n => nomeValido(n, phone, chatLid)) ?? null));
```

Se `chatName` também não tiver valor válido nesse caso (`fromMe:true` + `chatName` ausente), o
resultado é `null` — que, no `PREPARAR LOG CONTATOS` (já corrigido pela demanda 081), preserva o
nome já existente do contato em vez de sobrescrever. Não mexi em roteamento, autorização, nem em
nenhum outro campo/nó.

### Testes realizados
1. **Reprodução exata do bug** (evento sintético, contato novo, sem registro prévio):
   `fromMe:true`, `chatName:null`, `senderName:"J S Gráfica"`, `notification:"REVOKE"` →
   `lead_name` gravado como **`null`** (não mais `"J S Gráfica"`).
2. **Regressão**: mesmo contato, primeiro uma mensagem normal do cliente (`fromMe:false`,
   `chatName`/`senderName` = nome real) — `lead_name` gravado certo. Depois, o mesmo evento do
   bug (`fromMe:true`, `chatName:null`, `senderName:"J S Gráfica"`) de novo — `lead_name`
   **continuou** com o nome real do cliente, não foi sobrescrito.
3. Dados sintéticos removidos depois dos testes.

### Achado fora do escopo (registro, não implementado)
Cogitei também adicionar `empresa_nome` (de `jsgrafica_agent_config`) como um identificador
extra pro `nomeValido()` rejeitar, como camada extra de proteção — decidi não fazer isso porque
exigiria buscar esse valor num node que hoje não tem acesso a ele (mais uma chamada
Supabase/complexidade num node crítico), e a correção acima já resolve a causa raiz de forma
mais precisa (nunca gera o valor errado, em vez de só filtrar depois). Fica registrado como
ideia de defesa-em-profundidade se o Edvam/PM quiser considerar depois.

### Critérios de aceite
- [x] Nó/lógica exata identificada e explicada (campo `senderName` usado como fallback de
      `chatName` ausente, em evento `fromMe:true` — `senderName` nesse caso é sempre o nome da
      própria conta)
- [x] Corrigido de forma que mensagem nova de contato LID-only sem nome real não grave o nome
      da empresa
- [x] Testado com evento simulado equivalente ao caso real encontrado
- [x] Nenhuma mudança em roteamento/autorização — só o cálculo de `leadName`
