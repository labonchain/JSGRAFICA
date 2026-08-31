# 349 - PROCESSAR STATUS nunca bate o tipo real de callback (status/delivered_at/read_at nunca gravados)

Status: aprovada
Criada em: 2026-08-28
Aprovada em: 2026-08-29
Concluída em: (vazio até conclusão)
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
(preenchido pelo 01-N8N ao concluir)
