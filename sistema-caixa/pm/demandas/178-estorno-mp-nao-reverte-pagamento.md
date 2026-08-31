# 178 — Estorno no Mercado Pago não reverte pagamento_confirmado

Status: concluída
Criada em: 2026-07-15
Aprovada em: 2026-07-15
Concluída em: 2026-07-15
Chat executor: 03 - APP JS GRAFICA
Prioridade: baixa

## Contexto
Auditoria do PM (2026-07-15): nenhum lugar do código reverte `pagamento_confirmado` para `false`
quando uma Order do Mercado Pago é cancelada/estornada depois de já confirmada. Se um Pix
confirmado automaticamente for estornado (disputa, erro, reembolso manual no painel do MP), o
pedido continua contando como entrada real pra sempre. Verificado: ainda não aconteceu com
dinheiro de produção (33 eventos de cancelamento batendo com pedidos pagos são todos de sandbox/
teste) — risco latente, não materializado.

## Objetivo
Um estorno/cancelamento de Order no Mercado Pago, depois de já ter confirmado o pagamento,
reflete no pedido (pelo menos um alerta pro time revisar — não precisa reverter sozinho).

## Escopo
- Incluído: no webhook (`app/api/mercadopago/webhook/route.ts`) e/ou na conferência
  (`conferirCobrancasPixPendentes`), tratar o caso de uma Order que já confirmou pagamento
  (`pagamento_confirmado=true`, `pagamento_confirmado_origem='mercadopago'`) e depois aparece como
  cancelada/estornada na API do MP. Decisão do executor: reverter automaticamente (com log/
  registro do motivo) ou só sinalizar pro time revisar manualmente (ex. campo novo tipo
  `pagamento_estornado`) — dado o risco financeiro, avaliar qual abordagem é mais segura antes de
  implementar.
- Explicitamente fora de escopo: qualquer devolução automática de dinheiro pro cliente (isso é
  operação do Mercado Pago, não deste sistema).

## Critérios de aceite
- [ ] Pedido com pagamento confirmado que depois recebe evento de estorno/cancelamento no MP fica
      sinalizado de alguma forma (revertido ou alertado — decisão documentada no relato)
- [ ] Testado com evento sintético de estorno depois de confirmação

## Riscos e cuidados
Baixo risco imediato (nunca aconteceu com dinheiro real), mas alto impacto se acontecer sem
proteção nenhuma — por isso prioridade baixa, mas registrado.

## Referências
`app/api/mercadopago/webhook/route.ts`, `lib/mercadopago.ts` (`confirmarPedidosPagosPorOrder`).
Achado da auditoria de pagamento do PM, 2026-07-15.

## Relato de execução
Executada em 2026-07-15 (03 - APP JS GRAFICA, Fable 5). Deploy do lote `dpl_4HA2DPHLKjSSYN2fVu4AW8mmTdVs`.

### Decisão (documentada, como a demanda pediu): SINALIZAR, nunca reverter sozinho
Reverter `pagamento_confirmado` automaticamente mexeria em `data_entrada_caixa`/fechamentos
históricos sem ninguém ver (a régua da 164 conta pelo pagamento). O caminho seguro: colunas
novas `pagamento_estornado_at` + `pagamento_estorno_detalhe` (migration
`add_pagamento_historico_estorno_178_180`) e alerta visível — quem revisa decide, e se o
estorno for real cancela o pedido pelo fluxo da 157 (motivo "Devolução/Reembolso"), que aí sim
tira da contagem com rastro.

### O que foi feito
1. `marcarPedidosEstornadosPorOrder(order)` em lib/mercadopago.ts: order re-buscada da API com
   status de estorno (refunded/partially_refunded/canceled/charged_back e variantes) →
   marca os pedidos com `mp_order_id` daquela order que estão `pagamento_confirmado = true` com
   origem 'mercadopago' e ainda sem marca. Idempotente; `canceled`/`expired` de order NUNCA
   paga é o ciclo normal do Pix e fica de fora sozinho pelo filtro de confirmado.
2. Chamada nos 2 pontos que já re-buscam a order: webhook (após `confirmarPedidosPagosPorOrder`)
   e o poll `GET /api/mercadopago/cobranca`.
3. UI: alerta vermelho no detalhe do pedido (com o detalhe da order e a instrução de revisar/
   cancelar), badge nos itens de venda agrupada, aviso no topo da venda e contagem de
   estornados no panorama novo da aba Pedidos (175) — impossível passar batido pra quem abre a
   tela.

### Testes (evento sintético, como o critério pede — estorno real exigiria dinheiro)
Pedido sintético pago com `mp_order_id` fake + rota de teste TEMPORÁRIA em dev injetando a
OrderMP direto na função (rota apagada antes do build/deploy — não existe em produção):
`processed` → 0 marcados; `refunded` → 1 marcado (`pagamento_confirmado` intocado, detalhe
gravado); repetir → 0 (idempotente). UI conferida por screenshot com o alerta vermelho no
detalhe. Sintético apagado.

### Limite conhecido (registrado)
A detecção depende do webhook do MP (que re-envia) e do poll do QR aberto — não existe varredura
periódica de orders JÁ pagas (seria 1 chamada de API por pedido pago pra sempre). Se o time
quiser um pente-fino agendado, é demanda própria.
