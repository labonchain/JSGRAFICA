# Planilha completa — entradas/saídas/saldo por conta, dia a dia (demanda 216)

Investigação 100% só-leitura (`jsgrafica_pedidos`, `jsgrafica_vendas`, `jsgrafica_saidas`,
`jsgrafica_transferencias`, `jsgrafica_fechamento`). Nenhuma alteração de dado. Período: 09-07-26
até hoje (18-07-26). Nenhuma atividade em 11/07 e 12/07 (sem pedido, venda, saída ou fechamento
nesses 2 dias — provável fechado, sábado/domingo). Hoje (18/07) ainda sem fechamento gravado e sem
pedido confirmado até o momento da consulta.

## Como cada conta foi calculada

- **`jsgrafica_vendas` (histórico Sheets) tem 0 linhas em todo o período 09-18/07** — confirmado
  por contagem direta. Todas as vendas do período passam por `jsgrafica_pedidos`. Isso simplifica
  o cálculo (não precisa cruzar 2 fontes), mas também significa que a atribuição de operador por
  `jsgrafica_vendas.operador` (que seria a fonte mais confiável pra separar Zu/Gabi) não está
  disponível neste período.
- **Mercado Pago**: entrada = pedidos `forma_pagamento='Pix'` (valor bruto, sem desconto de taxa —
  `jsgrafica_contas_bancarias` está com 0 linhas, sem `padrao_pix`/`padrao_cartao` configurado, não
  dá pra aplicar taxa real) + `jsgrafica_transferencias.conta_destino='mercadopago'`. Saída =
  `jsgrafica_saidas.conta_origem='mercadopago'` + transferências `conta_origem='mercadopago'`.
- **Stone**: entrada = pedidos `forma_pagamento='Cartão'` (bruto). Saída = saídas/transferências
  com conta Stone.
- **RecargaPay**: entrada = pedidos `forma_pagamento='Pix RecargaPay'` + transferências destino.
  Saída = saídas/transferências com conta RecargaPay (majoritariamente repasse de recarga, ver
  demanda 215).
- **Caixa Econômica**: só recebe/perde valor via `jsgrafica_transferencias` no período — nenhum
  pedido aponta forma de pagamento pra essa conta.
- **Dinheiro (Zu+Gabi combinado)** — **não deu pra separar por gaveta individual, e isso é o
  achado mais importante desta planilha**: `gaveta_destino` (campo da demanda 196 que existe
  exatamente pra isso) só está preenchido em **4 dos 442+ pedidos pagos em Dinheiro do período**
  (todos os 4 em 17/07, `gaveta_destino='Zu'`). Sem esse campo preenchido na entrada, não existe
  outra forma confiável de saber se o dinheiro de um pedido em Dinheiro caiu na gaveta da Zu ou da
  Gabi — o dado simplesmente não foi capturado na hora. Por isso, o bucket "Dinheiro" desta
  planilha é **Zu+Gabi somados**, exatamente como o próprio escopo da demanda 216 já previa como
  saída aceitável ("já que o fechamento não separa fisicamente por gaveta no total"). Entrada =
  todos os pedidos `forma_pagamento='Dinheiro'` do dia (com ou sem `gaveta_destino`) +
  transferências com destino `dinheiro_zu`/`dinheiro_gabi`. Saída = saídas com `operador` IN
  (Zu, Gabi) E (`conta_origem` null OU igual à própria gaveta do operador — mesma regra de
  `getTotalSaidasOperador`, demanda 200) + transferências com origem `dinheiro_zu`/`dinheiro_gabi`.

## ⚠️ Achado central, antes da tabela: por que os números "não batem" na maioria dos dias

Cruzando o calculado com o informado, **quase todo dia mostra uma diferença grande** entre as
duas colunas (ver "Diferença" nas tabelas abaixo) — mas investigando a causa, **isso não é, na
maioria dos casos, sinal de erro de fechamento** (o único erro real já mapeado é o de 10/07, na
demanda 215). São 2 limitações estruturais do dado disponível hoje, não bugs novos:

