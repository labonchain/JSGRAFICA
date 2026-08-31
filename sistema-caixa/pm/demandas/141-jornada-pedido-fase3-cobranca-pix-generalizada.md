# 141 — Jornada do pedido (Fase 3/5): cobrança Pix real pra qualquer canal/momento + QR no balcão

Status: concluída — aguardando validação completa do PM/Edvam em produção (sandbox) antes da Fase 4
Criada em: 2026-07-09
Aprovada em: 2026-07-09
Concluída em: 2026-07-09
Chat executor: 03 - APP JS GRAFICA (Fable 5 — complexidade/risco maior que as Fases 1-2, mexe em
dinheiro real; mesma decisão de modelo já usada na demanda 124)

## Contexto — plano geral (Fases 1-2 concluídas e validadas)
Fase 1 (137/138) e Fase 2 (139/140): forma de pagamento, momento e tipo de entrega agora são
escolhas capturadas na criação do pedido, nos 2 canais — **só captura, nada disparava em cima
disso ainda**. Esta fase é a primeira que **usa** esse dado pra fazer algo de verdade.

Mapeamento confirmado (investigação do PM, 2026-07-09, código real):
- `criarCobrancaPix` (`lib/mercadopago.ts:165-219`) é **genérica** — recebe só
  `{ valor, externalReference, telefone }`, não depende de nada específico do Inbox.
- O que trava o uso hoje a um caso só é o **chamador** (`app/api/pedidos/route.ts`): o gate
  `precisaPix = pagamentoTipo === 'pre_producao'` (linha 92) só existe no branch do Inbox, e o
  vínculo pós-criação é hardcoded (`.eq('pagamento_tipo', 'pre_producao')`, linha 208) — não
  funcionaria pra pedido de balcão (que grava `pagamento_tipo: 'pos_producao'` sempre fixo).
- `confirmarPedidosPagosPorOrder` e `conferirCobrancasPixPendentes` (demanda 124) já são
  genéricas — casam só por `mp_order_id`, sem filtrar por origem/tipo. **Não precisam mudar.**
- Não existe hoje, em lugar nenhum do sistema, uma tela que mostra QR code/copia-e-cola pro
  cliente — só existe como texto dentro da mensagem de rascunho do Inbox.

## Objetivo desta demanda (Fase 3)
Qualquer pedido — balcão ou Inbox, na hora ou na retirada — onde a forma de pagamento escolhida
(campo da Fase 1, `forma_pagamento_escolhida`) for **Pix**, gera uma cobrança Pix real (mesma
função já usada e comprovada na 124), com confirmação automática funcionando igual. No balcão,
o cliente vê o QR code numa tela nova, no momento da venda.

## Escopo
- Incluído:
  1. **Generalizar o gatilho**: trocar `precisaPix = pagamentoTipo === 'pre_producao'` por uma
     condição baseada em `forma_pagamento_escolhida === 'pix'` (o campo da Fase 1) — nos 2
     branches de `POST /api/pedidos` (Inbox e balcão). Se `forma_pagamento_escolhida` não foi
     preenchido (é opcional hoje), manter o comportamento antigo como fallback (não regredir pro
     caso onde ninguém respondeu a pergunta nova ainda).
  2. **Generalizar o vínculo pós-criação**: trocar o filtro hardcoded (`.eq('pagamento_tipo',
     'pre_producao')`) por um filtro que usa o `id`/`venda_id` do pedido/venda sendo criado —
     funciona pra qualquer origem.
  3. **Tela de QR code no balcão** (`app/page.tsx` e `app/pdv/page.tsx`): ao confirmar uma venda
     com Pix (imediato), abrir uma tela/modal mostrando o QR code (`qrCodeBase64`, já retornado
     por `criarCobrancaPix`) + o copia-e-cola em texto, com indicação clara de "aguardando
     pagamento" — e atualizar sozinha (poll ou realtime, reaproveitando `conferirCobrancasPixPendentes`)
     quando o pagamento cair, sem precisar o operador clicar em nada.
  4. **Inbox com Pix na retirada**: pedido `pos_producao`/`flexivel` com Pix escolhido também
     passa a gerar cobrança real (mesmo texto de mensagem que já existe pra `pre_producao` hoje,
     reaproveitado).
  5. Não mexer em `confirmarPedidosPagosPorOrder`/`conferirCobrancasPixPendentes` — já funcionam.
