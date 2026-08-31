# 215 — Mapeamento completo de repasses fantasma de recarga e fechamentos dessincronizados

Status: concluída
Criada em: 2026-07-18
Aprovada em: 2026-07-18
Concluída em: 2026-07-18
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
A demanda 213 corrigiu o entendimento na origem: recarga VEM/celular paga em Dinheiro ou Cartão
nunca deveria ter gerado saída de repasse (o conceito inteiro da 188 estava errado). O PM tentou
corrigir manualmente o histórico hoje (2026-07-18), achou 9 saídas fictícias somando R$175,00,
apagou, depois recriou com `conta_origem='recargapay'` pra não perder o registro do gasto real,
e ajustou os fechamentos "Sistema" à mão, várias vezes, revertendo e reaplicando.

Nesse processo o PM cometeu dois erros seguidos (já corrigidos) e, investigando um terceiro
problema (por que a divergência de alguns dias aumentava em vez de diminuir), achou que a
correção manual estava incompleta: só no dia 10/07/26 existem MAIS DUAS saídas de repasse de
recarga que nunca entraram na lista original de 9 (R$27,50 e R$20,00, `conta_origem` null,
nunca tocadas). Ou seja, o levantamento manual do PM não é confiável — precisa de uma varredura
completa e sistemática, não mais feita à mão dia a dia.

Separadamente, o PM também achou que o fechamento "Sistema" de 10/07/26 tem `saldo_acumulado`
armazenado (424,41) que não bate com `saldo_anterior + resultado_dia` (306,84) — diferença de
R$117,57. Hipótese: uma saída de R$1.915 (pagamento de cartão Mercado Pago) foi lançada com
`data_dia` retroativo pra 10/07 poucos segundos depois do fechamento daquele dia ter sido salvo
(`created_at` da saída é 11 segundos depois do `fechado_em` da linha), e o `saldo_acumulado` nunca
foi recalculado pra refletir isso. Não se sabe se esse é um caso isolado ou se existem outras
linhas de fechamento com o mesmo tipo de dessincronia.

Nenhuma correção deve ser aplicada ainda — o objetivo aqui é só mapear o terreno completo, pra o
PM planejar uma correção única e definitiva, sem mais rodadas de erro/reversão.

## Objetivo
Um relatório completo e confiável de (1) toda saída de repasse fantasma de recarga que ainda
existe no histórico, e (2) toda linha de fechamento "Sistema" cujo `saldo_acumulado` armazenado
não bate com o que a fórmula (`saldo_anterior + resultado_dia`) indicaria — pra o PM decidir a
correção final com dado completo, não amostra.

## Escopo
- Incluído: buscar em `jsgrafica_saidas` TODA saída cuja `categoria_id` seja `recarga_vem` ou
  `recarga_cel`, OU cuja `descricao` contenha "Repasse automático" ou "Repasse (recriado" —
  independente de `conta_origem` (null, `recargapay` ou qualquer outra), em todo o histórico
  desde que o Supabase é fonte de verdade (não só os dias já olhados pelo PM: 09, 10, 13, 14, 15,
  16, 17/07). Listar cada uma: `id`, `data_dia`, `operador`, `valor`, `conta_origem`, `descricao`,
  `created_at`.
- Incluído: para cada saída encontrada acima, verificar em `jsgrafica_pedidos` se algum pedido
  ainda tem `saida_vinculada_id` apontando pra ela (documentar, não desvincular).
- Incluído: para TODA linha de `jsgrafica_fechamento` com `fechado_por = 'Sistema'` (não só as 6
  que o PM já olhou), calcular `saldo_anterior + resultado_dia` e comparar com `saldo_acumulado`
  armazenado. Listar toda linha onde a diferença seja maior que R$0,01, com a diferença exata.
- Incluído: para cada linha dessincronizada encontrada, investigar se existe(m) saída(s) ou
  entrada(s) com `created_at` posterior ao `fechado_em` daquela linha e `data_dia` igual ao dia
  fechado — isso explicaria o padrão achado em 10/07 (lançamento retroativo depois do fechamento
  já ter sido salvo). Documentar a hipótese de causa por linha, mesmo que não tenha certeza.
