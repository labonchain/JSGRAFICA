# 070 — Mensagem enviada pelo app aparece duplicada no Inbox (ID errado da resposta Z-API)

Status: aprovada
Criada em: 2026-07-05
Aprovada em: 2026-07-05
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Durante a rodada de testes reais (Edvam mandando mensagem do celular pessoal), a confirmação
automática de pedido (demanda 062) apareceu **2 vezes** no Inbox (print do Edvam), mesmo tendo
chegado só 1 vez de verdade no WhatsApp. Confirmado pelo PM com teste direto na API do Z-API:

- O Z-API devolve, na resposta de `/send-text`, **dois IDs diferentes**: `zaapId` (ID interno de
  rastreio do Z-API) e `messageId`/`id` (o ID real da mensagem no protocolo do WhatsApp). Testado
  agora: `zaapId: "019F349A6A997CEEA03A2E7708796CCC"` vs `messageId: "3EB08F7BEB99604FFB19A6"` —
  totalmente diferentes.
- O webhook do n8n que loga automaticamente todo envio Z-API (mencionado desde a demanda 037)
  usa o **`messageId`** real como `message_id` no log — confirmado pelo PM (mesmo teste, o log via
  webhook gravou exatamente `3EB08F7BEB99604FFB19A6`).
- O código do app, em 4 lugares, pega o ID errado primeiro:
  `resultado?.zaapId || resultado?.messageId || resultado?.id || `sent-${Date.now()}``
  — como `zaapId` sempre existe na resposta, o app grava o log imediato (pra feedback rápido na
  tela) com um ID que **nunca vai bater** com o ID que o n8n grava depois pelo webhook. Resultado:
  2 linhas pra mesma mensagem, sempre, em todo envio feito pelo app (resposta manual, mídia, as
  duas mensagens automáticas de pedido).

## Objetivo
Mensagem enviada pelo app aparece 1 vez só no Inbox, não duplicada.

## Escopo
- Incluído: nos 4 lugares abaixo, inverter a ordem de prioridade pra usar o ID real da mensagem
  (`messageId`/`id`) em vez do `zaapId`:
  - `app/api/inbox/responder/route.ts:15`
  - `app/api/inbox/enviar-midia/route.ts:42`
  - `app/api/pedidos/route.ts:133`
  - `app/api/pedidos/route.ts:233`
  Troca sugerida: `resultado?.messageId || resultado?.id || resultado?.zaapId || `sent-${Date.now()}``.
- Fora de escopo: mudar a arquitetura de logging em si (continua sendo insert imediato pelo app +
  webhook do n8n depois — isso é intencional, dá feedback rápido na tela). Só corrigir o ID usado,
  pra bater com o que o webhook grava.

## Critérios de aceite
- [ ] Mandar uma mensagem de teste real (resposta manual ou pedido automático) e confirmar que
      aparece **1 vez só** no Inbox depois que o webhook do n8n processar
- [ ] Testado com pelo menos 2 tipos de envio diferentes (ex.: resposta manual + confirmação de
      pedido)

## Riscos e cuidados
Confirmar que existe de fato uma lógica de dedupe por `message_id` que vai passar a funcionar com
o ID corrigido (ou se o Inbox só exibe por ordem/timestamp sem dedupe — nesse caso, avisar o PM,
pode precisar de um passo a mais além de só trocar o ID).

## Referências
`lib/zapi.ts` (`enviarMensagem`, resposta do Z-API). `lib/inboxLog.ts`
(`registrarMensagemEnviada`). Os 4 arquivos citados no escopo. Demanda 062 (onde o problema foi
notado, print real do Edvam).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  Invertida a ordem de prioridade do ID nos 4 lugares exatos apontados pela demanda —
  `resultado?.messageId || resultado?.id || resultado?.zaapId || \`sent-${Date.now()}\`` em vez de
  `zaapId` primeiro:
  - `app/api/inbox/responder/route.ts`
  - `app/api/inbox/enviar-midia/route.ts`
  - `app/api/pedidos/route.ts` (as 2 ocorrências — confirmação automática de pedido e aviso de
    avanço de status).
- Testes realizados e resultado:
  **Sobre o "Riscos e cuidados" (dedupe por message_id):** antes de testar, conferi o schema de
  `jsgrafica_log_msgs_privadas` — `message_id` já é a **chave primária** da tabela (índice único).
  Isso significa que não precisa de nenhuma lógica de dedupe adicional: uma vez que o app grava o
  ID real da mensagem, a tentativa do webhook do n8n de gravar a mesma mensagem com o mesmo
  `message_id` não pode virar uma 2ª linha — o teste confirmou que ela vira um **update** na mesma
  linha (status passa de `sent`/`DELIVERED` já existente, sem duplicar). Não foi preciso avisar o
  PM — o risco citado já está coberto pela constraint que já existia.
  Testado com Z-API real (contato de teste "Edvan Filho", `5521965185667`), 2 tipos de envio:
  1. Resposta manual (`/api/inbox/responder`): 1 linha gravada com `message_id` = ID real
     (`3EB05DAE76B898884297FF`), status virou `DELIVERED` na mesma linha depois do webhook
     processar — confirmado por SQL direto, nenhuma 2ª linha apareceu.
  2. Confirmação automática de pedido (`POST /api/pedidos` com `produtoId`, produto sem Pix):
     mesmo resultado — 1 linha só, status atualizado pelo webhook na mesma linha.
  `npx tsc --noEmit` e `npm run build` rodaram limpos antes do deploy. Deploy em produção:
  `npx vercel --prod --yes` → `dpl_FVYB23ozkFyQw2T5YVYC9YjYLM8r`. Reconfirmado em produção com
  mais 1 envio real via `curl` direto em `pdv.jsgrafica.site/api/inbox/responder` — mesmo
  resultado (1 linha, status atualizado, sem duplicata). Todos os registros de teste (pedido e
  mensagens) apagados do Supabase depois de cada rodada.
- Achados fora do escopo: nenhum.
- Status final: concluída.