- Fora de escopo: Cartão/Stone (fica manual, sem integração, como já decidido). Qualquer trava de
  produção (Fase 4). Qualquer mudança na esteira de status (Fase 5).

## Critérios de aceite
- [x] Pedido de balcão com Pix escolhido gera cobrança real e mostra QR code numa tela nova
- [x] QR code atualiza sozinho quando o pagamento é detectado (sem refresh manual) — o flip do
      poll foi provado com order genuinamente PAGA no backend (endpoint de status confirmando o
      pedido); pagamento de Pix em si não é simulável em sandbox (limitação já documentada na
      124/base de conhecimento seção 10)
- [x] Pedido do Inbox com Pix na retirada (produto `pos_producao`/`flexivel`) também gera cobrança
      real, mensagem com copia-e-cola igual ao caso `pre_producao` já existente
- [x] Caso `pre_producao` original (124) continua funcionando idêntico — regressão testada
      explicitamente, é o caminho mais crítico e mais testado do sistema até aqui
- [x] Pedido sem `forma_pagamento_escolhida` preenchida (campo ainda opcional) mantém o
      comportamento antigo (não quebra nem gera cobrança indevida)
- [x] Cartão continua 100% manual, sem nenhuma tentativa de integração

## Riscos e cuidados
**Mexe em geração de cobrança real de dinheiro — testar exaustivamente em sandbox antes de
qualquer coisa.** Não gerar nenhuma cobrança fora de teste sem confirmar com o PM antes. Esta é a
fase mais arriscada das 5 — não seguir pra Fase 4 sem validação completa em produção (sandbox)
primeiro.

## Referências
Demanda 124 (implementação original de `criarCobrancaPix`, confirmação automática — reaproveitar,
não duplicar). Demandas 137-140 (Fases 1-2, campos que esta fase passa a usar). Esta conversa
(2026-07-09) — mapeamento do código atual.

## Relato de execução

### Decisões de desenho (registradas antes de codar)
1. **Gatilho** (`POST /api/pedidos`, branch Inbox): `forma_pagamento_escolhida === 'pix'` →
   cobrança cobre o **TOTAL da venda** (qualquer produto, qualquer momento — inclui Pix na
   retirada); `null` (pergunta não respondida) → **fallback exato da 124** (só itens
   `pre_producao`, mesmo valor de antes); `'dinheiro'`/`'cartao'` explícito → **nenhuma**
   cobrança (pagamento combinado por outra via — cobrar Pix seria errado; cartão segue 100%
   manual, critério 6).
2. **Vínculo generalizado**: o `mp_order_id` é gravado nos pedidos que a cobrança **cobre de
   verdade** — todos os itens quando Pix foi escolhido; só os `pre_producao` no fallback legado
   (cobrança parcial: marcar os outros itens confirmaria pagamento que a cobrança não cobre).
   O hardcode `.eq('pagamento_tipo','pre_producao')` da 124 só sobrevive nesse caso parcial.
3. **Balcão via endpoint dedicado** (`app/api/mercadopago/cobranca`): o Inbox cria a cobrança
   dentro do POST de pedidos (precisa do copia-e-cola pro rascunho no mesmo ciclo); o balcão
   precisa do **QR de volta na UI** — POST novo que valida server-side (só venda com Pix
   escolhido e não paga), soma o valor real dos itens no servidor, cria via `criarCobrancaPix`
   (inalterada) e vincula. **Idempotente em 2 camadas**: `X-Idempotency-Key` do MP + reaproveita
   cobrança viva já vinculada (chamar 2x devolve a mesma, não duplica).
4. **Poll de status** (`GET /api/mercadopago/cobranca?orderId=`): a tela de QR não podia usar
   `conferirCobrancasPixPendentes` (trava anti-spam de 60s do fallback da 124, lenta pra
   "aguardando pagamento") — o GET re-busca a order na API do MP (autoritativo) e chama a MESMA
   `confirmarPedidosPagosPorOrder` de sempre: o poll também confirma, não só olha.
