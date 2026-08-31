# Auditoria — divergências de fechamento, 06 a 09/07/2026

Demanda 131. Relatório de auditoria — **nenhuma correção aplicada no banco**, como pedido.
Todos os números abaixo foram recalculados de forma independente a partir de
`jsgrafica_vendas`, `jsgrafica_pedidos` e `jsgrafica_saidas` (não confiei no que já estava
gravado em `jsgrafica_fechamento` como ponto de partida).

## Resultado principal: a conta bate. As "divergências" são de outra natureza.

Os 3 fechamentos **gerais** (`fechado_por: 'Sistema'`) completos no período — 06/07, 07/07 e
08/07 — batem **exatamente, sem nenhuma diferença de um centavo**, entre o que está gravado e o
que eu recalculei direto das tabelas fonte:

| Dia | Entradas gravada | Entradas recalculada | Saídas gravada | Saídas recalculada | Bate? |
|---|---|---|---|---|---|
| 06-07-26 | R$ 998,49 | R$ 998,49 | R$ 387,57 | R$ 387,57 | ✅ |
| 07-07-26 | R$ 624,25 | R$ 624,25 | R$ 472,47 | R$ 472,47 | ✅ |
| 08-07-26 | R$ 347,60 | R$ 347,60 | R$ 132,54 | R$ 132,54 | ✅ |
| 09-07-26 | — (sem fechamento geral ainda) | R$ 446,00 | — | R$ 240,96 | (dia em andamento) |

**Não há bug de cálculo em nenhum dos 3 dias fechados.** As "divergências" que motivaram esta
demanda são coisas diferentes, uma por dia:

### 06-07: a "R$1.007,90"/"-R$373,74" nunca foi divergência do fechamento geral
A divergência de -R$373,74 é do fechamento **parcial da Gabi** (`total_entradas=536,49`,
comparado contra o físico que ela contou, R$162,75) — não do fechamento geral. Causa já
confirmada na demanda 080: o fechamento por operador compara físico contra o **total** de
vendas (todas as formas de pagamento), não só a parte em dinheiro — produz uma divergência
gigante e falsa sempre que o operador vendeu por Cartão/Pix. O fechamento geral desse dia
(criado pela âncora manual da demanda 090) está com `divergencia = 0,00`, reconciliado.

### 07-07: R$22,97 de sobra física — real, sem explicação de cálculo
Esse é o único caso onde o fechamento **geral** tem divergência de verdade
(`divergencia: 22,97`) **e o cálculo bate perfeitamente** — ou seja, não é erro de conta, é o
valor físico contado ter ficado R$22,97 **a mais** do que o sistema esperava. Não tem como eu
confirmar de onde veio essa sobra sem uma fonte independente adicional (não achei nenhuma venda/
pedido/saída fora do período que explicasse). **Pergunta pro Edvam**: lembra de ter entrado
algum dinheiro nesse dia que não passou pelo PDV/Inbox (troco de outra coisa, venda direta,
etc.)? É o único ponto desta auditoria que fica sem explicação encontrada.

### 08-07: mesma causa do 06-07 (fechamento por operador), fechamento geral já reconciliado
Gabi (+100,90) e Zu (+28,05) são de novo divergências de fechamento **por operador**, mesma
causa da demanda 080. O fechamento geral desse dia já está com `divergencia: 0,00` — o próprio
contexto desta demanda já registrava que isso tinha sido confirmado batendo com 4 contas reais
checadas depois. Auditoria independente concorda: cálculo bate.

### 09-07: dia em andamento, sem fechamento geral ainda
Só há fechamentos parciais (Gabi -18,55, Zu 45,35) — mesma causa (metric de fechamento por
operador). Recalculei os totais do dia pra referência (tabela acima), mas não há fechamento
geral ainda pra comparar.

## Cruzamento com o Mercado Pago — resultado: inconclusivo, e por um motivo importante

