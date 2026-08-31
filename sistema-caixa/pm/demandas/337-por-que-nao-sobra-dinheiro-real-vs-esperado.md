# 337 - Por que o saldo real nunca bate com o que o sistema esperava (agosto/2026)

Status: concluída
Criada em: 2026-08-27
Aprovada em: 2026-08-27
Concluída em: 2026-08-27
Chat executor: 05 - FINANCEIRO JS GRAFICA

Pergunta direta do Edvam, depois de ver o lucro calculado (335/336, R$4.248,51 no período): "eu
preciso entender o pq chega no final do mes e nao tem dinheiro e a conta n fecha nunca sobra o
que diz no sistema". Isso é uma pergunta diferente de "quanto entrou/saiu/lucrou" (já respondida)
— é sobre **saldo real disponível não bater com o saldo que o sistema esperava ter**.

O sistema já rastreia exatamente essa comparação todo dia: `jsgrafica_fechamento.saldo_acumulado`
(esperado pelo sistema) vs. `total_fisico`/`dinheiro`/`moedas`/`bancos` (contado/informado de
verdade pelo Admin) vs. `divergencia` (a diferença entre os dois). A 335/336 não olharam esse
ângulo especificamente — focaram em entrada/saída/lucro do período, não na divergência diária
entre esperado e contado.

## Objetivo
Explicar, com dado real e evidência (mesma disciplina das 335/336), por que existe uma
divergência recorrente entre o saldo que o sistema espera e o dinheiro real disponível/contado no
fim do mês. Concretamente:
1. Puxar a coluna `divergencia` de `jsgrafica_fechamento` (linhas `Sistema`) dia a dia de
   agosto/2026, e mostrar o padrão (cresce, some, é sempre pra um lado?).
2. Pra cada dia com divergência relevante (não perseguir centavo, focar nas grandes/recorrentes),
   investigar a causa concreta: caixa físico não depositado/contado errado, gasto informal
   (dinheiro saindo sem virar `jsgrafica_saidas`), saldo digital que ainda não foi sacado (Pix/
   cartão ficando "preso" no Mercado Pago/Stone em vez de virar dinheiro disponível de verdade),
   ou outra causa concreta que aparecer.
3. Deixar claro pro Edvam a diferença entre **lucro no papel** (o que a 335/336 calculou:
   receita menos despesa registrada) e **saldo real disponível** (o que ele sente no bolso/conta
   no fim do mês) — são 2 coisas diferentes por natureza, e a pergunta dele é sobre a segunda.

## Escopo
- Incluído: agosto/2026 até 27/08, coluna `divergencia` das linhas `Sistema` do fechamento, mais
  qualquer tabela necessária pra explicar a causa de cada divergência relevante.
- Explicitamente fora de escopo: corrigir qualquer coisa (é levantamento, mesma disciplina das
  335/336).

## Riscos e cuidados
Não alterar nenhum dado. Se a causa de uma divergência específica não puder ser confirmada com
evidência real, dizer isso explicitamente como hipótese, não apresentar como fato.

## Referências
`pm/demandas/335-auditoria-financeira-agosto-2026.md`,
`pm/demandas/336-analise-minuciosa-pedidos-saidas-agosto.md`, `jsgrafica_fechamento`
(`saldo_acumulado`/`total_fisico`/`divergencia`/`saldo_mercadopago`/`saldo_stone`/
`saldo_caixa_economica`/`saldo_recargapay`).

## Relato de execução

### O que é "divergência" de verdade (lido direto no código, `app/api/fechamento/route.ts`)

`divergencia = total_fisico (informado no fechamento: soma das 4 contas digitais + dinheiro +
moedas contados de verdade) − saldo_acumulado (esperado: soma de todo total_entradas−total_saidas
já registrado no sistema, desde 06/07, encadeado dia a dia)`.

**Achado estrutural mais importante (explica por que a divergência nunca se corrige sozinha)**:
`saldo_acumulado` de um dia usa o `saldo_acumulado` do dia anterior como base (`getSaldoAnterior`,
`lib/supabase-admin.ts` linha 98) — **nunca o `total_fisico` contado de verdade**. Ou seja: o
"esperado" do sistema é um cálculo cego, só soma entrada/saída que alguém registrou, e **nunca é
recalibrado pelo dinheiro real contado no fechamento**, mesmo quando a diferença é enorme e
visível todo dia. Qualquer dinheiro que se mova sem virar `jsgrafica_saidas`/`entradas`/
`transferencias` (empréstimo informal, gasto não lançado, repasse pra terceiro) vira uma dívida
permanente no "esperado" — ela nunca cicatriza sozinha, só continua entrando no cálculo dos dias
seguintes pra sempre.

### 1. Padrão da divergência em agosto/2026 (e julho, pra contexto de quando começou)

| Período | Divergência |
|---|---|
| 06/07 a 23/07 | pequena, oscilando perto de zero (0 a -172, uma vez +127) — sistema batendo |
| **24/07** | **salto pra -1.896,14 num único dia** — nunca mais voltou perto de zero |
| 27/07 a 31/07 | -1.950 a -2.508, sempre negativo, mesma faixa |
| 03/08 a 27/08 (agosto inteiro) | oscila entre -1.675 e -3.927, **hoje (27/08): -3.223,80** |

**Hoje o sistema "espera" ter R$3.947,75 acumulado desde que começou (06/07), mas o que existe
contado de verdade (caixa físico + Mercado Pago + Stone + Caixa Econômica + RecargaPay) é só
R$723,95.** A diferença de R$3.223,80 é o que "some" na sensação do Edvam.

### 2. Causa concreta do salto de 24/07 (achado real, não hipótese)

