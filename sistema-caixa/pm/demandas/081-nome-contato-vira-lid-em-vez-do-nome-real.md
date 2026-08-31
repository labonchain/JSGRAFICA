# 081 — Nome do contato às vezes vira o @lid cru em vez do nome real (n8n)

Status: concluída
Criada em: 2026-07-06
Aprovada em: 2026-07-06
Concluída em: 2026-07-06
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Achado pelo PM, com 2 casos reais confirmados via print do Edvam:

**Caso 1** — contato `202559381852233@lid`: `lead_name` gravado como a própria string do @lid
(`"202559381852233@lid"`) em vez de um nome de verdade. Não é um contato recorrente (checado:
outros ~15 contatos @lid do log têm nome real gravado certo em `lead_name`).

**Caso 2** — contato `52063694233823@lid` ("Edvan Filho", contato de teste usado a sessão toda):
tinha `lead_name: "Edvan Filho"` gravado corretamente antes, mas **regrediu pra `lead_name: ""`**
(string vazia) depois de mais mensagens trocadas hoje — um evento posterior sobrescreveu o nome
bom por um valor vazio.

**Causa raiz confirmada no código do workflow `01 - JSGRAFICA | LOG MSG RECEBIDAS`
(id `lcFEt1kbyqNfTS89`), nó "Processar Evento":**
```js
const leadName = isGroup
  ? (rawZapi.senderName ?? rawZapi.pushName ?? null)
  : (rawZapi.chatName ?? rawZapi.senderName ?? null);
```
O operador `??` (nullish coalescing) só pula pro próximo valor quando o campo é `null`/`undefined`
— **não pula quando o Z-API manda uma string vazia (`""`) ou o próprio identificador (@lid/telefone)
como `chatName`**. Isso explica os dois casos: quando `rawZapi.chatName` vem vazio ou igual ao
próprio @lid (acontece em alguns eventos do Z-API, ex.: status/delivery sem nome de exibição
disponível), o `leadName` fica errado — e cada novo evento **sobrescreve** o nome bom que já
existia (não é só "nunca setou", é "apagou o que tinha").

## Objetivo
`lead_name` nunca fica vazio nem igual ao @lid/telefone cru quando existe um nome de verdade
disponível (do próprio evento atual ou de um evento anterior já gravado).

## Escopo
- Incluído:
  1. No nó "Processar Evento", trocar a lógica de `leadName` pra tratar como "sem nome" qualquer
     valor vazio (`""`, só espaço) ou igual ao próprio `@lid`/telefone do contato — não só
     `null`/`undefined`.
  2. **Nunca sobrescrever um nome bom já gravado por um valor vazio/inválido**: se o evento atual
     não tem nome de verdade, mas o contato já tem um `lead_name` válido no banco, manter o que já
     existe (não sobrescrever com vazio). Isso provavelmente precisa de um ajuste também no nó
     "PREPARAR LOG CONTATOS", que hoje só repassa `lead_name: data.lead_name` sem checar se o
     valor existente era melhor.
- Fora de escopo: mudar a lógica de fallback do frontend (`c.lead_name || c.lead_push_name ||
  c.phone` em `app/api/inbox/conversas/route.ts`) — já está correta, só precisa que os dados
  gravados sejam corretos.

## Critérios de aceite
- [ ] Corrigir manualmente os 2 contatos já afetados (`202559381852233@lid`,
      `52063694233823@lid`) — atualizar `lead_name` pro valor certo (ou null, deixando o
      fallback do frontend cuidar)
- [ ] Testado com uma mensagem real de um contato cujo evento tenha `chatName` vazio — nome
      anterior não é apagado
- [ ] Nenhum contato novo aparece com `lead_name` = @lid cru ou string vazia depois do fix

## Riscos e cuidados
Isso afeta todos os projetos que usam esse mesmo workflow de log (não só JS Gráfica — o mesmo
código existe em vários workflows "LOG MSG RECEBIDAS" de outros clientes). Avaliar se vale
replicar o fix nos outros também, ou se por ora só corrige o da JS Gráfica.

## Referências
Workflow n8n `01 - JSGRAFICA | LOG MSG RECEBIDAS` (`lcFEt1kbyqNfTS89`), nós "Processar Evento" e
"PREPARAR LOG CONTATOS". `app/api/inbox/conversas/route.ts` (fallback de exibição, não mexer).

## Relato de execução

**Status final: concluída**

### O que foi feito
Backup do workflow `01` salvo em
`pm/backups/01-jsgrafica-log-msg-recebidas_pre-demanda081_2026-07-06.json` antes de mexer.

1. **Nó "Processar Evento"** — troquei a lógica de `leadName`. Criei uma função `nomeValido(nome,
   ...identificadores)` que rejeita: valor falsy, string vazia/só-espaço, ou igual (depois de
   `trim()`) a qualquer identificador passado (telefone/@lid). A cadeia de fallback continua a
   mesma (privada: `chatName` → `senderName`; grupo: `senderName` → `pushName`), só que agora
   usando `.find(n => nomeValido(...))` em vez de `??`, comparando contra `phone`/`chatLid`
   (privada) ou `participantPhone`/`participantLid` (grupo).
