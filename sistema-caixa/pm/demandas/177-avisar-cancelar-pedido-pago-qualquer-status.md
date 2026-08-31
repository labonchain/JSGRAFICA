# 177 — Avisar ao cancelar pedido pago em qualquer status, não só "entregue"

Status: concluída
Criada em: 2026-07-15
Aprovada em: 2026-07-15
Concluída em: 2026-07-15
Chat executor: 03 - APP JS GRAFICA
Prioridade: baixa

## Contexto
A demanda 157 criou um aviso ("esse valor já contou no caixa") ao cancelar pedido com
`status === 'entregue'` e pagamento confirmado. Auditoria do PM (2026-07-15) achou que **qualquer
outro status** (confirmado, em_producao, pronto, aguardando_retirada) cancela com um `confirm()`
genérico, mesmo com pagamento já confirmado — sem aviso nenhum. Confirmado com dado real: **10
pedidos cancelados no banco têm `pagamento_confirmado = true`, 7 deles claramente clientes reais**
(Viviane, Karina Adesivo Leitoso, Claudia Brito, Rayane Barbosa, Lidiane Oliveira, Carlos André
Camilo, Pedro Henrique — cancelados por Gabi/Edvam, não são teste).

## Objetivo
Cancelar qualquer pedido com pagamento confirmado avisa que o valor já contou no caixa, não só
quando o status é "entregue".

## Escopo
- Incluído: estender o aviso da demanda 157 (`ModalCancelarEntregue` ou equivalente) pra qualquer
  status, não só `entregue` — a condição de disparo passa a ser `pagamento_confirmado === true`,
  independente do status.
- Explicitamente fora de escopo: mudar o que acontece financeiramente ao cancelar (`cancelarPedido`
  já não mexe em `pagamento_confirmado`, isso está correto — só o AVISO precisa cobrir mais casos).

## Critérios de aceite
- [ ] Cancelar pedido pago em qualquer status (não só entregue) mostra o aviso
- [ ] Cancelar pedido NÃO pago continua com o fluxo simples de hoje
- [ ] Testado com pedido sintético pago em status "em_producao" ou "pronto"

## Riscos e cuidados
Nenhum — é só estender uma proteção que já existe pra mais casos.

## Referências
Demanda 157 (`ModalCancelarEntregue`). Achado da auditoria de pagamento do PM, 2026-07-15 — os 10
pedidos cancelados com pagamento confirmado.

## Relato de execução
Executada em 2026-07-15 (03 - APP JS GRAFICA, Fable 5). Deploy do lote `dpl_4HA2DPHLKjSSYN2fVu4AW8mmTdVs`.

### O que foi feito
O `ModalCancelarEntregue` da 157 virou `ModalCancelarPago` e o gatilho passou a ser
`pagamento_confirmado === true` em QUALQUER status (o texto se adapta: "já foi entregue" vs
"já está pago — o valor já contou no caixa no dia do pagamento", coerente com a régua da 164).
Aplicado nos 3 pontos de cancelamento da TelaPedidos (detalhe, venda agrupada, fila de
impressão — a fila nem tinha modal, ganhou) e, no Inbox, o `confirm()` dos 2 caminhos ganhou o
aviso "já está PAGO e o valor já contou no caixa" quando o pedido é pago. O aviso de "dia já
fechado" agora checa o dia em que a entrada CONTOU (`pagamento_confirmado_at` primeiro,
entrega como fallback do histórico — antes só olhava a entrega). Pedido NÃO pago continua no
confirm simples de sempre; permissões intocadas (entregue segue só-Admin).

### Testes
Pedido sintético PAGO em status "pronto" → Cancelar abriu o modal novo com aviso + motivo
obrigatório (screenshot); confirmado com "Devolução/Reembolso" → banco com `status: cancelado`,
`motivo_cancelamento` e `pagamento_confirmado` intocado (só o AVISO mudou, o financeiro do
cancelamento é o mesmo — como a demanda exigiu). Pedido não-pago → confirm simples (regressão).
Sintético apagado.
