# 335 - Auditoria financeira real de agosto/2026: entrada, saída e lucro por operação

Status: concluída
Criada em: 2026-08-27
Aprovada em: 2026-08-27
Concluída em: 2026-08-27
Chat executor: 05 - FINANCEIRO JS GRAFICA

Pedido direto do Edvam: entender por que existe tanta divergência no financeiro, respondendo 3
perguntas objetivas pra agosto/2026 até hoje (27/08): quanto entrou, quanto saiu, e quanto ficou
de lucro, discriminado por operação (não só um número agregado do mês).

Relacionado a 2 achados ainda em aberto que provavelmente fazem parte da explicação:
- Achado do próprio 05-Financeiro (relatado hoje, ainda sem demanda numerada antes desta):
  discrepância entre os "gaps" de lançamento interno e o extrato real do Mercado Pago em
  mar-jun/26 — indica lançamento faltando, não meses sem movimento real. Se o mesmo padrão
  existir em agosto, é candidato a explicar parte da divergência.
- R$400 (`ped-1029`, Dizu Refeições) contando como receita da gráfica por engano, ainda não
  corrigido (achado da demanda 257).

## Objetivo
Responder as 3 perguntas com dado real (Supabase + extrato real do Mercado Pago via API, não por
memória nem por número já calculado em tela), quebrado por operação/dia, pra agosto/2026 até
27/08:
1. Quanto entrou (todas as formas de recebimento: dinheiro, cartão, Pix, Pix RecargaPay).
2. Quanto saiu (todas as saídas registradas).
3. Quanto ficou de lucro por operação (não só o agregado do mês).

## Escopo
- Incluído: agosto/2026 até 27/08, todas as 6 contas rastreadas pelo negócio, cruzamento contra
  extrato real do Mercado Pago onde aplicável.
- Explicitamente fora de escopo: corrigir os achados que a auditoria revelar (relatar pro PM,
  cada correção vira demanda própria pro chat certo, como já é o padrão do projeto).

## Riscos e cuidados
É levantamento, não correção — não alterar nenhum dado durante a auditoria. Separar claramente
padrão confirmado com dado real vs. hipótese ainda não fechada.

## Referências
`jsgrafica_pedidos`/`_vendas`/`_saidas`/`_fechamento`/`_transferencias`, extrato real do Mercado
Pago (API), achado de mar-jun/26 relatado hoje pelo próprio 05-Financeiro, demanda 257 (R$400
Dizu), demanda 313 (Financeiro "ainda dá bug e não é claro", relatada pelo Edvam, aguardando).

## Relato de execução

**Achado principal (causa raiz confirmada, não hipótese): a "divergência" que o Edvam vê no
Financeiro não é dinheiro sumido, é o total do mês na tela ficando desatualizado depois que a
conciliação classifica uma entrada avulsa em dia já fechado.** Explicado no item 4.

Método: as 3 perguntas foram respondidas com SQL direto contra `jsgrafica_pedidos` (fonte real de
venda), `jsgrafica_entradas_avulsas` (outras entradas, mecanismo da 226/269) e `jsgrafica_saidas`
(excluindo `transferencia_entre_contas`, mesma regra corrigida nas demandas 262/263 — transferência
entre contas próprias não é custo real). Nenhum número foi herdado de tela já calculada; tudo
reconferido do zero contra as tabelas-fonte. Período: 01 a 27/08/2026 (hoje).

### 1. Quanto entrou

| Fonte | Valor |
|---|---|
| Pedidos confirmados (`jsgrafica_pedidos`, `pagamento_confirmado_at`) | R$14.175,14 |
| Entradas avulsas (`jsgrafica_entradas_avulsas`, outras entradas) | R$2.932,22 |
| **Total real** | **R$17.107,36** |

Por forma de pagamento (só pedidos): Dinheiro R$4.859,05 · Pix R$5.262,40 · Cartão R$2.796,39 ·
Pix RecargaPay R$1.194,80.

### 2. Quanto saiu

**R$12.858,85** (`jsgrafica_saidas`, excluindo transferência entre contas próprias).

### 3. Lucro por operação (dia a dia, não só o agregado do mês)

