# 137 — Jornada do pedido (Fase 1/5): forma de pagamento vira escolha do pedido, não do produto

Status: concluída — aguardando validação do PM/Edvam em produção antes da Fase 2
Criada em: 2026-07-09
Aprovada em: 2026-07-09
Concluída em: 2026-07-09
Chat executor: 03 - APP JS GRAFICA

## Contexto — plano geral (5 fases, esta demanda é só a Fase 1)
O Edvam quer que o pagamento em Pix (e futuramente cartão via Stone) funcione pra **qualquer**
pedido — balcão ou Inbox, adiantado ou na retirada — não só o caso único que existe hoje
(pedido do Inbox com produto marcado como `pre_producao`). Mapeamento da jornada atual
(2026-07-09, investigação do PM, código real):

- `pagamento_tipo` (`pre_producao`/`pos_producao`/`flexivel`) é hoje **propriedade fixa do
  produto** (`jsgrafica_produtos.pagamento_tipo`), lida automaticamente na criação do pedido
  (`app/api/pedidos/route.ts:70,91`) — **não existe hoje nenhuma tela onde o atendente ou
  cliente escolhe a forma de pagamento no momento do pedido**. É herdado, não escolhido.
- Balcão grava `pagamento_tipo: 'pos_producao'` sempre fixo (linha 278), **ignorando** o valor
  real cadastrado no produto.
- Pedido pode entrar em produção com pagamento pendente hoje — nenhuma checagem bloqueia
  `confirmado → em_producao` (só existe checagem, fraca, na transição pra `entregue`).
- Balcão e Inbox são **esteiras diferentes** hoje: balcão pula direto pra `entregue`/
  `aguardando_retirada` na criação; Inbox sempre passa por `confirmado → em_producao → pronto`.

**Decisão do Edvam (2026-07-09)**: unificar tudo — mesmo pagamento em dinheiro passa pela mesma
confirmação explícita que Pix/cartão (sem caso especial), e o balcão "retira depois" passa a
seguir a mesma esteira de produção do Inbox. Isso vai virar 5 demandas sequenciais:

1. **(Esta demanda) Forma de pagamento vira campo escolhido no pedido** — só adiciona, não muda
   comportamento existente ainda.
2. "Tipo de entrega" (imediata/retira depois) vira pergunta explícita no início, nos 2 canais.
3. Generalizar a cobrança Pix real pra disparar pela forma de pagamento escolhida (não mais pelo
   produto), incluindo tela de QR code no balcão.
4. Travar produção até pagamento confirmado — pra todas as formas, incluindo dinheiro.
5. Unificar a esteira do balcão com a do Inbox (produção → pronto → entrega).

**Cada fase só começa depois da anterior validada em produção pelo PM/Edvam — não executar a
Fase 2 sem confirmação explícita, mesmo que pareça natural continuar.**

## Objetivo desta demanda (Fase 1)
Existe um campo por pedido que registra a forma de pagamento **escolhida** (Dinheiro/Pix/Cartão)
e se é pagamento imediato ou na retirada — capturado na criação, nos 2 canais (Inbox e balcão) —
**sem alterar nenhum comportamento hoje existente** (nenhuma lógica de cobrança, produção ou
confirmação muda ainda; `pagamento_tipo` do produto continua sendo lido e usado exatamente como
hoje, em paralelo).

