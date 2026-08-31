# 180 — Nunca sobrescrever silenciosamente uma confirmação de pagamento já registrada

Status: concluída
Criada em: 2026-07-15
Aprovada em: 2026-07-15
Concluída em: 2026-07-15
Chat executor: 03 - APP JS GRAFICA

## Contexto
Auditoria do PM (2026-07-15): existem 2 caminhos que gravam `pagamento_confirmado`/
`pagamento_confirmado_at`/`pagamento_confirmado_origem`/`forma_pagamento` em
`app/api/pedidos/route.ts`. O caminho A (`confirmarPagamento===true`) é protegido — só grava se
`pagamento_confirmado` ainda for `false`. O caminho B (dentro do PATCH geral de status, via
`formaPagamento`) **não tem essa proteção** — pode reescrever por cima de um pedido já confirmado,
inclusive trocando a origem de `'mercadopago'` (automático) para `'manual'`, perdendo o rastro de
como o pagamento realmente aconteceu. Não achei isso já materializado no banco, mas é uma lacuna
de design real. **Decisão do Edvam**: acabar com qualquer sobrescrição em campos importantes desse
tipo — se for preciso criar campos novos (em vez de reaproveitar os mesmos), fazer isso.

## Objetivo
Nenhum caminho do sistema sobrescreve silenciosamente os dados de uma confirmação de pagamento já
registrada — qualquer tentativa de confirmar de novo é bloqueada, registrada separadamente, ou
some visivelmente pro time revisar (nunca "sumir" apagando o dado original).

## Escopo
- Incluído: aplicar no caminho B (`app/api/pedidos/route.ts`, PATCH geral de status) a mesma
  proteção que o caminho A já tem — não sobrescrever se `pagamento_confirmado` já for `true`,
  a não ser que os dados sejam idênticos (mesma forma de pagamento, mesma origem).
- Se o executor identificar um cenário legítimo de precisar corrigir uma confirmação já feita
  (ex. forma de pagamento errada digitada por engano), criar um mecanismo explícito pra isso —
  **não reaproveitar os mesmos campos de forma silenciosa**: pode ser um campo de histórico/log
  separado (ex. `pagamento_confirmacoes_historico` jsonb, ou uma tabela de auditoria simples) que
  guarda a tentativa anterior antes de qualquer atualização, em vez de só sobrescrever.
- Explicitamente fora de escopo: mudar o comportamento do caminho A (já está certo).

## Critérios de aceite
- [ ] Caminho B não sobrescreve confirmação já existente sem deixar rastro
- [ ] Se existir um jeito de corrigir uma confirmação (ex. forma de pagamento errada), ele é
      explícito e auditável, não uma sobrescrita silenciosa
- [ ] Testado: tentar confirmar de novo um pedido já pago (via caminho B) não apaga o histórico
      original

## Riscos e cuidados
Cuidado pra não quebrar nenhum fluxo legítimo que hoje dependa do caminho B conseguir "atualizar"
um pedido já pago (ex. corrigir forma de pagamento na hora de marcar entregue) — mapear esses usos
antes de travar tudo.

## Referências
`app/api/pedidos/route.ts` (linhas ~450-465 caminho A, ~577-585 caminho B). Achado da auditoria de
pagamento do PM, 2026-07-15.

## Relato de execução
Executada em 2026-07-15 (03 - APP JS GRAFICA, Fable 5). Deploy do lote `dpl_4HA2DPHLKjSSYN2fVu4AW8mmTdVs`.

### O que foi feito
1. **Coluna nova de auditoria** `pagamento_confirmacoes_historico` (jsonb, migration
   `add_pagamento_historico_estorno_178_180`) — qualquer tentativa de mexer numa confirmação já
   feita fica registrada ali, os campos originais nunca são tocados.
2. **Caminho B protegido** (PATCH de status com `formaPagamento`): pedido já confirmado →
   forma IGUAL é no-op (só o status muda); forma DIFERENTE não sobrescreve NADA e grava
   `{acao: 'tentativa_bloqueada', operador, forma_tentada, forma_mantida, origem_mantida}` no
   histórico. Mapeado antes de travar (o risco da demanda): o fluxo legítimo não passa por aí —
   o front só manda `formaPagamento` quando o modal de pagamento pendente abriu, e ele só abre
   pra pedido NÃO pago (gate da 154); pedido já pago avança sem tocar em pagamento.
3. **Mecanismo explícito de correção** (o cenário legítimo que a demanda antecipou — forma
   digitada errada): PATCH `{corrigirFormaPagamento: true, id, formaPagamento, operador}` —
   exige pedido confirmado, rejeita mesma forma (400), grava a forma ANTIGA no histórico
   (`acao: 'forma_corrigida', de, para, origem_antiga`) e muda SÓ `forma_pagamento`
   (timestamp e origem da confirmação original ficam intactos — a data de entrada no caixa da
   164 não se move). UI: "✏️ Corrigir forma de pagamento" no detalhe do pedido, só Admin.

### Testes (pedido sintético ped-0920, apagado)
- Caminho B em pedido NÃO pago → confirma normal (regressão da 113/165 intacta).
- Caminho B de novo com forma diferente (Pix sobre Dinheiro) → status avançou, forma/timestamp
  **idênticos aos originais**, histórico ganhou a `tentativa_bloqueada` (banco conferido).
- Correção explícita Dinheiro→Pix → só a forma mudou, `pagamento_confirmado_at` intocado,
  histórico com a entrada `forma_corrigida`; corrigir pra mesma forma → 400.
- Caminho A (147) em pedido já pago → 404 de sempre (proteção original preservada).
- UI: botão visível pro Admin em pedido pago (screenshot).

### Achado fora de escopo (registrado, não resolvido)
O botão de corrigir forma existe no painel de pedido único; no painel de VENDA AGRUPADA
(2+ itens) os itens não têm o botão — se precisar, fica pro PM decidir se estende.
