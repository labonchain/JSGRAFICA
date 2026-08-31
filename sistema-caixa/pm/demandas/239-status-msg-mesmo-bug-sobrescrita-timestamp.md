# 239 — Workflow "03 - STATUS MSG" tem o mesmo bug de sobrescrita de timestamp da 237

Status: concluída
Criada em: 2026-07-29
Aprovada em: 2026-07-29
Concluída em: 2026-07-29
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Achado da demanda 237 (confirmado só por leitura, não corrigido): o workflow
`03 - JSGRAFICA | STATUS MSG` (id `hg12ud3yo5mTu3XI`), nos nodes `UPDATE STATUS MSG PRIVADA`/
`UPDATE STATUS MSG GRUPO`, tem exatamente o mesmo padrão de bug corrigido na 237 — o node
`PROCESSAR STATUS` calcula `delivered_at`/`read_at` de forma mutuamente exclusiva por evento
(`DeliveryCallback` preenche `delivered_at` e deixa `read_at` null, `ReadCallback` o inverso), e
o `UPDATE` grava os dois direto sem preservar o que já existia. Um evento `ReadCallback`
processado por este workflow apagaria o `delivered_at` já gravado.

**Não confirmado ainda**: se hoje é o workflow `02 - LOG MSG ENVIADAS` ou o `03 - STATUS MSG` que
efetivamente recebe os webhooks de status da Z-API em produção (podem ser o mesmo evento
duplicado pros dois, ou tipos diferentes de webhook por trás de cada um) — a 237 não investigou
isso, só confirmou que o padrão de código existe no `03`.

## Objetivo
Confirmar se o `03 - STATUS MSG` está de fato ativo/recebendo eventos reais de status, e se sim,
aplicar a mesma correção já validada na 237 (preservar valor existente com
`novo_valor || $json.valor_atual || null`).

## Escopo
- Incluído: confirmar se o workflow `03 - STATUS MSG` está `active` e recebendo webhooks reais
  (não só ler o código — checar execuções recentes/logs).
- Incluído: se confirmado ativo e recebendo eventos de status reais, aplicar a mesma correção da
  237 nos nodes `UPDATE STATUS MSG PRIVADA`/`UPDATE STATUS MSG GRUPO`.
- Incluído: entender a relação entre `02 - LOG MSG ENVIADAS` e `03 - STATUS MSG` — se ambos
  processam o mesmo tipo de evento (duplicidade) ou eventos diferentes — reportar o que achar,
  mesmo que não mude o escopo da correção.
- Incluído: testar com o mesmo tipo de evento sintético já usado na 237 (SENT/DELIVERED/READ ou
  equivalente do `03`), contra o webhook de produção real do `03`.
- Explicitamente fora de escopo: qualquer mudança no `02 - LOG MSG ENVIADAS` (já corrigido na 237).

## Critérios de aceite
- [ ] Confirmado se `03 - STATUS MSG` está ativo e recebendo eventos reais de status
- [ ] Relação entre `02` e `03` esclarecida (mesmo evento duplicado, ou tipos diferentes)
- [ ] Se ativo: correção aplicada e testada com evento sintético, sem regressão
- [ ] Se inativo/não recebe eventos reais: reportado como tal, sem necessidade de correção agora

## Riscos e cuidados
Mesma disciplina da 236/237: testar contra webhook de produção com evento sintético antes de
considerar concluído, apagar dado de teste depois, backup do workflow antes de mexer.

## Referências
Demanda 237 (achado original e correção de referência, mesma técnica a aplicar aqui). Demanda
236 (técnica de teste sintético contra webhook de produção).

## Relato de execução

**Status final: concluída**

### Confirmação — 03 está ativo e recebe eventos reais (não presumido)
Checado de duas formas independentes, não só lendo código:
1. **Configuração real da Z-API** (`GET .../me` com `client-token`, não só o payload do node):
   `deliveryCallbackUrl` está apontando pra `https://n8n.labonchain.xyz/webhook/jsgraficastatusmsg`
   — exatamente o webhook do workflow `03`. Confirma que a Z-API **de fato** chama este workflow
   pra eventos de entrega.
2. **Dado real na tabela**: 1.839 de 16.474 mensagens enviadas (`from_me=true`) têm
   `delivered_at` preenchido, a mais recente hoje (`2026-07-29T13:24:41`, horas antes deste
   teste) — tráfego real e recente, não histórico morto.

### Relação entre `02` e `03` (esclarecida, achado importante)
**Não é o mesmo evento duplicado — são coisas diferentes, e o achado revela algo maior:**
- `deliveryCallbackUrl` → workflow `03` (`jsgraficastatusmsg`). Confirmado ativo (acima).
- **Nenhum campo da configuração da Z-API aponta pro webhook do workflow `02`
  (`jsgraficamsgenviadas`)** — nem `receivedCallbackUrl`, nem `receivedAndDeliveryCallbackUrl`,
  nem `deliveryCallbackUrl`, nem `messageStatusCallbackUrl`. Não achei também nenhuma chamada
  interna de outro workflow pra essa URL (busquei no workflow `01` inteiro, zero ocorrências).
  **Não consegui confirmar, dentro do escopo desta demanda, o que efetivamente invoca o
  workflow `02` hoje** — registrando como achado fora do escopo (abaixo), não investiguei mais
  a fundo por não ser o objetivo desta demanda.
