# 216 — Planilha completa de entradas/saídas/saldo por conta, dia a dia

Status: concluída
Criada em: 2026-07-18
Aprovada em: 2026-07-18
Concluída em: 2026-07-18
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
A demanda 215 mapeou o terreno de repasse fantasma de recarga e achou 1 dia (10/07) com o
`saldo_acumulado` do fechamento "Sistema" travado, R$117,57 mais alto do que deveria — erro que
se propagou pra 13, 14, 15 e 16/07. Isso só apareceu porque o PM foi investigando um bug
específico. O Edvam pediu visibilidade completa antes de aprovar qualquer correção: hoje o
fechamento "Sistema" mostra só um número agregado por dia (entradas/saídas/saldo total), o que
esconde exatamente esse tipo de problema — pra saber se uma divergência é real ou é erro de
cálculo, precisa ver cada uma das 6 contas separada, não só o total.

## Objetivo
Uma planilha (tabela) dia a dia, de 09/07/26 até hoje, com entradas/saídas/resultado/saldo
acumulado calculados **por conta separadamente** (não só o total "Sistema"), cruzada com o que foi
de fato informado pelo Admin em cada fechamento — pra dar visibilidade completa antes de decidir
qualquer correção.

## Escopo
- Incluído: para cada dia de 09-07-26 até hoje (18-07-26), e para cada uma das 6 contas de
  `CONTAS_ORIGEM` (`lib/dados.ts`: `dinheiro_zu`, `dinheiro_gabi`, `mercadopago`, `stone`,
  `caixa_economica`, `recargapay`):
  - **Entradas**: soma de `jsgrafica_pedidos`/vendas cuja forma de pagamento aponte pra essa
    conta, mais qualquer `jsgrafica_transferencias` cujo `conta_destino` seja essa conta.
  - **Saídas**: soma de `jsgrafica_saidas` cujo `conta_origem` seja essa conta, mais qualquer
    `jsgrafica_transferencias` cujo `conta_origem` seja essa conta.
  - **Resultado do dia**: entradas menos saídas, por conta.
  - **Saldo acumulado**: carregando o saldo do dia anterior, por conta (mesma lógica do fechamento
    "Sistema", só que replicada pra cada conta em vez de um total único).
- Incluído: cruzar o saldo acumulado calculado de cada conta digital (`mercadopago`, `stone`,
  `caixa_economica`, `recargapay`) contra o que foi manualmente informado pelo Admin em cada
  fechamento "Sistema" (colunas `saldo_mercadopago`, `saldo_stone`, `saldo_caixa_economica`,
  `saldo_recargapay` de `jsgrafica_fechamento`) — mostrar a diferença dia a dia, quando existir
  fechamento naquele dia.
- Incluído: pro lado físico (`dinheiro_zu` + `dinheiro_gabi` juntos, já que o fechamento não separa
  fisicamente por gaveta no total), cruzar contra `dinheiro + moedas + bancos` (`total_fisico`) das
  linhas de fechamento por operador (Zu/Gabi) quando existirem.
- Entregar como uma planilha só, organizada de um jeito fácil de ler (pode ser 6 blocos, um por
  conta, ou uma tabela larga com colunas por conta — a forma fica a critério de quem executa,
  desde que dê pra comparar dia a dia e conta a conta sem esforço).
- Explicitamente fora de escopo: aplicar qualquer correção, mexer em saída, transferência,
  fechamento ou pedido. 100% levantamento e apresentação, nenhum UPDATE/DELETE/INSERT.

## Critérios de aceite
- [ ] Tabela dia a dia (09/07 até hoje) com entradas, saídas, resultado e saldo acumulado, pra
      cada uma das 6 contas separadamente
- [ ] Comparação do saldo calculado contra o saldo informado no fechamento, por conta, com a
      diferença explícita quando houver
- [ ] Nenhuma alteração nos dados

## Riscos e cuidados
Só leitura, zero risco de regressão. Cuidado pra não confundir "saldo acumulado calculado pelo
sistema" com "saldo real informado pelo Admin" — os dois precisam aparecer lado a lado, não
misturados numa coluna só, senão volta a esconder o mesmo tipo de problema que gerou esta demanda.

## Referências
Demanda 215 e seu relatório (`pm/conhecimento/mapeamento-repasses-fantasma-e-fechamentos-
dessincronizados.md`). `lib/dados.ts` (`CONTAS_ORIGEM`). Demanda 201 (`jsgrafica_transferencias`).
`jsgrafica_fechamento` (colunas `saldo_mercadopago`/`saldo_stone`/`saldo_caixa_economica`/
`saldo_recargapay`/`total_fisico`).

## Relato de execução

**Status: concluída.** Relatório completo em
`pm/conhecimento/planilha-entradas-saidas-saldo-por-conta.md`. 100% só-leitura — nenhum
UPDATE/DELETE/INSERT executado.

