# 349 - PROCESSAR STATUS nunca bate o tipo real de callback (status/delivered_at/read_at nunca gravados)

Status: concluída
Criada em: 2026-08-28
Aprovada em: 2026-08-29
Concluída em: 2026-08-31
Chat executor: 01 - N8N JS GRAFICA

Achado durante a demanda 344, fora do escopo dela, reportado sem correção: o código de
`PROCESSAR STATUS` (workflow `03 - JSGRAFICA | STATUS MSG`) só define `status`/`delivered_at`/
`read_at` quando `raw.type` é `'DeliveryCallback'` ou `'ReadCallback'`. Todo payload real de
callback de status observado (broadcast ou conversa 1:1) chega com `type: "MessageStatusCallback"`
(o evento real fica em `raw.status`: `SENT`/`RECEIVED`/`READ`/`READ_BY_ME`). Essa condição nunca
bate pra nenhum payload real — confirmado em 2 casos reais durante a 344, plausivelmente geral,
não é regressão de hoje.

## Objetivo
Confirmar a extensão real do problema (desde quando isso não funciona, quantas mensagens
afetadas) e corrigir `PROCESSAR STATUS` pra checar o campo/valor real que a Z-API manda
(`raw.type === 'MessageStatusCallback'`, mapear `raw.status` pros valores certos), sem quebrar o
ramo `status@broadcast` recém-criado na 344 (esse já não passa mais por aqui).

## Escopo
- Incluído: `PROCESSAR STATUS` e o ramo de conversa 1:1 do workflow `03 - STATUS MSG`.
- Explicitamente fora de escopo: o ramo `status@broadcast` (344, já corrigido separado);
  qualquer telas que exibam status de mensagem (avaliar depois de confirmar o volume real
  afetado).

## Riscos e cuidados
Antes de corrigir, medir a extensão real (quantas mensagens/quanto tempo isso está quebrado) pra
saber se vale a pena voltar e recalcular histórico ou só corrigir daqui pra frente. Backup do
workflow antes de qualquer mudança.

## Referências
Demanda 344 (achado original), workflow `03 - JSGRAFICA | STATUS MSG`.

## Relato de execução

**Extensão real do problema, medida antes de corrigir (via SQL direto no Supabase, tabela
`jsgrafica_log_msgs_privadas`):**
- `read_at`: nunca foi gravado em NENHUMA das 28.904 mensagens enviadas pela gráfica desde
  fevereiro/2026 até hoje (30/08/2026) - 100% quebrado, sempre foi assim, não é degradação
  recente.
- `delivered_at`: funciona parcialmente - 1.870 mensagens (6,5% do total) têm o campo certo,
  a mais recente de 27/08 (bate com o `type: 'DeliveryCallback'` literal que o código já tratava).
  Não é "nunca funciona", é raro porque o volume real de execuções do workflow é dominado por
  visualização de Status (95%+ das execuções, achado já registrado na demanda 340).
- Causa raiz confirmada com evidência direta: o próprio workflow guarda, como `pinData`, um
  exemplo real de evento de leitura de conversa 1:1 chegando como `type: "MessageStatusCallback"`
  com `status: "READ"` - formato que o código antigo nunca tratava (só reconhecia os tipos
  literais `DeliveryCallback`/`ReadCallback`).
- Não dá pra recalcular o histórico: o payload bruto de cada evento nunca foi persistido em lugar
  nenhum, só o resultado (nulo). Correção é só daqui pra frente.

**Correção aplicada** (workflow `03 - JSGRAFICA | STATUS MSG`, `hg12ud3yo5mTu3XI`, node
`PROCESSAR STATUS`): adicionado tratamento pra `raw.type === 'MessageStatusCallback'`, mapeando
`raw.status` (`READ`/`READ_BY_ME` → `status=READ`+`read_at`; `SENT`/`RECEIVED` → só `status`, sem
tocar em `delivered_at`/`read_at`). Os 2 `if` originais (`DeliveryCallback`/`ReadCallback`
literais) foram mantidos intactos, sem remover nada - o ramo `status@broadcast` (fixado na
demanda 344) nunca chega nesse node, então não corre risco de ser afetado.

**Backup**: `pm/backups/03-jsgrafica-status-msg_pre-demanda349_2026-08-29.json`, feito antes de
qualquer mudança, workflow completo (`versionId` original `c9a2cdf8-bb5e-40e5-9f1d-fbf7cc8fb785`).

**Deploy**: autorizado explicitamente pelo Edvam ("sim vamos com a 349, com todo cuidado") em
30/08/2026, aplicado via API REST do n8n (`PUT /workflows/{id}`), confirmado a mudança de
`versionId` (`c9a2cdf8...` → `d3586e97-f05f-415b-9556-eb87e157d8d9`) e reconferido de forma
independente logo depois (busca nova do workflow direto do n8n, não só o retorno do PUT) - código
novo confirmado presente e ativo.

**Teste de ponta a ponta, feito contra o webhook real de produção (não teste local/isolado):**
- Escolhida uma mensagem 1:1 real recente (`A5A3D9206BC282A9F2664549E4B7F62A`, telefone real
  `167117227819023@lid`, sem status ainda) pra não interferir em nada que já estava correto.
  Enviado evento sintético `MessageStatusCallback`+`status:READ` pro webhook de produção
  (`https://n8n.labonchain.xyz/webhook/jsgraficastatusmsg`). Resultado: `200`, execução real
  conferida (`1713660`) - `PROCESSAR STATUS` produziu `status:READ`,
  `read_at:"2026-08-31T16:03:20.000-03:00"` corretamente, e o Supabase confirma o valor gravado
  na tabela de verdade (não só no log de execução).
- Teste de regressão do ramo `status@broadcast` (pra garantir que a correção não quebrou o que já
  funcionava): evento sintético com `phone:"status@broadcast"` e um `ids` marcado como teste
  (`TESTE_REGRESSAO_349`) pro mesmo webhook. Execução real conferida (`1713673`) - só rodou
  `Webhook STATUS MSG` → `É Visualização de Status?` → `Gravar Visualização Status`, nunca chegou
  em `PROCESSAR STATUS`, exatamente como antes da correção. Linha de teste apagada de
  `jsgrafica_status_visualizacoes` depois de confirmado (disciplina de limpeza, sem deixar dado
  fake pra trás).

**Status final: concluída.** Deploy em produção confirmado, teste real de ponta a ponta
confirmado (via execução de n8n + valor real no Supabase), sem regressão no ramo de Status.
Único ponto que fica registrado como limitação permanente (não é pendência, é fato): o histórico
de ~7 meses de mensagens sem `read_at` não é recuperável, porque o payload bruto de cada evento
antigo nunca foi persistido.
