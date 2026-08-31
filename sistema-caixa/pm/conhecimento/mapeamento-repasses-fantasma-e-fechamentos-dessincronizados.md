# Mapeamento completo — repasses fantasma de recarga e fechamentos dessincronizados (demanda 215)

Investigação 100% só-leitura, `jsgrafica_saidas` + `jsgrafica_pedidos` + `jsgrafica_fechamento` +
`jsgrafica_vendas`. Nenhuma alteração de dado foi feita. Objetivo: mapear o terreno completo pro
PM planejar UMA correção final, sem mais rodadas de erro/reversão.

## Parte 1 — Repasses de recarga: 353 saídas no total, mas a maioria NÃO é fantasma

Busca por `categoria_id IN ('recarga_vem','recarga_cel')` OU `descricao ILIKE '%repasse
automático%'` OU `descricao ILIKE '%repasse (recriado%'`, sem filtro de data: **353 linhas,
R$31.243,78**. Esse número bruto **não deve ser lido como "R$31 mil de fantasma"** — quebrando por
origem:

### 1.1 — 243 saídas (R$23.563,88): importação histórica legítima, fora do escopo do bug

Todas com `operador='import'`, mesmo `created_at` exato (lote único), `data_dia` em **2025** (não
2026) — claramente parte da migração histórica da planilha pro Supabase (mesmo processo já
documentado nas demandas 042/044), de muito antes de existir pedido automático ou repasse
automático de recarga. Não tem como ser "fantasma" do bug da 188/213 — esse bug não existia em
2025. Reportado aqui só pra constar no "todo o histórico" pedido no escopo, não precisa de ação.

### 1.2 — 110 saídas criadas em julho/2026 (R$7.679,90) — a parte que interessa de verdade

Dentro dessas 110, um segundo lote de importação em massa (`operador='import'`, `created_at`
único `2026-07-02 22:31:32`, `descricao=null`, `conta_origem=null`), cobrindo `data_dia` de
24-04-26 a 30-06-26 — parece ser um catch-up de lançamentos reais de repasse de recarga dos meses
anteriores (abril-junho/2026), feito em lote em 02/07. **Também não tem assinatura do bug**
(sem descrição de "repasse automático", sem vínculo com pedido) — mais provável ser lançamento
manual retroativo de despesa real, não gerado pelo mecanismo automático questionado pela 213.

**O que sobra depois de tirar os 2 lotes de importação — as saídas com operador real (Edvam/Gabi/
Zu/Sistema) e assinatura do mecanismo automático/recriação manual — é bem menor:**

| Categoria | Qtd | Soma | Detalhe |
|---|---|---|---|
| **Fantasma já corrigido pelo PM hoje** (recriado com `conta_origem='recargapay'`, vinculado a pedido pago em Dinheiro/Cartão) | 9 | R$174,50 (~R$175,00) | ped-0565, ped-0712, ped-0742, ped-0911, ped-0877, ped-0918, ped-0985, ped-1045, ped-1109 |
| **🟠 Correção de rota — NÃO é fantasma sem tratamento** | 1 | R$100,00 | `id 55c45c7e-...`, 16-07-26, vinculado a `ped-1085` (Dinheiro) — ver correção abaixo (§1.1-bis) |
| **Legítimo (vinculado a pedido pago em Pix)** | 7 | R$215,00 | ped-0507, ped-0566, ped-0567, ped-0673, ped-0693, ped-0737, ped-0838 — repasse correto pela regra da 213, não deve ser tocado |
| **Sem vínculo de pedido, sem forma de pagamento verificável** | ~11 | ~R$424,50 | Valores recorrentes (5x R$19,60, R$68,00, R$9,50, R$67,50, R$125,00, "Repasse celular" R$39,20, e 1 com `conta_origem='recargapay'` mas sem descrição/vínculo, R$57,60) — **não dá pra classificar como fantasma ou legítimo só com o dado disponível**; parecem lançamentos manuais de rotina, não do mecanismo automático — reportar ao Edvam/PM se lembram do contexto de cada um antes de decidir |