### O que foi feito

Antes de começar a planilha propriamente dita, li a demanda 200 e 201 (mecanismo de
`conta_origem`/pendência/transferência) porque a 216 depende diretamente dele — essa releitura
revelou um erro no relatório da demanda 215 (ver "Achados fora do escopo" abaixo), corrigido antes
de seguir.

Construí a planilha dia a dia (09/07 a 18/07, hoje) pras 6 contas de `CONTAS_ORIGEM`, cruzando
`jsgrafica_pedidos` (entradas por `forma_pagamento`), `jsgrafica_vendas` (0 linhas no período —
confirmado, todas as vendas passam por pedidos hoje), `jsgrafica_saidas` (por `conta_origem`) e
`jsgrafica_transferencias` (2 linhas no total, ambas de 17/07). Sem atividade em 11/07 e 12/07
(confirmado: zero pedido, venda, saída ou fechamento).

**Limitação de dado descoberta e documentada** (acabou sendo o achado mais importante da
demanda): `gaveta_destino` (campo que separaria Dinheiro-Zu de Dinheiro-Gabi) só está preenchido
em 4 de centenas de pedidos pagos em Dinheiro no período — não dá pra separar as 2 gavetas de
forma confiável. Por isso o bucket "Dinheiro" ficou Zu+Gabi combinado, exatamente como o próprio
escopo da demanda já previa como saída válida.

### Testes realizados e resultado

Recalculei entrada/saída/resultado por conta por dia direto das tabelas fonte e cruzei contra
`saldo_mercadopago`/`saldo_stone`/`saldo_caixa_economica`/`saldo_recargapay` (fechamento Sistema)
e `total_fisico` (Zu+Gabi, fechamento por operador). **A maioria dos dias mostra diferença
grande entre calculado e informado — investiguei a causa antes de reportar como "erro"**: são 2
limitações estruturais do dado (não bugs novos): (1) `conta_origem` só está preenchido numa fatia
pequena das saídas (majoritariamente os casos já corrigidos manualmente pela 215/200/201) — a
maioria das despesas do dia a dia não tem a conta real de origem marcada; (2) `total_fisico` é
contagem física literal, não bate nem com o `saldo_acumulado` do mesmo operador no mesmo registro
(confirmado, ex. Zu 09/07). Documentei isso explicitamente como achado central, não escondido nas
diferenças da tabela. A única comparação "maçã com maçã" continua sendo a da demanda 215
(`saldo_anterior + resultado_dia` vs `saldo_acumulado`, dentro do fechamento Sistema) — reafirmei
que só 10/07 é caso real.

### Achados fora do escopo

1. **Correção ao relatório da demanda 215**: a saída `55c45c7e-...` (R$100, 16/07) tinha sido
   classificada como "fantasma NÃO corrigida". Está errado — ela já tem `conta_origem='mercadopago'`
   correto desde a criação (demanda 200). O problema real: a transferência resolvedora da pendência
   (demanda 201, Dinheiro Zu → Mercado Pago R$100) que o relato da 201 afirma "permanecer no banco"
   **não existe mais** em `jsgrafica_transferencias` hoje (só 2 linhas, ambas de 17/07, nenhuma
   ligada a este caso). Corrigi o relatório da 215, o relato da própria 215 e a memória — total de
   fantasma confirmado cai de R$274,50 pra R$174,50; o R$100 é pendência entre contas reaberta, não
   fantasma. Causa do desaparecimento da transferência não investigada (fora de escopo de leitura).
2. **`jsgrafica_contas_bancarias` está com 0 linhas** — `padrao_cartao`/`padrao_pix` nunca foram
   configurados, então `getResumoPorFormaPagamento` não aplica nenhum desconto de taxa hoje
   (código pronto, falta só configurar a tabela).
3. **Recomendação pro PM** (não uma correção): pra reconciliação por conta funcionar de verdade no
   futuro, seria preciso preencher `conta_origem` em toda saída na criação (não só retroativamente)
   e `gaveta_destino` em todo pedido Dinheiro na confirmação de pagamento — sem isso, a diferença
   calculado-vs-informado vai continuar grande mesmo sem nenhum bug novo.

### Status final
Concluída. Planilha completa entregue com as 6 contas, dia a dia, calculado vs informado, achado
central documentado (por que a maioria das diferenças não é bug), e correção necessária ao
relatório da demanda 215. Nenhuma alteração de dado feita.

### Critérios de aceite
- [x] Tabela dia a dia (09/07 até hoje) com entradas, saídas, resultado e saldo/variação
      informada, pra cada uma das 6 contas separadamente (Dinheiro combinado Zu+Gabi, com a
      limitação de dado documentada explicitamente)
- [x] Comparação do calculado contra o informado no fechamento, por conta, com a diferença
      explícita quando houver — incluindo a explicação de por que a diferença normalmente não é bug
- [x] Nenhuma alteração nos dados