**Achado que muda a pergunta original**: quase todo o "Pix" registrado no sistema **nunca passou
pelo Mercado Pago** — foi confirmado manualmente pelo operador (fluxo estático da demanda 062:
mostra a chave Pix, o cliente paga, o operador vê no próprio celular e marca como pago). Só os
pedidos que passaram pela cobrança automática da demanda 124 (`criarCobrancaPix`) têm um
`mp_order_id` de verdade, checável contra a API.

| Dia | Pix registrado no sistema | Pedidos com `mp_order_id` real (checável) |
|---|---|---|
| 06-07-26 | R$ 302,15 (20 pedidos) | 0 |
| 07-07-26 | R$ 75,70 (15 pedidos) | 0 |
| 08-07-26 | R$ 151,90 (34 pedidos) | 0 |
| 09-07-26 | R$ 174,40 (27 pedidos) | **3** |

Ou seja: **96 de 96 pedidos "Pix" do período (06 a 08/07) não têm como ser conferidos contra o
Mercado Pago** — a única fonte de verificação é a palavra do operador. Isso não é um problema
que eu resolvo aqui, é uma limitação real da forma como o Pix funciona hoje (só a 09/07 em
diante, com a Fase 3 sendo testada, começou a gerar cobrança real via Mercado Pago).

**Dos 3 pedidos de 09/07 que têm `mp_order_id` de verdade** (`ped-0576`, `ped-0578`,
`ped-0579`, R$0,45 cada — claramente valores de teste da própria sessão de testes de hoje, não
cliente real): consultei a API de verdade (`GET /v1/orders/{id}`) — os 3 mostram
**`status: action_required`** (pagamento **nunca foi concluído**), mas os pedidos já estão
`entregue` no sistema com `forma_pagamento: Pix`. Achado real, mas de escala pequena (R$1,35
total) e claramente ligado ao teste de hoje, não uma divergência de cliente real.

**🔴 Achado adicional, fora do que foi pedido mas relevante pro objetivo da auditoria**: a conta
do Mercado Pago está em **modo Teste (sandbox)** — os pagamentos que aparecem lá (`external_reference`
como `teste-084-webhook-final`, `ped-0451`, `ped-0568` etc., valores de R$1 a R$10) são resíduos
de desenvolvimento das demandas 084/124, **nenhum bate com pedido nenhum que existe hoje no
sistema** (conferi os IDs, zero correspondência). Enquanto a conta estiver em sandbox, cruzar
contra o Mercado Pago **não pode nunca confirmar dinheiro real** — é só uma verificação de que a
integração funciona tecnicamente.

## Vendas/pedidos fora do sistema (item 3 do escopo)

Não tenho como confirmar isso sozinho, como a própria demanda já reconhecia. Só o achado do
07-07 (R$22,97 de sobra física, ver acima) é candidato concreto a "algo que aconteceu fora do
sistema" — os outros dias não mostram nenhum sinal disso (a conta bate exatamente).

## Recomendações (não implementadas — decisão do PM/Edvam)

1. **Não perseguir os valores de "-373,74"/"+100,90"/"+28,05"/"-18,55"/"45,35" como se fossem
   dinheiro desaparecido** — são o mesmo bug de métrica já identificado na demanda 080/074
   (fechamento por operador comparando físico contra total, não só dinheiro). Vão continuar
   aparecendo, um por operador por dia, até esse cálculo específico ser corrigido.
2. **O único ponto real e sem explicação desta auditoria é o R$22,97 do dia 07/07** — vale
   perguntar diretamente ao Edvam se lembra de algo.
3. **Não confiar em "Pix bateu com o Mercado Pago" como verificação até**: (a) a conta sair do
   modo Teste, e (b) o fluxo manual de Pix (chave estática) for reduzido ou ganhar algum jeito
   de confirmação mais forte que "o operador viu no celular dele".
4. Os 3 pedidos de teste de hoje com Pix "action_required" mas marcados `entregue`/pago — se
   quiserem, dá pra cancelar/corrigir esses 3 especificamente (são teste, valor pequeno) — não
   fiz isso aqui porque é fora do escopo desta demanda (só auditoria, sem correção).