### §1.1-bis — CORREÇÃO (feita durante a demanda 216, 2026-07-18): `55c45c7e-...` não é fantasma sem tratamento, é uma pendência entre contas reaberta

Ao investigar a demanda 216, cruzei este relatório com as demandas 200 e 201 (mecanismo de
`conta_origem`/pendência/transferência) e achei um erro na Parte 1 original: eu tinha classificado
`55c45c7e-...` (R$100, 16-07-26, `ped-1085`) como "fantasma NOVO, não corrigido, precisa de
`conta_origem='recargapay'` como as outras 9". **Isso está errado.** O relato da própria demanda
200 mostra que essa saída FOI corrigida no dia da criação (16-07-26), via o mecanismo
`corrigirContaOrigem` — só que pra `conta_origem='mercadopago'`, não `'recargapay'` (correto: o
repasse desse caso específico foi bancado pelo saldo do Mercado Pago, não pelo RecargaPay). SQL
confirma: `conta_origem='mercadopago'` desde `created_at 2026-07-16 20:17:43`, sem mudança até
hoje.

**O problema real é outro**: a demanda 201 testou o mecanismo de transferência exatamente com este
caso — relato da 201 diz que lançou a transferência real "Dinheiro Zu → Mercado Pago, R$100",
linkou via `pendencia_saida_id` a esta saída, e resolveu a pendência (`pendenciaResolvida`
preenchida, fechamento da Zu passou a descontar o R$100 de novo). O relato da 201 afirma
explicitamente que essa transferência "permanece no banco por ser genuína".

**Mas não permanece.** Consultei `jsgrafica_transferencias` inteira hoje (18-07-26): só existem 2
linhas, ambas de 17-07-26 (Caixa Econômica→RecargaPay R$109 e Mercado Pago→Dinheiro Gabi R$18) —
nenhuma referencia esta saída via `saida_id` nem `pendencia_saida_id`. Também não existe nenhuma
saída categoria `transferencia_entre_contas` ligada a este caso. **A transferência que a 201
documentou como criada e persistente não existe mais no banco.**

Não sei a causa (reversão manual do PM durante as correções de 18-07 mencionadas no contexto desta
215, um bug no cancelamento, ou outra explicação) — não investiguei além disso porque está fora do
escopo de leitura desta demanda e da 216. **O que isso muda na prática**: `55c45c7e-...` não
precisa do "mesmo tratamento das outras 9" (já tem `conta_origem` preenchido corretamente) — o que
precisa é o Admin decidir se lança de novo a transferência Dinheiro Zu → Mercado Pago R$100 (a
pendência está aberta de novo hoje) ou se investiga por que a anterior sumiu antes de repetir.
Total de "fantasma confirmado" cai de R$274,50 pra **R$174,50** (só as 9 já corrigidas) — o R$100
não é fantasma, é pendência entre contas em aberto.

**🟡 Achado que contradiz a própria alegação da demanda — reportando com evidência, não corrigindo
sozinho**: o contexto desta demanda cita "R$27,50 e R$20,00, `conta_origem` null, nunca tocadas"
como 2 saídas fantasma adicionais achadas em 10/07. Encontrei exatamente esses 2 valores
(`id d5db34db-...` R$20,00 e `id 6ea25b7e-...` R$27,50, ambos `conta_origem=null`) — **mas os dois
estão vinculados a pedidos pagos em PIX** (`ped-0673` e `ped-0693`), não Dinheiro/Cartão. Pela
regra da 213, repasse de recarga paga em Pix é **legítimo**, não fantasma — só falta preencher
`conta_origem='recargapay'` neles (um problema de categorização incompleta, não de saída
indevida). **Recomendo o PM reconferir a fonte dessa alegação específica** (o método deste
relatório assume que `forma_pagamento` do pedido reflete o que era verdade quando o repasse foi
gerado — se esse campo foi alterado depois, a conclusão muda).