| Dia | Entrada | Saída | Resultado | Nota |
|---|---|---|---|---|
| 03-08 (seg) | 1.754,77 | 279,52 | **+1.475,25** | |
| 04-08 (ter) | 2.382,00 | 242,79 | **+2.139,21** | |
| 05-08 (qua) | 690,35 | 499,14 | +191,21 | |
| 06-08 (qui) | 480,80 | 223,05 | +257,75 | |
| 07-08 (sex) | 846,70 | 877,98 | **-31,28** | saída normal do dia, sem item fora do padrão |
| 10-08 (seg) | 3.020,99 | 3.147,50 | **-126,51** | saída R$2.959 = "Pagamento Cartões" (liquidação de cartão via MP), bate com pico de venda de cartão de balcão do próprio dia (R$2.348,89, 2 vendas reais de balcão R$1.437,49+R$900) |
| 11-08 (ter) | 694,45 | 230,76 | +463,69 | |
| 12-08 (qua) | 547,40 | 175,07 | +372,33 | |
| 13-08 (qui) | 522,95 | 232,65 | +290,30 | |
| 14-08 (sex) | 751,85 | 648,98 | +102,87 | |
| 17-08 (seg) | 724,45 | 2.116,83 | **-1.392,38** | Aluguel (casa) R$1.300 pago neste dia |
| 18-08 (ter) | 428,05 | 753,74 | **-325,69** | conta de energia/placa solar R$611,26 paga neste dia |
| 19-08 (qua) | 594,40 | 335,74 | +258,66 | |
| 20-08 (qui) | 576,50 | 276,60 | +299,90 | |
| 21-08 (sex) | 708,15 | 694,46 | +13,69 | |
| 24-08 (seg) | 611,25 | 557,18 | +54,07 | |
| 25-08 (ter) | 605,85 | 929,51 | **-323,66** | Aluguel (impressora) R$600 pago neste dia |
| 26-08 (qua) | 656,15 | 279,31 | +376,84 | |
| 27-08 (qui) | 510,30 | 358,04 | +152,26 | |

Sábados e domingos (01,02,08,09,15,16,22,23) sem pedido/venda lançada — gráfica fechada nesses
dias, confirmado que é padrão real (não gap de lançamento, ver item 5).

**Resultado do mês até 27/08: R$17.107,36 - R$12.858,85 = R$4.248,51 de lucro operacional bruto**
(entradas menos saídas, sem separar o que é distribuição de sócio vs. custo real — ver ressalva
no fechamento do custo fixo mensal, respondido antes desta demanda no chat).

Todo dia negativo tem explicação nomeada e verificada (aluguel, conta de energia, liquidação de
cartão) — nenhum é "sumiço" sem causa. Isso já responde a maior parte da sensação de "divergência
grande" olhando dia a dia: são pagamentos reais e pontuais, não um padrão de perda diária.

### 4. Causa raiz da divergência (achado principal, confirmado com evidência real)

A tela que o Edvam vê (Financeiro → Fluxo de Caixa) soma `jsgrafica_fechamento.total_entradas`
das linhas `fechado_por='Sistema'` (`app/api/dashboard/route.ts` linhas 152-166 e 241-242) — não
recalcula do zero. Achei 2 problemas reais nessa mecânica, os dois confirmados com dado real, não
suposição:

**4a. 3 dias de agosto nunca ganharam a linha "Sistema" (visão geral), embora Gabi e Zu tenham
fechado o próprio caixa normalmente nesses dias**: 10-08, 11-08 e 21-08 (confirmado via
`jsgrafica_fechamento` — só existem as linhas `Gabi`/`Zu`, nenhuma `Sistema`). Isso significa que
o total do mês mostrado na tela **exclui esses 3 dias inteiros**, mesmo tendo movimento real
neles (juntos, R$4.423,59 de entrada e R$4.072,72 de saída ficam de fora do "Resumo" do período).
Boa notícia: o próprio dashboard já tem um mecanismo pra detectar exatamente isso
(`saudeCaixa.diasSemFechamento`, linhas 294-309 do mesmo arquivo) — o problema não é a detecção,
é que aparentemente ninguém fechou o "Sistema" (visão geral) nesses 3 dias específicos, e não
achei nesta auditoria (fora do escopo, é levantamento) o motivo exato de por que o fechamento
geral não rodou/foi salvo nesses 3 dias enquanto os individuais rodaram.