5. **⚠️ Mudança de comportamento deliberada no balcão** (inerente ao item 3 do escopo): venda
   com **Pix imediato** deixa de nascer `pagamento_confirmado: true` — nasce `false` e é
   confirmada pelo pagamento DE VERDADE (poll/webhook/fallback). Antes o operador marcava Pix e
   o sistema assumia pago; agora "aguardando pagamento" é real. Dinheiro/Cartão continuam
   confirmados na hora; "Paga na retirada" continua pendente. **Balcão retirada+Pix não gera
   cobrança agora** (não há canal pra entregar o QR depois; fica pras Fases 4/5).
6. `criarCobrancaPix`/`confirmarPedidosPagosPorOrder`/`conferirCobrancasPixPendentes`:
   **zero mudança**, como exigido.
7. **Mensagens** (`lib/pedidos.ts`): o trecho Pix deixou de ser derivado do `pagamento_tipo` —
   o chamador passa `{ copiaECola, valor }` explícito (cobre escolha nova E fallback legado;
   `copiaECola: null` = texto da chave estática da 062, mesmo comportamento de falha de sempre).

### O que foi feito
- `lib/pedidos.ts`: funções de mensagem recebem `CobrancaPixMensagem` explícita (novo tipo).
- `app/api/pedidos/route.ts` (branch Inbox): gatilho + vínculo generalizados (decisões 1-2).
- `app/api/mercadopago/cobranca/route.ts` (novo): POST cria cobrança pro balcão, GET checa
  status/confirma (decisões 3-4).
- `app/page.tsx` + `app/pdv/page.tsx` (os 2 balcões): tela de QR nova (modal com QR
  `qrCodeBase64`, copia-e-cola com botão copiar, "⏳ Aguardando pagamento..." com poll de 5s,
  estado "✅ Pagamento confirmado!" automático, estado de erro gracioso que NUNCA desfaz a venda,
  botão fechar que não perde nada — webhook/fallback continuam por trás) + `pagamento_confirmado`
  derivado (decisão 5).

### Testes (tudo sandbox — nenhuma cobrança fora de teste; sintéticos apagados, orders pendentes canceladas)
- **T1 🔴 REGRESSÃO 124 (o mais crítico)**: Inbox `pre_producao` SEM escolha → cobrança criada
  pro valor pre_producao, QR gravado, 2 rascunhos com o mesmo texto de sempre. Idêntico.
- **T2**: Inbox `flexivel` (RIFA 2x) + Pix escolhido na retirada → cobrança real do total,
  vínculo, mensagem com copia-e-cola — o caso novo do item 4 funcionando.
- **T3**: Inbox `pre_producao` + dinheiro explícito → NENHUMA cobrança, mensagem sem seção Pix.
- **T4**: venda balcão 2 itens Pix → endpoint criou cobrança do total exato (R$3), vinculou os 2
  itens; GET status `pago:false`; repetir o POST devolveu a MESMA cobrança (`reaproveitada`);
  venda em dinheiro rejeitada com 400.
- **T5**: flip do poll com order genuinamente PAGA (cartão APRO, mesma técnica da 124 — Pix não
  é pagável em sandbox): GET → `pago:true, pedidosConfirmados:1`.
- **T6 (UI real, Playwright)**: venda Pix no balcão → modal de QR abriu com imagem real,
  copia-e-cola, "Aguardando pagamento..." e fechar sem perder nada — screenshot conferido.
- `npx tsc --noEmit` e `npm run build` limpos.

### Status final
Concluída e em produção (`dpl_3b5grgJSNMmDLZYyobBPuusQpruN`). Credencial de produção do MP
continua intocada (id=3, inativa). **Parado aqui — Fase 4 só com validação completa desta em
produção e confirmação explícita do PM.** Nota pra validação ao vivo: o 1º Pix pago de verdade
de ponta a ponta continua dependendo da virada pra produção do MP (mesma pendência da 124).