1. **`conta_origem` está preenchido só numa fatia pequena das saídas** — majoritariamente as que
   já passaram por correção manual/auditada (repasses de recarga da 215, os 3 casos de teste das
   demandas 200/201). A imensa maioria das saídas do dia a dia (aluguel, insumos, compras,
   despesas gerais — ex.: R$2.438,35 em 8 saídas no dia 10/07, sozinhas, `operador=Edvam`,
   `conta_origem` null) **não tem a conta de origem real preenchida**, mesmo quando claramente
   saiu de uma conta digital específica (ex.: o pagamento de cartão do Mercado Pago de R$1.915,00
   no dia 10/07 está nesse bucket "sem conta_origem", não em "mercadopago"). Isso faz o lado
   "saída calculada" de cada conta digital ficar muito menor que a saída real.
2. **`total_fisico` é uma contagem física literal (dinheiro + moedas + bancos contados na hora),
   não um saldo calculado por fluxo** — ele já não bate com o próprio `saldo_acumulado` da mesma
   linha de fechamento do mesmo operador na maioria dos dias (ex.: Zu em 09/07,
   `saldo_acumulado=40,20` vs `total_fisico=85,55` — uma diferença de R$45,35 **dentro do mesmo
   registro**, sem nenhum pedido/venda calculado envolvido). Isso mostra que comparar um valor
   calculado só a partir de pedidos contra `total_fisico` dia a dia **não é uma comparação
   "maçã com maçã"** — troco reservado, caixa físico da loja (não só das gavetas Zu/Gabi) e outras
   entradas/saídas não capturadas em `jsgrafica_pedidos` fazem parte do `total_fisico` sem estarem
   no cálculo.

**Conclusão prática**: a única comparação hoje que é de fato "maçã com maçã" (mesmo conceito dos
2 lados) é `saldo_anterior + resultado_dia` vs `saldo_acumulado` **dentro da mesma linha de
fechamento "Sistema"** — que é exatamente o que a demanda 215 já fez, achando só 1 caso real
(10/07, R$117,57). As tabelas abaixo mostram o cálculo por conta como a demanda 216 pediu, mas a
"diferença" contra `saldo_stone`/`saldo_mercadopago`/etc. e contra `total_fisico` deve ser lida
como **"o quanto ainda não conseguimos explicar com o dado disponível"**, não como "erro
confirmado" — a causa mais provável, quase sempre, é `conta_origem` não preenchido, não um bug de
cálculo.

## Mercado Pago

| Dia | Entrada calc. | Saída calc. | Resultado calc. | Saldo informado (fechamento) | Variação informada | Diferença (variação − resultado) |
|---|---|---|---|---|---|---|
| 09/07 | 173,05 | 0,00 | +173,05 | 1.114,36 | — (1º dia da janela) | — |
| 10/07 | 259,30 | 0,00 | +259,30 | 0,00 | -1.114,36 | -1.373,66 |
| 11-12/07 | 0,00 | 0,00 | 0,00 | (sem atividade/fechamento) | — | — |
| 13/07 | 248,10 | 0,00 | +248,10 | 163,26 | +163,26 | -84,84 |
| 14/07 | 141,70 | 0,00 | +141,70 | 314,61 | +151,35 | +9,65 |
| 15/07 | 160,80 | 0,00 | +160,80 | 42,86 | -271,75 | -432,55 |
| 16/07 | 142,05 | 100,00 (repasse `55c45c7e`) | +42,05 | 94,84 | +51,98 | +9,93 |
| 17/07 | 273,35 | 38,56 (20,56 saída + 18,00 transferência p/ Dinheiro Gabi) | +234,79 | (sem fechamento Sistema em 17/07) | — | — |

## Stone

