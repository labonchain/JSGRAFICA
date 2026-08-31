# 124 — Mercado Pago: cobrança Pix por pedido, com confirmação automática (Parte B)

Status: concluída (2 pendências pontuais que dependem do Edvam, nenhuma de código — ver relato)
Criada em: 2026-07-08
Aprovada em: 2026-07-08
Concluída em: 2026-07-08
Chat executor: 03 - APP JS GRAFICA (Fable 5)

## Contexto
Continuação da 084. Hoje, pedido que exige Pix antecipado (`pagamento_tipo: 'pre_producao'`,
demanda 062) mostra a chave Pix da gráfica **em texto**, e a confirmação de que o cliente pagou é
**manual** (o operador vê o comprovante ou confia na palavra do cliente). Edvam quer: o sistema
gerar uma cobrança Pix de verdade, específica daquele pedido, e confirmar sozinho quando o
pagamento acontecer — sem ninguém precisar clicar em nada.

**Limite técnico confirmado na pesquisa (`pm/conhecimento/mercado-pago-integracao.md`, seção 7)**:
isso só funciona pra pagamento **gerado pelo próprio sistema** (usando `external_reference` =
id do pedido, pra saber exatamente qual pedido foi pago). Pagamento que o cliente manda direto
pra uma chave Pix fora desse fluxo não tem como ser identificado automaticamente — continua
caindo no fluxo manual (demanda 113).

**🔴 Achado crítico da demanda 084 (2026-07-08), ler antes de começar** —
`pm/conhecimento/mercado-pago-integracao.md`, seção 9: a validação de assinatura do webhook
**não funciona pro tópico "order"** — que é justamente o tipo de evento que cobrança via API de
Orders (usada aqui) dispara. Validou certo pro tópico "payment", não pro "order" (inconsistência
do lado do Mercado Pago, não nosso bug). **Não confiar cegamente na confirmação automática via
webhook** sem testar de novo com um evento `order` real primeiro — se continuar falhando, usar a
busca de pagamentos síncrona (já construída na 084) como conferência (ex. checar a cada X minutos
se o pedido com aquele `external_reference` já foi pago) em vez de depender só do webhook pra
esse tópico específico. Reportar ao PM se esse comportamento mudou desde a 084.

## Objetivo
Pedido que exige Pix antecipado passa a gerar um QR code/código Pix real, específico daquele
pedido. Quando o cliente paga, o sistema confirma sozinho — Zu/Gabi/Edvam veem "✓ Pago via Pix —
confirmado automaticamente" no card do pedido, sem precisar escolher forma de pagamento na mão.