- Incluído: entregar uma tabela final consolidada por dia (09/07 em diante, mas sem se limitar a
  isso — se houver contaminação em dias mais antigos, reportar também) mostrando: soma de repasse
  fantasma de recarga naquele dia, e se o fechamento Sistema daquele dia está dessincronizado por
  outro motivo.
- Explicitamente fora de escopo: aplicar qualquer correção — apagar saída, recalcular fechamento,
  mexer em pedido. Isso é 100% investigação e relato. Nenhum UPDATE/DELETE/INSERT.

## Critérios de aceite
- [ ] Lista completa (não amostra) de toda saída de repasse fantasma de recarga no histórico, com
      valor total somado
- [ ] Lista completa de toda linha `jsgrafica_fechamento` (Sistema) com `saldo_acumulado`
      dessincronizado da fórmula, com a diferença exata e hipótese de causa
- [ ] Tabela consolidada por dia, pronta pra o PM planejar a correção final
- [ ] Confirmado que nenhuma alteração foi feita nos dados (só SELECT)

## Riscos e cuidados
Só leitura — zero risco de regressão em produção. O risco é entregar um levantamento incompleto
de novo (como o do PM); por isso a busca deve ser por padrão (categoria/descrição), não por uma
lista fechada de dias/valores já conhecidos.

## Referências
Demandas 188, 199, 211, 213, 214 (histórico do entendimento de repasse de recarga). Achados do PM
em 2026-07-18: 9 saídas/R$175,00 originalmente corrigidas (incompleto, confirmado), R$47,50
adicional achado só em 10/07 durante esta investigação, dessincronia de R$117,57 no fechamento
Sistema de 10/07/26 (linha `id cdb0acd4-09a4-4b23-ac48-824d937d6135`, `fechado_em`
2026-07-12 18:09:11, saída de R$1.915 `id 485fd0e1-2193-4522-adbb-41ae19989301` lançada
2026-07-12 18:09:22).

## Relato de execução

**Status: concluída.** Relatório completo em
`pm/conhecimento/mapeamento-repasses-fantasma-e-fechamentos-dessincronizados.md`. 100%
só-leitura — nenhum UPDATE/DELETE/INSERT executado, confirmado.

### O que foi feito

**Parte 1 (repasse fantasma de recarga)**: busquei por `categoria_id IN ('recarga_vem',
'recarga_cel')` OU descrição de repasse automático/recriado, sem filtro de data — 353 linhas,
R$31.243,78 no total. Antes de tratar isso como "R$31 mil de fantasma", separei por origem:
- 243 linhas (R$23.563,88): importação histórica de 2025, lote único (`operador='import'`,
  mesmo `created_at`) — não tem como ser do bug da 188/213 (que não existia em 2025).
- Dentro das 110 criadas em julho/2026: outro lote de importação em massa (`operador='import'`,
  outro `created_at` único, cobrindo abril-junho/2026) — parece catch-up de despesa real, sem
  assinatura do mecanismo automático.
- O que sobra com operador real e assinatura do bug: **9 fantasma já corrigidos pelo PM (R$174,50),
  1 fantasma NOVO ainda não corrigido (R$100,00, 16/07, ped-1085, já citado pelo próprio Edvam no
  texto da saída como "achado do Edvam" mas nunca recriado com conta_origem certo), 7 legítimos
  (Pix, R$215,00), e ~11 sem vínculo de pedido que não dá pra classificar só com o dado disponível.**

**Achado que contradiz a própria alegação da demanda**: os "R$27,50 e R$20,00 de 10/07,
`conta_origem` null, nunca tocados" citados no contexto — achei exatamente esses 2 valores, mas
**estão vinculados a pedidos pagos em Pix** (legítimos pela regra da 213), não Dinheiro/Cartão.
Reportei isso explicitamente como discrepância a reconferir, não corrigi nem assumi que a alegação
original estava certa ou errada sozinho.