| Dia | Entrada calc. | Saída calc. | Resultado calc. | Saldo informado | Variação informada | Diferença |
|---|---|---|---|---|---|---|
| 09/07 | 46,10 | 0,00 | +46,10 | 236,61 | — | — |
| 10/07 | 78,40 | 0,00 | +78,40 | 86,40 | -150,21 | -228,61 |
| 13/07 | 20,35 | 0,00 | +20,35 | 50,11 | -36,29 | -56,64 |
| 14/07 | 24,80 | 0,00 | +24,80 | 92,23 | +42,12 | +17,32 |
| 15/07 | 43,60 | 0,00 | +43,60 | 0,97 | -91,26 | -134,86 |
| 16/07 | 12,50 | 0,00 | +12,50 | 0,97 | 0,00 | -12,50 |
| 17/07 | 97,70 | 4,65 | +93,05 | (sem fechamento Sistema) | — | — |

## Caixa Econômica

| Dia | Entrada calc. | Saída calc. | Resultado calc. | Saldo informado | Variação informada | Diferença |
|---|---|---|---|---|---|---|
| 09/07 | 0,00 | 0,00 | 0,00 | 594,00 | — | — |
| 10/07 | 0,00 | 0,00 | 0,00 | 0,00 | -594,00 | -594,00 |
| 13/07 | 0,00 | 0,00 | 0,00 | 232,00 | +232,00 | +232,00 |
| 14/07 | 0,00 | 0,00 | 0,00 | 182,00 | -50,00 | -50,00 |
| 15/07 | 0,00 | 0,00 | 0,00 | 0,00 | -182,00 | -182,00 |
| 16/07 | 0,00 | 0,00 | 0,00 | 109,00 | +109,00 | +109,00 |
| 17/07 | 0,00 | 109,00 (transferência p/ RecargaPay) | -109,00 | (sem fechamento Sistema) | — | — |

Esta conta só teve movimento calculável via a transferência da demanda 201 (17/07) — todo o resto
do saldo informado vem de saídas/entradas sem `conta_origem`/nenhum registro em
`jsgrafica_transferencias`, confirmando o achado central acima.

## RecargaPay

| Dia | Entrada calc. | Saída calc. | Resultado calc. | Saldo informado | Variação informada | Diferença |
|---|---|---|---|---|---|---|
| 09/07 | 0,00 | 17,50 | -17,50 | 105,67 | — | — |
| 10/07 | 0,00 | 20,00 | -20,00 | 52,50 | -53,17 | -33,17 |
| 13/07 | 0,00 | 17,50 | -17,50 | 25,68 | -26,82 | -9,32 |
| 14/07 | 0,00 | 40,00 (17,50+22,50) | -40,00 | 38,39 | +12,71 | +52,71 |
| 15/07 | 0,00 | 27,50 | -27,50 | 36,79 | -1,60 | +25,90 |
| 16/07 | 0,00 | 10,00 | -10,00 | 8,69 | -28,10 | -18,10 |
| 17/07 | 146,50 (37,50 Pix RecargaPay + 109,00 transferência recebida) | 100,10 (57,60+42,50) | +46,40 | (sem fechamento Sistema) | — | — |

Conta com a menor diferença relativa das 4 digitais — esperado, já que é a mais afetada
diretamente pelas correções da demanda 215 (repasse de recarga). Ainda assim, nenhum dia bate
exato — resíduo provável dos ~R$424,50 "indeterminados" que a 215 já tinha sinalizado.

## Dinheiro (Zu + Gabi combinado — ver limitação acima)