## Escopo
- Incluído:
  1. **Confirmar antes de tudo**: a conta Mercado Pago da gráfica tem uma chave Pix **aleatória**
     cadastrada (não uma chave "com portabilidade" de outro banco) — requisito encontrado na
     pesquisa pra cobrança via API funcionar sem divergência. Verificar no painel da conta antes
     de implementar; se não tiver, avisar o Edvam pra criar uma.
  2. Endpoint novo que cria a cobrança Pix via API do Mercado Pago (`POST /v1/payments`,
     `payment_method_id: pix`), passando `external_reference` = id do pedido, valor exato do
     pedido.
  3. Trocar o fluxo atual de "mostrar chave Pix em texto" (demanda 062) pelo QR code/código
     copia-e-cola gerado dinamicamente por essa cobrança nova — mostrado na mesma mensagem/lugar
     onde a chave em texto aparecia hoje.
  4. Webhook (construído na 084) recebe o aviso de pagamento aprovado → busca o pagamento na API
     → lê `external_reference` → acha o pedido correspondente → marca como pago automaticamente,
     reaproveitando a mesma lógica de confirmação que a demanda 113 já usa pro fluxo manual (não
     duplicar — o resultado final (`pagamento_confirmado: true`, `forma_pagamento`) precisa ser o
     mesmo, só a origem da confirmação muda de manual pra automática).
  5. Card do pedido (Inbox/Pedidos, já construído na 113) ganha uma variação visual quando o
     pagamento veio confirmado automaticamente via Mercado Pago (ex. "✓ Pago via Pix — confirmado
     automaticamente" em vez do texto genérico de pagamento manual).
- Fora de escopo: pagamento via cartão (só Pix, por enquanto). Tentar identificar/casar
  automaticamente pagamentos que não passaram por essa cobrança gerada pelo sistema (fora do
  alcance técnico, ver limite acima).

## Critérios de aceite
- [ ] Confirmado (ou criado) que a conta MP tem chave Pix aleatória cadastrada — **pendência do
      Edvam** (só o painel da conta mostra isso; em sandbox a cobrança funciona sem, então não
      bloqueou nenhum teste — precisa conferir antes da virada pra produção, ver relato)
- [x] Pedido `pre_producao` gera cobrança Pix real, com QR code/código, específica daquele pedido
- [x] Pagamento de teste confirma o pedido automaticamente, sem clique — validado com order
      genuinamente paga (cartão APRO; **não existe forma de simular o pagamento de um Pix em
      sandbox por API**, ver relato — o caminho de confirmação é idêntico pros dois métodos)
- [x] Card do pedido mostra visualmente que foi confirmado via Mercado Pago
- [x] Pagamento fora desse fluxo (chave Pix solta, dinheiro, cartão) continua funcionando manual,
      sem regressão (113)

## Riscos e cuidados
Mexe em dinheiro real (cobrança de verdade) — testar exaustivamente com usuário de teste do MP
antes de qualquer coisa em produção. Confirmar com o Edvam antes de gerar a primeira cobrança
real fora de teste.

## Referências
`pm/conhecimento/mercado-pago-integracao.md` (seção 7). Demanda 084 (Parte A, credencial/webhook
base). Demanda 062 (fluxo atual de Pix em texto). Demanda 113 (confirmação de pagamento no
pedido, lógica a reaproveitar).

## Relato de execução

### Decisão central de arquitetura (por causa do achado da seção 9, re-testado nesta demanda)

**Re-teste feito como a demanda exigia**: um evento `order.processed` genuíno (order real paga,
entregue pelo próprio Mercado Pago ao endpoint em produção) **continua com assinatura inválida**
(`assinatura_valida: false`) — comportamento idêntico ao da 084, nada mudou. Reportado aqui e
registrado na base de conhecimento (seção 9 atualizada).

Por isso o desenho NÃO confia no webhook em nenhum grau: o aviso é só um **gatilho**. Nada do
payload é usado — ao receber um evento `order`, o sistema re-busca a order na API do Mercado Pago
com o próprio token (`GET /v1/orders/{id}`, autoritativo) e só age sobre o que essa consulta
devolve. Um aviso forjado só consegue provocar uma consulta à nossa própria conta: se a order não
estiver paga DE VERDADE lá, nada acontece. E a confirmação só atinge pedidos cujo `mp_order_id`
gravado (só o nosso código de criação de cobrança grava isso) bate com a order paga — nunca por
`external_reference` solto. Idempotente (`pagamento_confirmado = false` no filtro): reprocessar o
mesmo aviso confirma 0 na segunda vez (testado).

**Plano B implementado como a demanda pedia**: fallback de conferência síncrona — ao carregar
qualquer lista de pedidos (`GET /api/pedidos`), pedidos com cobrança Pix pendente são conferidos
direto na API (trava de 60s por cobrança; cobrança expirada há mais de 24h sai da conferência e o
pedido volta pro fluxo manual da 113). Ou seja: mesmo se TODO o mecanismo de webhook falhar, a
confirmação aparece no próximo reload de qualquer tela de pedidos.

### O que foi feito

- **Migration** (`add_cobranca_pix_mercadopago_pedidos`): `mp_order_id`, `mp_pix_qr_code`,
  `mp_pix_expira_at`, `mp_ultima_conferencia` e `pagamento_confirmado_origem`
  (`'manual'`/`'mercadopago'`) em `jsgrafica_pedidos` + índice parcial por `mp_order_id`.
- **`lib/mercadopago.ts`** (reaproveitando `getConfigMercadoPago`/`mpFetch` da 084, nada
  duplicado): `criarCobrancaPix()` (POST `/v1/orders` com `payment_method: pix` +
  `X-Idempotency-Key` por referência do pedido — retry não duplica cobrança — e re-consulta em
  loop curto até o QR ficar pronto, que é assíncrono), `buscarOrderPorId()`,
  `confirmarPedidosPagosPorOrder()` (compartilhada entre webhook e fallback — resultado idêntico
  ao da 113: `pagamento_confirmado`, `pagamento_confirmado_at`, `forma_pagamento` derivada do
  método real do pagamento, só com `pagamento_confirmado_origem: 'mercadopago'`) e
  `conferirCobrancasPixPendentes()` (fallback).
- **`app/api/pedidos/route.ts`**: no fluxo "Criar pedido" do Inbox (branch `produtoId`), quando
  há item `pre_producao` no fechamento da venda (single ou multi-item da 076 — a cobrança cobre
  a SOMA dos itens que exigem Pix, vinculada a todos eles), cria a cobrança e grava o vínculo.
  **Se a criação falhar (MP fora do ar, QR não pronto a tempo), cai de volta pro texto com a
  chave estática + comprovante manual (062) — o atendimento nunca trava por causa do Mercado
  Pago.** `GET` ganhou a chamada do fallback (nunca derruba a listagem se falhar). `PATCH` (113)
  passou a gravar `pagamento_confirmado_origem: 'manual'`.
- **`lib/pedidos.ts`**: trecho Pix das mensagens de confirmação (single e multi) extraído pra
  `montarTrechoPix()` — com cobrança real: copia-e-cola + "válido por 24h" + "a gente confirma
  automaticamente" (sem pedir comprovante); sem cobrança: o texto antigo da 062, caractere por
  caractere.
- **`app/api/mercadopago/webhook/route.ts`**: evento tópico `order` dispara a re-busca
  autoritativa + confirmação (mesmo com assinatura inválida — ver decisão acima; a validação
  continua rodando e sendo logada). Tópico `payment` segue só logado.
- **`components/TelaPedidos.tsx` / `TelaInbox.tsx`**: cards ganham a variação
  "✓ Pago via <método> — confirmado automaticamente" quando `origem === 'mercadopago'`
  (pedido único, item de venda agrupada e painel de detalhe).
- **E-mail do pagador** (obrigatório na API, mas só metadado — pagador de Pix não autentica):
  sintético derivado do telefone; sandbox exige domínio `@testuser.com` (confirmado por teste — o
  local-part é livre), produção usa `@jsgrafica.site`. Credenciais: só a linha de Teste (id=1)
  foi usada; a de produção (id=3) não foi tocada nem ativada, como instruído.

### Testes (tudo sandbox/sintético, apagado depois; orders pendentes canceladas no MP)

1. **Cobrança + mensagem (fluxo real de ponta a ponta)**: `POST /api/pedidos` com produto
   `pre_producao` real (BANNER R$35) → cobrança Pix real criada no sandbox, `mp_order_id`/QR/
   expiração gravados no pedido, e os 2 rascunhos (073) montados certos — o de Pix com o
   copia-e-cola EMV (com os R$35,00 embutidos no próprio código), sem chave estática, sem "manda
   o comprovante".
2. **Confirmação automática via webhook**: pedido sintético + order real PAGA (cartão APRO — não
   existe forma de simular pagamento de Pix em sandbox por API, `PUT /v1/payments` devolve o
   mesmo 401 de toda escrita clássica; o caminho de confirmação é idêntico) → aviso com o id da
   order paga → `pedidosConfirmados: 1`, pedido `pagamento_confirmado: true`,
   `origem: 'mercadopago'`, `forma_pagamento: 'Cartão'` (derivada do método real). Reenvio do
   mesmo aviso: `pedidosConfirmados: 0` (idempotente).
3. **Fallback sem webhook nenhum**: segundo pedido sintético + segunda order real paga →
   nenhum aviso processado (o genuíno chegou antes do vínculo existir, de propósito) → um simples
   `GET /api/pedidos` em produção confirmou o pedido sozinho via conferência síncrona.
4. **Teste negativo**: o pedido com a cobrança Pix REAL (não paga) passou pelas mesmas
   conferências e **continuou pendente** — cobrança não paga nunca confirma nada.
5. **Regressão 113**: `PATCH` com `formaPagamento: 'Dinheiro'` → confirma manual normal,
   `origem: 'manual'`. Fluxo manual intacto.
6. **UI em produção** (Playwright): painel de detalhe do pedido mostrando
   "✓ Pago via Cartão — confirmado automaticamente" em verde.
7. `npx tsc --noEmit` e `npm run build` limpos.

### Pendências (nenhuma de código, ambas do Edvam)

1. **Chave Pix aleatória na conta MP** (critério 1): só o painel da conta mostra isso — em
   sandbox a cobrança funciona sem, então não bloqueou nada. Conferir antes da virada pra
   produção; se a conta só tiver chave com portabilidade, criar uma aleatória no próprio MP.
2. **1º Pix pago de verdade**: como sandbox não simula pagador de Pix, o primeiro pagamento
   Pix real de ponta a ponta (QR → pagamento → confirmação automática) só vai acontecer em
   produção — combinar com o PM/Edvam um teste de valor pequeno na virada (que também depende de
   ativar a credencial de produção, decisão que continua sendo do PM).

### Status final
Concluída e em produção (`dpl_44nD7qVkdryPRRFDqPKFijZ5XH8a`). Eventos de webhook dos testes
mantidos em `jsgrafica_mercadopago_eventos` como evidência (mesmo padrão da 084); pedidos/
rascunhos sintéticos apagados; orders pendentes canceladas no sandbox (as pagas não podem ser
canceladas — ficam como histórico de teste do próprio sandbox). Base de conhecimento atualizada
(seção 9 com o re-teste + seção 10 nova com os fatos da cobrança Pix via Orders).