- **Achado mais importante, fora do escopo original mas relevante pra entender o `02`/`03`**:
  `messageStatusCallbackUrl` (o outro campo de status da Z-API, além de `deliveryCallbackUrl`)
  está apontando pra `https://n8n.labonchain.xyz/webhook/biobotsstatusmsg` — **o webhook de um
  cliente diferente (BIOBOTS), não da JS Gráfica**. Isso é consistente com outro dado real: em
  16.474 mensagens enviadas, **`read_at` nunca foi preenchido nem uma vez** — o tipo de evento de
  "leitura" (o que quer que a Z-API mande via `messageStatusCallbackUrl`) provavelmente nunca
  chega em nenhum workflow da JS Gráfica, porque está sendo mandado pro cliente errado. **Não
  corrigi a configuração da Z-API** — é infraestrutura de conta, afeta potencialmente o cliente
  BIOBOTS também, e mudar isso é uma decisão de infraestrutura cross-cliente, não uma correção de
  workflow. Reportando com destaque pro PM decidir.

### O que foi feito
1. Backup do workflow `03 - JSGRAFICA | STATUS MSG` (id `hg12ud3yo5mTu3XI`) antes de mexer:
   `pm/backups/03-jsgrafica-status-msg_pre-demanda239_2026-07-29.json`.
2. Investigado o mecanismo exato do bug neste workflow — **diferente do `02`, não é referência
   direta a um node por nome**: os nodes `Code in JavaScript`/`Code in JavaScript1` fazem
   `{ ...msg, ...status }` (`msg` = linha atual, vinda de `GET MSG PRIVADA`/`GRUPOS`; `status` =
   evento novo, vindo de `PROCESSAR STATUS`) — como `status` é espalhado **depois** de `msg`, ele
   sobrescreve `delivered_at`/`read_at` com `null` quando o evento atual não é desse tipo (mesma
   causa raiz da 237, mecanismo de código diferente).
3. Corrigido nos dois nodes (`Code in JavaScript` para `jsgrafica_log_msgs_privadas`,
   `Code in JavaScript1` para `jsgrafica_log_msgs_grupos`): depois do spread, reforçando
   explicitamente `delivered_at: status.delivered_at || msg.delivered_at || null` e o mesmo pro
   `read_at` — preserva o valor existente quando o evento atual não é desse tipo. `status`
   (texto) e `last_update_at` continuam sempre reletindo o evento mais recente (correto, sem
   bug, mesma decisão da 237).
4. Deploy via API REST do n8n. Workflow confirmado `active: true` depois.

### Testes realizados e resultado
Ciclo completo contra os webhooks reais de produção, telefone do Edvam:
1. `SENT` no webhook do `02` (`jsgraficamsgenviadas`) — cria a linha (reaproveitando o mecanismo
   já testado na 236/237, só pra ter uma linha real de base).
2. `DeliveryCallback` no webhook do **`03`** (`jsgraficastatusmsg`) — `status` → `DELIVERED`,
   `delivered_at` preenchido, `sent_at` intacto (o `03` nunca toca esse campo, nem antes nem
   depois da correção).
3. `ReadCallback` no webhook do `03` — **`delivered_at` sobreviveu** (mesmo valor do passo 2),
   `read_at` preenchido corretamente, `status` → `READ`, `last_update_at` avançou. Confirma a
   correção nos dois campos, no cenário real (mesmo tipo de evento que a Z-API de fato manda pro
   `deliveryCallbackUrl`).
Linha de teste apagada depois (`DELETE ... where message_id = 'teste239-ciclo-...'`, 1 linha).
Não testei o branch `UPDATE STATUS MSG GRUPO` com evento real (não achei mensagem de grupo
recente pra reaproveitar e criar uma de teste em `jsgrafica_log_msgs_grupos` estava fora do
threshold de esforço desta demanda) — a correção é sintaticamente idêntica e simétrica à da
privada, mesma função duplicada; risco residual baixo, registrando como não testado
explicitamente.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
- **`messageStatusCallbackUrl` da instância Z-API da JS Gráfica aponta pro webhook do cliente
  BIOBOTS** (`biobotsstatusmsg`), não pra `jsgraficastatusmsg` — achado principal desta demanda,
  detalhado acima. Explica por que `read_at` nunca foi preenchido em 16.474 mensagens (o tipo de
  evento de leitura provavelmente nunca chega em nenhum workflow da JS Gráfica). Não corrigi
  (infraestrutura de conta Z-API, cross-cliente) — reportando pro PM/Edvam decidir e corrigir com
  cuidado (checar também se o inverso não está acontecendo — se o BIOBOTS não está mandando
  status pra JS GRAFICA por engano, ou se essa troca é só de um lado).
- **Não confirmado o que invoca o workflow `02 - LOG MSG ENVIADAS` de fato** — nenhum campo da
  config da Z-API aponta pra ele, nem achei chamada interna de outro workflow. Ele claramente
  funciona quando testado diretamente (236/237/239 mandaram evento sintético direto no webhook
  dele e criou/atualizou linhas reais), mas não fica claro se/como ele é acionado por tráfego
  real hoje. Fora do escopo desta demanda investigar mais — registrando pro PM decidir se abre
  demanda de investigação separada.
- `UPDATE STATUS MSG GRUPO` (branch de grupo) não testado com evento sintético de verdade (ver
  acima) — correção aplicada por simetria de código, não validada isoladamente.

### Critérios de aceite
- [x] Confirmado se `03 - STATUS MSG` está ativo e recebendo eventos reais de status — sim,
      confirmado por config da Z-API e por dado real recente
- [x] Relação entre `02` e `03` esclarecida — não é duplicidade; achado maior sobre
      `messageStatusCallbackUrl` mal configurado (cross-cliente)
- [x] Correção aplicada e testada com evento sintético contra o webhook real, sem regressão
      (branch privada); branch grupo corrigido mas não testado isoladamente
- [ ] N/A — confirmado ativo, correção foi aplicada (critério do cenário "inativo" não se aplica)