**4b. Ainda mais impactante: quando a conciliação automática classifica um item de dia JÁ
fechado, o total daquele dia na tela não é atualizado — fica congelado no valor de quando o
"Fechar Caixa" foi clicado.** Prova real: a linha `Sistema` de 03-08 e 04-08 foi fechada em
**10/08 às 13:32** (fechamento retroativo em lote, não no próprio dia) com `total_entradas`
R$763,05 e R$929,00 — batendo só com os pedidos daqueles dias. As entradas avulsas desses mesmos
dias (R$1.091,72 em 03-08, R$1.716,00 em 04-08 — a maior parte delas classificações reais de Pix
recebido no Mercado Pago sem pedido correspondente) só foram criadas em **12 e 13/08**, dias
DEPOIS do fechamento já ter sido salvo. Resultado: esse dinheiro real, já classificado e
confirmado pelo Edvam na conciliação, nunca aparece no total do mês que a tela mostra, porque o
snapshot do dia já estava congelado antes da classificação existir. Esse padrão se repete pra
praticamente toda a primeira semana de agosto (a classificação em lote das pendências de
conciliação aconteceu nos dias 12-13/08, depois que vários dias já tinham sido fechados).

Isso **não é um bug novo** — já está mapeado no backlog conhecido (`CLAUDE.md` do projeto,
"Mecanismo de recálculo de fechamento quando um item de conciliação de dia já fechado é
classificado tarde", desenhado mas ainda sem demanda numerada). Esta auditoria não inventa o
problema, mas agora tem prova quantificada de que ele é real e relevante: sozinho, ele já explica
grande parte de por que o total que o Edvam vê na tela não bate com o dinheiro real. Recomendo
virar demanda numerada de correção pro 03-APP — sem isso, qualquer conciliação futura vai
continuar "sumindo" do total do mês.

### 5. Cruzamento com pista das demandas 313/257 (fora ou descartada do escopo de agosto)

- **R$400 do Dizu (ped-1029)**: confirmado, é de **15/07/2026**, fora da janela de agosto.
  Continua um achado real (demanda 257), mas não contamina os números desta auditoria.
- **Padrão mar-jun/26 (gap de lançamento vs. Mercado Pago contínuo) NÃO se repete em agosto** —
  os únicos dias sem pedido lançado são sábado/domingo, e são dias de loja fechada de verdade, não
  lançamento faltando. Confirmado cruzando com o extrato real do Mercado Pago (API,
  `buscarPagamentos`, aprovados por dia): há sim pagamentos aprovados via MP em alguns
  sábados/domingos (01,08,09,16,23/08 — R$8,40 / R$2.693,77 / R$2.959,00 / R$152,00 / R$2,40), o
  que é esperado (cliente paga um Pix pendente pelo lembrete automático mesmo com a loja fechada,
  ou é liquidação/repasse de venda de cartão de dia anterior — o caso de 09/08, R$2.959,00, bate
  em valor exato com a saída "Pagamento Cartões" registrada em 10-08) — não indica lançamento
  faltando, é o dinheiro do pedido de um dia útil sendo processado/liquidado em outro dia.
- Extrato real do Mercado Pago para agosto inteiro (aprovados, 01 a 27/08): **R$16.206,10**. Não é
  comparável 1:1 com o "quanto entrou" da pergunta 1 (aquele número mistura pedidos com Pix
  direto, liquidação de cartão em lote, e parte das entradas avulsas classificadas como
  `mercadopago_pagamento` também aparecem nesse extrato) — decompor essa reconciliação linha a
  linha é o que a tela de Conciliação já faz operacionalmente; não refiz esse trabalho aqui por
  estar fora do escopo desta demanda (levantamento, não correção/reconciliação linha a linha).

### Risco de controle nomeado (fora do escopo pedido, mas relevante)

O fechamento "Sistema" (visão geral) de 03-08/04-08 foi feito em lote, retroativo, dias depois do
dia real (10/08) — não achei quem fez nem por quê (fora do escopo desta auditoria). Fechamento
retroativo em lote é um padrão que já apareceu antes neste projeto (mar-jun/26). Vale nomear como
risco de controle: se "fechar o caixa" pode acontecer dias depois do dia real, sem alguém
questionar, o valor do fechamento deixa de ser uma confirmação factual do dia e vira só um
registro tardio — o oposto do que o processo deveria garantir.

### O que fica pro PM decidir

1. Abrir demanda formal pro 03-APP: recalcular/atualizar `jsgrafica_fechamento.total_entradas`
   quando uma entrada avulsa é classificada em dia já fechado (item 4b, maior achado desta
   auditoria).
2. Investigar por que "Sistema" não fechou em 10, 11 e 21/08 mesmo com Gabi/Zu fechando normal
   (item 4a).
3. Nenhuma correção foi aplicada agora — é levantamento, conforme escopo. Nenhum dado foi
   alterado.