No dia 24/07, a gráfica **pagou R$1.808,26 da fatura de cartão Nubank da "Dizu Refeições"**
(categoria "CARTÃO DE CRÉDITO", descrição literal "Baixa de conta a pagar: CARTÃO NUBANK - DIZU
REFEIÇÕES"), consolidando dinheiro de 3 contas diferentes pra dentro do Mercado Pago só pra cobrir
esse pagamento (transferências reais do mesmo dia: Zu R$890 + Caixa Econômica R$553×2 + Stone
R$200×2, descrição "parte do financiamento do pagamento dos cartões Nubank do dia 24/07 —
confirmado pelo Edvam"). No mesmo dia entrou R$945,00 (pedido "Dizu Refeiçoes (pagamento cartão)",
dinheiro) como repasse de volta.

**Esse é o dia exato em que a divergência salta e nunca mais volta perto de zero** — e ele coincide
com um evento real, nomeado, fora do padrão diário normal (entrada R$6.178,35 e saída R$5.554,59
naquele dia, 8-10x o normal de qualquer outro dia de agosto).

**Rastreei toda menção real a "Dizu" no sistema desde que o sistema atual começou**:

| Data | Direção | Valor | Descrição |
|---|---|---|---|
| 15/07 | entrada | R$400,00 | "Recebimento de empréstimo" (Dizu emprestou pra gráfica, usado no aluguel do mesmo dia) |
| 24/07 | **saída** | **R$1.808,26** | Fatura cartão Nubank da Dizu, paga pela gráfica |
| 24/07 | entrada | R$945,00 | Repasse da Dizu pro pagamento do cartão |
| 03/08 | entrada | R$829,00 (615+214) | Dizu repassou "pra pagar fatura cartão Carrefour" via Pix pro Mercado Pago |

Entrada identificável ligada à Dizu: R$2.174,00. Saída identificável: R$1.808,26. **Não achei
nenhuma saída real registrada pagando a fatura do Carrefour que os R$829,00 de 03/08 deveriam
cobrir** — esse valor entrou mas não achei o pagamento correspondente saindo. Não dá pra afirmar
com certeza total se esse dinheiro ainda está "devendo" ser usado ou se foi usado sem registrar
(fora do escopo desta demanda reconstituir a relação financeira completa com a Dizu — acender isso
como achado pro PM decidir se vale demanda própria, é dinheiro real de terceiro passando pelo caixa
da gráfica).

### 3. Lucro no papel × saldo real disponível — a diferença que o Edvam está sentindo

São 2 números diferentes por natureza, calculados de jeitos diferentes:

- **Lucro no papel (335/336): R$4.248,51.** É "quanto entrou registrado menos quanto saiu
  registrado" no período — só olha o FLUXO do mês, não o estoque acumulado nem o que está
  fisicamente disponível.
- **Saldo real disponível hoje: R$723,95** (contado de verdade em todas as contas + caixa).
- **Saldo que o sistema "acha" que deveria existir, somando tudo desde 06/07: R$3.947,75.**

O lucro do mês é real (recontado do zero na 335/336, bate com as tabelas fonte). O problema não é
que o mês não deu lucro — é que o **saldo acumulado esperado desde o início do sistema** carrega
uma dívida de R$3.223,80 que nunca foi explicada/zerada, a maior parte dela nascida num evento
concreto (financiamento do cartão da Dizu em 24/07) e o resto é deriva estrutural (o "esperado"
nunca se recalibra pelo contado, ponto 1) — inclusive parte do mesmo problema já achado na 335
(entrada avulsa classificada tarde em dia já fechado nunca entra no `saldo_acumulado` seguinte,
porque a cadeia usa sempre o `saldo_acumulado` anterior, nunca reprocessa).

### Causas descartadas / não confirmadas

- **Não é caixa físico não depositado** — o `total_fisico` já soma dinheiro físico contado, e ele
  é consistentemente MENOR que o esperado, não maior (não é dinheiro parado sem depositar).
  Descartado como causa principal.
- **Saldo digital "preso" sem virar disponível**: não é o caso — os saldos digitais (Mercado Pago/
  Stone/Caixa Econômica/RecargaPay) já entram no `total_fisico` do dia como informados, então já
  estão contados no lado "real". Não é uma causa separada, é o oposto: mesmo contando tudo, ainda
  falta R$3.223,80.
- **Gasto informal sem lançar saída**: plausível e parcialmente evidenciado (o caso Dizu é
  exatamente esse tipo de movimento cruzando negócios sem lançamento simétrico completo), mas não
  consegui provar cada real da diferença — só o suficiente pra confirmar que é um padrão real, não
  hipótese solta.

## Fica pro PM

1. **Achado estrutural (o mais importante desta demanda)**: `saldo_acumulado` nunca se recalibra
   pelo `total_fisico` contado — é um desenho que garante que qualquer erro/gasto não lançado vira
   dívida permanente na divergência. Vale decisão de produto: criar um mecanismo de "recalibrar"
   o saldo esperado a partir de uma contagem física confirmada (não é bug, é ausência de
   funcionalidade — decisão do Edvam/PM, não uma correção óbvia).
2. Considerar reabrir a relação financeira com a Dizu Refeições como demanda própria — há dinheiro
   real de terceiro passando pelo caixa da gráfica de forma recorrente (15/07, 24/07, 03/08) sem
   reconciliação clara ponta a ponta.
3. Já reportado na 335/336: recalcular fechamento quando conciliação classifica tarde; investigar
   ausência de fechamento "Sistema" em 10/11/21-08; considerar cadastrar custo de produto.
4. Nenhum dado alterado (levantamento).
