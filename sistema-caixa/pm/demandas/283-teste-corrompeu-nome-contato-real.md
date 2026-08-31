# 283 — Teste da 281 escreveu dado sintético no contato real do Edvam (nome + identificador)

Status: concluída
Criada em: 2026-08-16
Aprovada em: 2026-08-16
Concluída em: 2026-08-16
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Achado ao vivo pelo Edvam (2026-08-16): seu próprio nome de contato no sistema (`lead_name` em
`jsgrafica_contatos`, telefone `5521965185667`, normalmente "Ninho") virou **"Edvam Teste 281"**,
e o `contact_lid` mudou do identificador estável (`52063694233823@lid`) pro número de telefone
cru (`5521965185667`) — mesmo padrão de instabilidade que a demanda 266 já tinha corrigido uma
vez, e que a demanda 280 tinha visto passar mas não conseguiu reproduzir na hora ("pista 2").

**Confirmado com prova real, minutos depois**: uma mensagem real subsequente corrigiu a linha
sozinha, voltando o `contact_lid` certo e o nome "Ninho" — não houve duplicata de linha (é a MESMA
linha, sobrescrita e depois ressincronizada), e o dado não ficou permanentemente errado desta vez.
Mas o fato de ter acontecido confirma que testes da demanda 281 (ou de demandas anteriores do
agente Fase B, mesma suspeita da 280) estão escrevendo em `jsgrafica_contatos` com dado sintético
que não carrega o `contact_lid` real do contato, e isso **sobrescreve dado real de contato de
verdade**, não só de sessão de teste.

## Objetivo
Nenhum teste do agente Fase B (ou de qualquer workflow) escreve em `jsgrafica_contatos` com nome
ou identificador sintético/de teste — testes usam um caminho que não toca a tabela de contatos
real, ou usam sempre o `contact_lid` verdadeiro do número de teste quando precisarem simular
atividade.

## Escopo
- Incluído: identificar exatamente qual parte do teste da demanda 281 (inserção de linha em
  `jsgrafica_memoria_conversas`, ou alguma chamada que passou pelo `01`/`206` de verdade) acabou
  gravando em `jsgrafica_contatos` — o relato da 281 não menciona ter tocado essa tabela
  diretamente, então precisa investigar se foi efeito colateral de alguma execução real disparada
  durante o teste (ex. mensagem sintética passando pelo `01` completo, incluindo o trecho que
  cria/atualiza contato).
- Incluído: corrigir a forma de testar pra nunca escrever nome/identificador sintético no contato
  real — se o teste precisa simular uma mensagem chegando, usar sempre o `contact_lid` real do
  número de teste (`52063694233823@lid` pro número do Edvam), nunca deixar cair no fallback por
  `phone` cru que cria/atualiza com dado errado.
- Incluído: confirmar (ou não) se isso é a mesma causa da "pista 2" da demanda 280 — reportar com
  clareza pro PM atualizar aquele registro.
- Incluído: checklist de limpeza pós-teste passa a incluir conferir `jsgrafica_contatos` também,
  não só as tabelas de sessão/log que já eram checadas.
- Explicitamente fora de escopo: qualquer mudança na lógica de lookup/update de contato em si
  (isso já foi endurecido na 266) — o problema aqui é como o TESTE gera o payload, não a lógica de
  produção.

## Critérios de aceite
- [x] Causa exata identificada (qual chamada/teste específico gravou em `jsgrafica_contatos`)
- [x] Forma de testar corrigida pra nunca mais escrever nome/identificador sintético num contato
      real
- [x] Confirmado se é a mesma causa da "pista 2" da demanda 280
- [x] Checklist de limpeza pós-teste atualizado

## Riscos e cuidados
Isso já aconteceu de verdade com o contato de teste do Edvam — o risco real é isso acontecer com
o nome de um cliente de verdade num teste futuro, sem uma mensagem real chegando logo depois pra
corrigir sozinho. Tratar com a mesma seriedade de qualquer bug que mexe em dado de cliente real.

## Referências
Demanda 266 (`pm/demandas/266-*.md`, correção original de instabilidade de `contact_lid`).
Demanda 280 (`pm/demandas/280-*.md`, "pista 2" não reproduzida na hora, agora com evidência real
de que acontece). Demanda 281 (teste que provavelmente disparou isso).

## Relato de execução

Executado em 2026-08-16. Sem mudança em nenhum workflow n8n (achado é sobre como EU testo, não
sobre a lógica de produção, que já foi endurecida na 266 e está corretamente fora de escopo aqui).

### Causa exata, confirmada por leitura direta do código do `01`

Meus testes das demandas 274/279/281 (e desta mesma sessão, antes de eu perceber o problema)
mandavam payload sintético direto pro webhook real `jsgraficamsgrecebidas`, no formato:
```
{ "type": "ReceivedCallback", "phone": "5521965185667", "chatName": "Edvam Teste NNN",
  "senderName": "Edvam Teste NNN", "text": {...}, ... }
```
**Faltava o campo `chatLid`.** Em `Processar Evento`:
```js
const chatLid = rawZapi.chatLid ?? rawZapi.chat_lid ?? null;
const contactLid = isGroup ? (...) : (chatLid ?? phone ?? null);
```
Sem `chatLid` no payload, `contactLid` caía pro fallback `phone` (número cru). E o `chatName`
sintético virava `lead_name` calculado ali mesmo (`leadName = [rawZapi.chatName, rawZapi.senderName]
.find(...)`), que chegava até `PREPARAR LOG CONTATOS` como `data.lead_name = "Edvam Teste NNN"`.