**Parte 2 (fechamentos dessincronizados)**: calculei `saldo_anterior + resultado_dia` vs
`saldo_acumulado` pra TODA linha `fechado_por='Sistema'` (não só as 6 que o PM olhou). **Só 3
linhas dessincronizadas em todo o histórico**: 06/07 (R$1.168,89 — conhecido, âncora intencional
da demanda 090) e 08/07 (R$474,02 — já explicado na demanda 131), nenhum dos dois é bug novo. O
terceiro, 10/07 (R$117,57), é o caso real.

### Testes realizados e resultado

Confirmei a causa do caso de 10/07 recalculando o `resultado_dia` **ao vivo, direto das tabelas
fonte** (mesma régua da demanda 164: entradas confirmadas − saídas do dia) — bateu exato com o
`resultado_dia` já gravado (-R$1.907,05), confirmando que esse campo já foi atualizado pra
refletir a saída retroativa de R$1.915 (criada 11s depois do fechamento), mas `saldo_acumulado`
nunca foi recalculado em cima disso.

**Achado novo, fora do que o contexto já sabia**: conferi a cadeia de `saldo_anterior` dos
fechamentos seguintes — **o erro de R$117,57 já se propagou pra 13, 14, 15 e 16/07** (cada um
herda o `saldo_acumulado` errado do dia anterior). 17/07 e hoje ainda não têm fechamento Sistema
gravado.

### Achados fora do escopo
Nenhum novo além do já registrado no relatório (a propagação do erro pra 4 dias além do 10/07 já
está documentada como parte central do achado, não é "fora do escopo" — é exatamente o que a
demanda pedia pra investigar).

### Status final
Concluída. Relatório completo entregue com: lista de saídas classificadas (fantasma corrigido,
fantasma pendente, legítimo, indeterminado), lista completa de fechamentos dessincronizados (só
3 em todo o histórico, 2 já conhecidos), causa confirmada e propagação mapeada do caso novo,
tabela consolidada por dia. Nenhuma alteração de dado feita — tudo pronto pro PM planejar a
correção final única.

### CORREÇÃO (2026-07-18, feita durante a demanda 216)
Ao cruzar este relatório com as demandas 200/201 durante a execução da 216, achei um erro na
classificação da saída `55c45c7e-...` (R$100, 16-07-26, `ped-1085`): eu tinha reportado como
"fantasma NOVO, não corrigido, precisa de `conta_origem='recargapay'`". **Está errado** — ela já
tem `conta_origem='mercadopago'` correto desde a criação (corrigida pela demanda 200 no mesmo
dia). O problema real é outro: a demanda 201 testou a transferência resolvedora dessa pendência
(Dinheiro Zu → Mercado Pago, R$100) e seu relato afirma que ela "permanece no banco por ser
genuína" — mas hoje (18-07-26) `jsgrafica_transferencias` só tem 2 linhas (17-07-26), nenhuma
ligada a este caso. A transferência sumiu (causa não investigada). Total de fantasma confirmado
cai de R$274,50 pra **R$174,50**; o R$100 é pendência entre contas reaberta, não fantasma.
Detalhe completo em `pm/conhecimento/mapeamento-repasses-fantasma-e-fechamentos-dessincronizados.md`
§1.1-bis. Nenhuma alteração de dado foi feita nesta correção — só releitura e cruzamento.

### Critérios de aceite
- [x] Lista completa (não amostra) de toda saída de repasse fantasma de recarga, com valor total
      somado (e separada por origem — histórico legítimo vs. bug real vs. indeterminado)
- [x] Lista completa de toda linha `jsgrafica_fechamento` (Sistema) dessincronizada, com diferença
      exata e hipótese de causa (só 3 linhas, causa confirmada pra 1, já explicadas pras outras 2)
- [x] Tabela consolidada por dia, pronta pra o PM planejar a correção final
- [x] Confirmado que nenhuma alteração foi feita nos dados (só SELECT)