| Dia | Entrada calc. | Saída calc. | Resultado calc. | `total_fisico` Zu+Gabi | Variação informada | Diferença |
|---|---|---|---|---|---|---|
| 09/07 | 231,75 | 0,00 | +231,75 | 262,85 (177,30+85,55) | — | — |
| 10/07 | 241,10 | 27,50 (Gabi) | +213,60 | 282,70 (219,10+63,60) | +19,85 | -193,75 |
| 13/07 | 322,22 | 27,50 (Zu) | +294,72 | 357,85 (235,45+122,40) | +75,15 | -219,57 |
| 14/07 | 322,95 | 50,00 (Gabi) | +272,95 | 306,95 (222,20+84,75) | -50,90 | -323,85 |
| 15/07 | 655,15 | 0,00 | +655,15 | 300,75 (116,35+184,40) | -6,20 | -661,35 |
| 16/07 | 158,80 | 0,00 | +158,80 | 215,65 (62,35+153,30) | -85,10 | -243,90 |
| 17/07 | 211,75 (171,65+22,10 Dinheiro + 18,00 transferência p/ Gabi) | 51,50 (Zu) | +160,25 | 220,20 (136,60+83,60) | +4,55 | -155,70 |

A diferença aqui é grande e sistematicamente negativa todo dia — o calculado (baseado só em
pedidos) sempre "promete" muito mais dinheiro físico do que o `total_fisico` realmente mostra.
Given o achado central (item 2 acima), a explicação mais provável não é que o dinheiro sumiu, e
sim que `total_fisico` de Zu/Gabi é a contagem física da gaveta de cada uma (troco, fundo de caixa,
etc.), não um saldo que deveria crescer 1:1 com o valor bruto de pedidos em Dinheiro do dia — a
mesma divergência já aparece **dentro do próprio registro de cada operador** entre
`saldo_acumulado` (ledger) e `total_fisico` (contagem), sem nenhum cálculo meu envolvido (ex.: Zu
09/07: `saldo_acumulado=40,20` vs `total_fisico=85,55`).

## Cruzamento com a única comparação "maçã com maçã" (herdado da demanda 215)

Fechamento "Sistema": `saldo_anterior + resultado_dia` vs `saldo_acumulado` gravado — únicos 3
casos de divergência em todo o histórico, já detalhados na 215: 06/07 (R$1.168,89, intencional),
08/07 (R$474,02, já explicado), **10/07 (R$117,57, real, ainda sem correção, propagou pra 13-16/07
— ver `pm/conhecimento/mapeamento-repasses-fantasma-e-fechamentos-dessincronizados.md`)**.

## Achados fora do escopo original, mas relevantes pra decisão do PM

1. **`jsgrafica_contas_bancarias` está com 0 linhas** — `padrao_cartao`/`padrao_pix` nunca foram
   configurados. Isso significa que hoje o sistema não aplica NENHUM desconto de taxa (cartão/Pix)
   no `getResumoPorFormaPagamento` (a função já foi lida, o código está pronto pra isso, só falta
   configurar a tabela) — os valores "líquido" mostrados no Financeiro/Dashboard hoje são iguais
   ao bruto. Fora do escopo desta demanda corrigir, só reportando o achado.
2. **A saída de repasse fantasma `55c45c7e-...` (R$100, 16/07) e a pendência entre contas
   associada foram reclassificadas durante esta demanda** — ver correção feita no relatório da
   demanda 215 (`pm/demandas/215-...md`, seção "CORREÇÃO 2026-07-18") e no próprio
   `mapeamento-repasses-fantasma-e-fechamentos-dessincronizados.md` (§1.1-bis): não é fantasma sem
   tratamento, é uma pendência entre contas reaberta (a transferência resolvedora da demanda 201
   sumiu do banco).
3. **Recomendação pro PM** (não uma correção, só observação): se a meta é ter reconciliação real
   por conta no futuro, os 2 achados centrais acima (item "achado central") indicam que seria
   preciso (a) preencher `conta_origem` em TODA saída no momento da criação, não só
   retroativamente pros casos encontrados por auditoria manual, e (b) preencher `gaveta_destino`
   em todo pedido pago em Dinheiro na hora da confirmação de pagamento, não só quando alguém lembra
   de fazer manualmente (hoje só 4 de centenas têm o campo preenchido). Sem isso, qualquer
   comparação "calculado vs informado" por conta vai continuar mostrando diferenças grandes que não
   são bugs, só dado faltando.