A trava que a demanda 266 põe contra sobrescrever nome bom (`nomeValido`) só rejeita nome
vazio/igual ao telefone ou ao `contact_lid`, **não sabe distinguir um nome sintético de teste de
um nome real digno de atualização**. Como "Edvam Teste 281" é uma string não-vazia, diferente do
telefone e do `contact_lid`, passou pela trava e sobrescreveu "Ninho" de verdade. O mesmo
mecanismo trocou o `contact_lid` gravado de `52063694233823@lid` pro telefone cru.

**Estado no momento desta investigação**: já autocorrigido (confirmado por SQL: `contact_lid:
52063694233823@lid`, `lead_name: Ninho`), batendo com o relato do Edvam de que uma mensagem real
teria corrigido sozinho minutos depois. Nenhum reparo manual necessário nesse ponto.

### Confirmado: é a mesma causa da "pista 2" da demanda 280, resolve a dúvida em aberto de lá

A 280 investigou e não achou nenhuma linha em `jsgrafica_log_msgs_privadas` com `contact_lid` =
telefone cru na janela de 16/08 (03:30/03:31): o motivo é que **eu mesmo apaguei essas linhas de
teste na limpeza pós-teste das demandas 279/281** (`DELETE ... WHERE message_id LIKE 'testeNNN-%'`),
antes da 280 rodar sua investigação. A corrupção aconteceu de verdade (confirmado agora pela
sequência de causa-efeito no código), só que o rastro em `jsgrafica_log_msgs_privadas` já não
existia mais quando a 280 foi procurar: a única marca que sobrou foi em `jsgrafica_contatos`
(que não tem "linha de teste" pra apagar, é update na linha real), e essa também já tinha sido
autocorrigida por uma mensagem real antes do Edvam reportar. **Confirma**: não é recorrência da
266 em produção real, é 100% efeito colateral de como os testes do agente Fase B foram feitos.

### Forma de testar corrigida, testada e confirmada

**Template seguro pro webhook real** (`jsgraficamsgrecebidas`), a partir de agora:
```json
{
  "type": "ReceivedCallback",
  "phone": "5521965185667",
  "chatLid": "52063694233823@lid",
  "fromMe": false,
  "isGroup": false,
  "messageId": "testeNNN-descricao-1",
  "momment": <epoch ms>,
  "chatName": "Ninho",
  "senderName": "Edvam",
  "text": {"message": "..."}
}
```
Sempre incluir o `chatLid` real do número de teste, e usar o nome REAL (não inventar um nome de
teste) nos campos `chatName`/`senderName` quando precisar preenchê-los.

Testado em 2 passos: (1) payload com `chatLid` real mas **sem** nenhum campo de nome (omitidos):
`contact_lid`/`lead_name` ficaram corretos, mas `lead_chat_name`/`lead_sender_name` (campos que
`PREPARAR LOG CONTATOS` grava direto, sem a mesma trava de `nomeValido`) foram nulados,
descoberta no próprio teste, corrigido manualmente (`UPDATE jsgrafica_contatos SET
lead_chat_name/lead_sender_name = valor real WHERE ... IS NULL`), e o template final passou a
recomendar preencher esses campos com o nome real também, não omitir. (2) Reteste com o template
final completo (`chatLid` real + `chatName`/`senderName` reais): `contact_lid`, `lead_name`,
`lead_chat_name`, `lead_sender_name` todos ficaram intactos, confirmado por SQL depois do teste.
Único efeito colateral esperado e aceito: os contadores de interação
(`total_mensagens_recebidas`/`total_interacoes`) sobem 1 a cada teste real disparado por esse
caminho, já é assim há meses nesse número de teste (274+ mensagens acumuladas desde julho),
não é novidade introduzida aqui, não fica pior.

### Checklist de limpeza pós-teste, atualizado

A partir de agora, todo teste que dispare mensagem sintética pro webhook real `jsgraficamsgrecebidas`
(não só o agente Fase B) confere, além das tabelas já checadas (sessão de teste, log de mensagem,
memória de conversa):
- **`jsgrafica_contatos`**: `SELECT phone, contact_lid, lead_name, lead_chat_name,
  lead_sender_name FROM jsgrafica_contatos WHERE phone = '<numero de teste>'` antes e depois do
  teste, conferindo que nada mudou de forma inesperada (nome, identificador). Diferente das
  outras tabelas, aqui não tem "linha de teste" pra apagar no fim: é a linha REAL do contato,
  então o cuidado tem que ser não escrever errado desde o início (usando o payload seguro acima),
  não só limpar depois.

### Dados de teste desta demanda
Log de mensagens (`teste283-*`) e sessão de teste apagados ao final. Contato conferido e
confirmado correto (`contact_lid: 52063694233823@lid`, `lead_name: Ninho`, `lead_chat_name:
Ninho`, `lead_sender_name: Edvam`).