### 1.3 — Total real de "fantasma confirmado" no repasse de recarga

**R$174,50 (9 saídas já corrigidas) é o total real de fantasma confirmado** — contra os R$175,00
que o PM já tinha tratado (diferença de R$0,50 é arredondamento do valor original, não um caso a
mais). **Correção (ver §1.1-bis)**: o R$100,00 de `55c45c7e-...` NÃO entra nessa soma — não é
fantasma sem tratamento, já tem `conta_origem='mercadopago'` correto desde 16-07-26; o que está em
aberto é a pendência entre contas (transferência resolvedora sumiu do banco, ver §1.1-bis).

## Parte 2 — Fechamentos "Sistema" dessincronizados: só 3 linhas em TODO o histórico

Calculei `saldo_anterior + resultado_dia` vs `saldo_acumulado` armazenado pra **toda** linha
`fechado_por='Sistema'` (não só as 6 que o PM já tinha olhado). Resultado: **só 3 linhas com
diferença > R$0,01 em toda a tabela**:

| Dia | Saldo anterior | Resultado dia | Saldo acumulado (gravado) | Calculado | Diferença | Situação |
|---|---|---|---|---|---|---|
| 06-07-26 | 0,00 | 0,00 | 1.168,89 | 0,00 | **R$1.168,89** | **Conhecido e intencional** — dia âncora da demanda 090 (zerar saldo acumulado, ancorar em 06/07 com o físico contado de verdade). Não é bug. |
| 08-07-26 | 1.320,67 | 215,06 | 2.009,75 | 1.535,73 | **R$474,02** | **Já investigado e explicado na demanda 131** — físico contado bateu exato com a soma de 4 contas reais checadas pelo Admin. Não é bug novo. |
| 10-07-26 | 2.213,89 | -1.907,05 | 424,41 | 306,84 | **R$117,57** | **🔴 Caso novo, real, ainda sem correção** — detalhe abaixo |

**Achado tranquilizador**: o problema de dessincronia NÃO está espalhado pelo histórico — é só
essa 1 linha nova (10/07) que precisa de correção. As outras 2 já eram conhecidas e já tinham
explicação válida.

### 2.1 — Causa confirmada do caso de 10/07 (não é só hipótese, testei)

A saída de R$1.915,00 (`id 485fd0e1-...`, "Pagamento cartão Mercado Pago da gráfica") foi criada
`2026-07-12 18:09:22`, **11 segundos depois** do `fechado_em` da linha (`2026-07-12 18:09:11`) —
exatamente a hipótese do contexto da demanda.

**Recalculei o `resultado_dia` de 10/07 ao vivo, direto das tabelas fonte** (saídas + pedidos
confirmados no dia, mesma régua da demanda 164): entradas R$578,80 − saídas R$2.485,85 =
**-R$1.907,05 — bate exatamente com o `resultado_dia` já gravado na linha.** Isso confirma o
mecanismo exato: **`resultado_dia` já foi recalculado/atualizado pra refletir a saída retroativa
de R$1.915 (provavelmente numa das correções manuais do PM hoje), mas `saldo_acumulado` nunca foi
recalculado em cima do `resultado_dia` novo** — ficou congelado no valor de antes da saída
retroativa entrar.

### 2.2 — O erro já se propagou pra 4 dias seguintes (achado novo, não estava no contexto)

Chequei a cadeia de `saldo_anterior` dos fechamentos "Sistema" seguintes — **o erro de R$117,57 já
está dentro do `saldo_acumulado` de 13, 14, 15 e 16/07** (cada um usa o `saldo_acumulado` errado
do dia anterior como seu próprio `saldo_anterior`, então o desvio de R$117,57 anda pra frente sem
mudar de valor, só se acumula na cadeia):