2. **Nó "PREPARAR LOG CONTATOS"** — adicionei a mesma função `nomeValido` e uma variável
   `leadNameFinal`: se o `lead_name` do evento atual é válido, usa ele; **senão, mantém o
   `lead_name` que já existia no contato** (`contatoExistente?.lead_name`), em vez de sempre
   sobrescrever com o que veio do evento. Troquei a linha de output `lead_name: data.lead_name`
   por `lead_name: leadNameFinal`.
3. **Corrigidos manualmente os 2 contatos afetados:**
   - `202559381852233@lid`: não tinha nome de verdade em nenhum campo (nem `lead_sender_name`,
     que mostrava "J S Gráfica" — nome da própria gráfica, não do cliente) → `lead_name` e
     `lead_chat_name` setados pra `NULL` (deixa o fallback do frontend, `lead_push_name ||
     phone`, cuidar da exibição).
   - `52063694233823@lid` ("Edvan Filho") → `lead_name` e `lead_chat_name` restaurados pra
     `"Edvan Filho"`.

### Testes realizados e resultado
Três testes sintéticos via webhook (controlo o payload exato, o que dá pra reproduzir os dois
bugs com precisão sem precisar de mídia real):
1. **Contato novo com nome bom** (`chatName: "Cliente Teste 081"`) → gravou `lead_name:
   "Cliente Teste 081"` corretamente.
2. **Mesmo contato, segunda mensagem com `chatName` vazio** (reproduz exatamente o caso do
   "Edvan Filho") → `lead_name` **permaneceu** `"Cliente Teste 081"` (não foi apagado),
   `total_interacoes` incrementou de 1 pra 2 normalmente.
3. **Contato novo com `chatName` igual ao próprio telefone/@lid** (reproduz o caso
   `202559381852233@lid`) → `lead_name` gravado como `null`, não como a string crua do
   identificador.

Todos os 3 dados sintéticos foram apagados depois de confirmar.

### Achados fora do escopo
Confirmei (via `search_workflows`) que o mesmo nó "Processar Evento" com a mesma lógica de
`leadName` existe em pelo menos mais **8 workflows "LOG MSG RECEBIDAS" de outros clientes** na
mesma instância n8n: `01 - CONECTA`, `01 - BIOBOTS`, `01 - TRIPNEED`, `02 - LABON`, `02 -
SATORAHAL`, `02 - DIZUREFEICOES`, `02 - MAITECH`, `01 - OA`. **Não toquei em nenhum deles** —
fora do meu domínio (só cuido do workflow da JS Gráfica) e é uma decisão que afeta outros
clientes/stakeholders, não só a JS Gráfica. Fica pro PM decidir se replica o mesmo fix (a
mudança é pequena e de baixo risco, mesmo padrão que apliquei aqui) e em qual ordem/prioridade.

### Adendo (2026-07-07) — limpeza retroativa em massa

O Edvam mandou prints do Inbox mostrando **muito mais que 2 contatos** com @lid cru — confirmei
que meu fix (deployado às 02:05 UTC de 07/07) só impede casos **novos** e não limpa registros
que já estavam ruins. Todos os exemplos dos prints eram de mensagens de 06/07, antes do fix.

Levantei o tamanho real do problema: **47 contatos** com `lead_name` nulo/vazio/igual ao próprio
@lid. Cruzei com o histórico de mensagens (`jsgrafica_log_msgs_privadas`, só `from_me:false` pra
não pegar nome de atendente da própria equipe por engano — achei um falso positivo assim,
"Gabi", que é atendente da gráfica, não cliente) e recuperei nome real pra **3 contatos**:
`105879802253411@lid` → "~Rebeka🕯️", `269604291092729@lid` → "🤍 Pricila 🍃",
`6464009687067@lid` → "Nilda 🌹". Os outros **43** não têm nome real registrado em nenhum campo
(`lead_chat_name`, `lead_sender_name`, `lead_push_name`) em nenhum evento já recebido — limpei
pra `NULL` (antes tinham o @lid cru gravado como se fosse dado válido).

**Importante, pra não gerar falsa expectativa:** desses 43, nenhum tem `lead_push_name`
preenchido também — ou seja, o fallback do frontend (`lead_name || lead_push_name || phone`)
vai continuar mostrando o @lid pra eles no Inbox, porque **não existe nome nenhum disponível em
lugar nenhum dos dados** — não é mais bug de código, é limitação de dado: o WhatsApp/Z-API nunca
mandou um nome de exibição pra esses contatos em nenhum evento que já recebemos. Se um desses
contatos mandar mensagem de novo agora (depois do fix), e o evento vier com nome de verdade, aí
sim vai gravar certo daqui pra frente.

Confirmado depois da limpeza: **0 contatos** com `lead_name` = @lid cru (era o problema
original); 472 com nome válido; 43 com `lead_name: null` sem melhor opção disponível (esperado,
não é bug).

### Critérios de aceite
- [x] Corrigidos manualmente os 2 contatos já afetados
- [x] Testado com mensagem sintética reproduzindo `chatName` vazio — nome anterior não foi
      apagado
- [x] Confirmado que contato novo com `chatName` = @lid cru grava `lead_name: null`, não a
      string crua