## Escopo
- Incluído:
  1. Novo(s) campo(s) em `jsgrafica_pedidos` — ex. `forma_pagamento_escolhida` ('dinheiro' |
     'pix' | 'cartao') e `pagamento_momento` ('agora' | 'retirada') — nomes finais a critério do
     executor, documentar a escolha no relato. Nullable, sem afetar linhas existentes.
  2. UI no fluxo de **criação** de pedido do Inbox (`components/TelaInbox.tsx`, painel "Criar
     pedido"): adicionar a pergunta "Forma de pagamento?" (Dinheiro/Pix/Cartão) e, se aplicável,
     "Pagar agora ou na retirada?" — grava nos campos novos, **sem faz nada além de gravar**
     (nenhuma cobrança, nenhuma checagem nova).
  3. Mesma pergunta no fluxo de criação de venda de balcão (`app/page.tsx` e `app/pdv/page.tsx` —
     **os dois**, são implementações separadas, confirmar que ambos recebem a mudança).
  4. Gravar os campos novos em toda criação de pedido daqui pra frente — sem quebrar nem exigir
     preenchimento em nenhum outro lugar do sistema que já lê `jsgrafica_pedidos`.
- Fora de escopo (fica pras próximas fases): qualquer mudança em `criarCobrancaPix`, na trava de
  produção, na esteira de status, ou na tela de QR code. Esta demanda **não muda nenhum
  comportamento visível pro fluxo de pagamento/produção** — só adiciona a pergunta e grava a
  resposta.

## Critérios de aceite
- [x] Campos novos existem em `jsgrafica_pedidos`, nullable, sem afetar histórico
- [x] Pergunta de forma de pagamento aparece na criação de pedido do Inbox, grava certo
- [x] Mesma pergunta aparece nos dois fluxos de balcão (`app/page.tsx` e `app/pdv/page.tsx`)
- [x] Nenhum comportamento existente mudou — pedido continua se comportando exatamente como hoje
      em relação a cobrança Pix, produção e confirmação (regressão testada explicitamente)

## Riscos e cuidados
Baixo risco por design (só adiciona campo/pergunta, não altera lógica) — mas testar regressão com
cuidado justamente porque toca os 2 fluxos de criação de pedido mais usados do sistema. Não seguir
pra Fase 2 sem essa demanda validada em produção primeiro.

## Referências
Esta conversa (2026-07-09) — mapeamento completo da jornada atual. `app/api/pedidos/route.ts`,
`components/TelaInbox.tsx`, `app/page.tsx`, `app/pdv/page.tsx`, `jsgrafica_produtos.pagamento_tipo`.

## Relato de execução

### Nomes dos campos (decisão do executor, como pedido)
Exatamente os sugeridos na demanda: `forma_pagamento_escolhida` (`'dinheiro'|'pix'|'cartao'`,
com CHECK) e `pagamento_momento` (`'agora'|'retirada'`, com CHECK) — nullable, migration
`add_forma_pagamento_escolhida_pedidos`, histórico intacto (fica null). Valor inválido no corpo
do POST é normalizado pra null (não derruba a criação do pedido — captura nunca pode quebrar
venda).

### O que foi feito
- **API** (`POST /api/pedidos`, os 2 branches): helper `camposEscolhaPagamento()` valida/
  normaliza e grava os 2 campos — só gravação, nenhuma lógica lê esses valores.
- **Inbox** (`components/TelaInbox.tsx`, carrinho do "Criar pedido"): duas perguntas novas acima
  do "Confirmar pedido" — "Forma de pagamento" (Dinheiro/Pix/Cartão) e "Pagar quando?"
  (Agora/Na retirada). **Opcionais nesta fase e sem default** (pra não enviesar o dado que as
  próximas fases vão usar); clicar de novo desmarca. Uma escolha por venda, gravada em todos os
  itens do carrinho (076). Estados resetados ao confirmar e ao cancelar o fluxo.
- **Balcão (os 2, `app/page.tsx` e `app/pdv/page.tsx` — implementações duplicadas, confirmado
  que ambos receberam a mudança)**: o modal "Finalizar venda" (066) JÁ pergunta a forma — a
  captura nova **deriva** do que já existe (Dinheiro/Cartão/Pix → momento `'agora'` + forma
  mapeada; "Paga na retirada" → momento `'retirada'`), e ganhou UMA sub-pergunta nova, opcional,
  que só aparece ao escolher "Paga na retirada": "Como vai pagar na retirada?" (Dinheiro/Cartão/
  Pix) — captura a forma pretendida sem mexer em nada do fluxo/estado legado (`forma_pagamento`
  string, `pagamento_confirmado`, `statusEntrega` continuam idênticos).

### Testes realizados (sintéticos, tudo limpo no fim — inclusive a cobrança sandbox cancelada)
- **Balcão via API**: Dinheiro/agora → `('dinheiro','agora')` com comportamento legado idêntico
  (entregue, confirmado, forma "Dinheiro"); Paga na retirada+Pix → `('pix','retirada')` com
  `aguardando_retirada`/não confirmado como sempre; **caller antigo sem os campos** → null/null
  (compatibilidade); **valores inválidos** ("cheque"/"amanha") → null/null sem erro.
- **🔴 Regressão explícita do fluxo mais sensível** (exigência da demanda): pedido do Inbox com
  produto `pre_producao` real + os campos novos → a cobrança Pix REAL do Mercado Pago continuou
  sendo criada exatamente como antes (124: `mp_order_id` + QR gravados, 2 rascunhos — confirmação
  + copia-e-cola), E a escolha foi gravada junto. Nada mudou no comportamento.
- **UI (Playwright)**: balcão admin — sub-pergunta ausente antes de "Paga na retirada" e presente
  depois (0→1, medido); venda REAL confirmada pela UI com retirada+Pix → banco gravou
  `('pix','retirada')` (fio UI→POST→banco provado). Inbox — as 2 perguntas renderizando no
  carrinho (fluxo cancelado sem criar pedido).
- `npx tsc --noEmit` e `npm run build` limpos.

### Status final
Concluída e em produção (`dpl_8wDR1t9sBZ2TN3rJpebCk7vjoN4R`). **Parado aqui como instruído — a
Fase 2 só começa com confirmação explícita do PM depois desta validada em produção.**