| Dia | Saldo anterior usado | Saldo acumulado gravado |
|---|---|---|
| 10-07-26 | 2.213,89 | **424,41** (deveria ser 306,84) |
| 13-07-26 | **424,41** ← herdou o erro | 849,32 (deveria ser 731,75) |
| 14-07-26 | 849,32 | 894,61 (deveria ser 776,04) |
| 15-07-26 | 894,61 | 245,65 (deveria ser 128,08) |
| 16-07-26 | 245,65 | 378,32 (deveria ser 260,75) |

17/07 e hoje (18/07) ainda não têm fechamento "Sistema" gravado — a correção, quando aplicada,
precisa recalcular 10/07 **e propagar a correção de -R$117,57 pra 13, 14, 15 e 16/07 também**
(mesmo padrão de propagação já visto antes na cadeia 10→13→14/07 de outra demanda).

## Tabela consolidada por dia (09/07 em diante — sem contaminação encontrada antes disso)

| Dia | Repasse fantasma de recarga | Fechamento Sistema dessincronizado |
|---|---|---|
| 06/07 | — | R$1.168,89 (conhecido/intencional, demanda 090) |
| 07/07 | R$45,00 sem forma de pagamento verificável (ped-0239) | — |
| 08/07 | — | R$474,02 (já explicado, demanda 131) |
| 09/07 | R$17,50 fantasma (já corrigido) | — |
| 10/07 | R$20,00 fantasma (já corrigido) + 2 valores (R$20/R$27,50) marcados como "fantasma" no contexto mas que meu cruzamento mostra como Pix-legítimos (só faltando `conta_origem`) | **R$117,57 (novo, causa confirmada, não corrigido — propagou pra 13-16/07)** |
| 13/07 | R$17,50 fantasma (já corrigido) | Herdou o erro de 10/07 |
| 14/07 | R$17,50 + R$22,50 fantasma (já corrigidos) | Herdou o erro de 10/07 |
| 15/07 | R$17,50 + R$10,00 fantasma (já corrigidos) | Herdou o erro de 10/07 |
| 16/07 | R$10,00 fantasma (já corrigido) + R$100,00 (não é fantasma — `conta_origem='mercadopago'` já correto, é pendência entre contas reaberta, ver §1.1-bis) | Herdou o erro de 10/07 |
| 17/07 | R$42,50 fantasma (já corrigido) | Sem fechamento Sistema ainda |

## Resumo pro PM planejar a correção final

1. **[CORRIGIDO em 18-07-26, ver §1.1-bis] `55c45c7e-...` NÃO é fantasma pendente** — já tem
   `conta_origem='mercadopago'` correto desde 16-07-26 (via demanda 200). O que está aberto é a
   **pendência entre contas**: a transferência que a demanda 201 documentou como criada e
   resolvendo essa pendência (Dinheiro Zu → Mercado Pago, R$100) não existe mais em
   `jsgrafica_transferencias` hoje — sumiu (causa não investigada, fora de escopo). PM decide: (a)
   lançar de novo a transferência, ou (b) investigar por que a anterior desapareceu antes de
   repetir.
2. **~11 saídas de recarga sem vínculo de pedido não puderam ser classificadas** — só o Edvam/PM
   podem dizer se lembram do contexto de cada uma antes de decidir.
3. **2 saídas (R$20/R$27,50 de 10/07) marcadas como fantasma no contexto da demanda parecem na
   verdade ser legítimas** (Pix) — só falta `conta_origem`, não são candidatas a exclusão. Confirmar antes de tratar como as outras 9.
4. **Fechamento de 10/07 precisa recalcular `saldo_acumulado` pra 306,84** (usando o
   `resultado_dia` já correto que está gravado) **e propagar -R$117,57 pra 13, 14, 15 e 16/07**.
5. **06/07 e 08/07 não precisam de nenhuma correção** — dessincronia conhecida e já explicada em
   demandas anteriores (090 e 131), não é o mesmo tipo de problema.
6. Nenhuma alteração foi feita — tudo acima é levantamento, a decisão de como corrigir é do PM/Edvam.
