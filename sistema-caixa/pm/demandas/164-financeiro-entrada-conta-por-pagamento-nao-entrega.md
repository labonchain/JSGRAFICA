# 164 — Financeiro: contar entrada pelo pagamento confirmado, não pelo status de entrega

Status: concluída
Criada em: 2026-07-13
Aprovada em: 2026-07-13
Concluída em: 2026-07-14
Chat executor: 03 - APP JS GRAFICA

## Contexto
No fechamento de caixa de 13/07 (feito com o PM), foi confirmado dinheiro (Pix/cartão/dinheiro)
já recebido de vários pedidos que nunca apareceram em "Entradas" nem entraram em nenhum
fechamento — porque `GET /api/entradas` (`app/api/entradas/route.ts`) filtra pedidos por
`status = 'entregue'` (`.gte('data_entregue_at', ...)`), não pelo pagamento. Um pedido "pronto"
ou "em produção" com `pagamento_confirmado = true` é dinheiro real já em caixa, mas o sistema só
conta essa entrada no dia em que alguém lembrar de marcar "entregue" — o que pode nunca acontecer
(achado do dia: 33 pedidos de até uma semana atrás, ainda sem entrega marcada, alguns já pagos).
**Decisão do Edvam, verbatim**: "o sistema deve contar no financeiro tudo que foi recebido
independente do status do pedido."

## Objetivo
"Entradas" (e o cálculo de fechamento que depende dela) passa a contar pedidos pelo momento em
que o pagamento foi confirmado, não pelo status de entrega.

## Escopo
- Incluído: trocar o filtro de `app/api/entradas/route.ts` (e qualquer outro lugar que use a
  mesma lógica pra somar entrada de pedido — ex. `getResumoDia`/dashboard, se existir cálculo
  equivalente) de `status = 'entregue' + data_entregue_at` para `pagamento_confirmado = true +
  pagamento_confirmado_at` dentro da janela do dia.
- Migração de comportamento: pedidos JÁ entregues no passado continuam contando pela
  `data_entregue_at` deles hoje — ao trocar a fonte de verdade pra `pagamento_confirmado_at`,
  confirmar que esse histórico não muda de dia (idealmente os dois timestamps já coincidem pra
  pedido "normal", mas checar pedidos onde pagamento e entrega aconteceram em dias diferentes).
- Explicitamente fora de escopo: mexer na tela de Pedidos/Fila de impressão (isso é sobre
  contagem financeira, não sobre o fluxo operacional do pedido). Resolver o backlog de pedidos
  antigos sem pagamento confirmado (isso é operacional, não desta demanda).

## Critérios de aceite
- [ ] Um pedido "em produção"/"pronto" com pagamento confirmado HOJE aparece em "Entradas" de
      hoje, mesmo sem ter sido marcado "entregue"
- [ ] Um pedido "entregue" continua contando (não duplica, não desaparece) depois da mudança
- [ ] Fechamento de caixa (cálculo de `total_entradas`) reflete a mesma regra nova
- [ ] Testado com um pedido real criado e pago mas não entregue, e um pedido antigo já entregue

## Riscos e cuidados
Essa mudança pode reabrir a pergunta de "qual dia contar" quando pagamento e entrega acontecem em
dias diferentes (ex. pago hoje, retirado semana que vem) — o critério já foi decidido pelo Edvam
(conta no dia do pagamento), só documentar isso claramente no código pra não virar dúvida de
novo. Ver também a demanda 165 (data do pagamento manual sempre "hoje") — as duas juntas.

## Referências
`app/api/entradas/route.ts`, `app/api/fechamento/route.ts`. Fechamento de 13/07 (conversa com o
PM) onde o problema foi descoberto — pedido do Veronildo (ped-0810) foi o gatilho.

## Relato de execução
Executada em 2026-07-14 (03 - APP JS GRAFICA, Fable 5), junto com a 165 (mesma régua). Deploy do
lote `dpl_Dikvv1SRkuYKFAPTJzR3W98RU32q`, verificado em produção.

### O que foi feito
1. **Coluna gerada `data_entrada_caixa`** em `jsgrafica_pedidos` (migration
   `add_data_entrada_caixa_pedidos_164` + índice parcial): `COALESCE(pagamento_confirmado_at,
   data_entregue_at, created_at)` — a régua inteira num lugar só. O fallback é o que preserva o
   histórico: **234 pedidos pagos antigos não têm `pagamento_confirmado_at`** (o INSERT do balcão
   nunca gravava) e continuam contando pelo dia da entrega, como sempre contaram.
2. **Filtro novo em TODOS os pontos de soma**: `pagamento_confirmado = true AND status <>
   'cancelado'` (cancelado fora, regra da 157) + janela por `data_entrada_caixa`. Pontos:
   `getResumoDia` (fechamento/diagnóstico/dashboard-hoje), `getResumoPorFormaPagamento`
   (discriminação do Fechar Caixa), `getTotalDinheiroRecebidoOperador` (gaveta do operador — o
   dinheiro entra na gaveta no PAGAMENTO), `GET /api/entradas` (linha a linha, horário =
   data_entrada_caixa), `GET /api/dashboard`, e `lib/diagnostico.ts` (lista = pagos-no-dia +
   entregues-não-pagos-no-dia, deduplicada — os totais seguem a régua nova E os sinais da 150
   continuam vendo os não-pagos).
3. **INSERT do balcão passou a gravar `pagamento_confirmado_at`** quando a venda nasce paga —
   daqui pra frente as duas datas coincidem no caso normal.

### Migração de comportamento (medida ANTES de mudar)
- 234 pagos sem timestamp → fallback preserva o dia (verificado: diagnóstico de 08-07-26
  recalculado = 347,60/132,54, EXATAMENTE o gravado no fechamento da época, local E produção).
- **4 pedidos mudam de dia de propósito** (ped-0615/0641/0648/0649, R$7,20 total): pagos em
  10/07, entregues em 13/07 — passam a contar em 10/07, que é quando o dinheiro entrou (a
  intenção da demanda). Fechamentos JÁ GRAVADOS não são reescritos; a diferença aparece só em
  recálculo (diagnóstico) desses 2 dias.
- 4 pedidos pagos e ainda não entregues passam a contar (o objetivo — os 33 do achado do dia
  são em maioria não-pagos, esses seguem fora até alguém confirmar, agora com a data certa via
  165).

### Testes (sintéticos apagados; provas por registro/SQL — a gráfica estava ABERTA, os totais
mudavam com venda real ao mesmo tempo)
Pedido 'pronto' pago hoje → apareceu em `/api/entradas` de hoje e somou no fechamento (critério
1); histórico de dia fechado bate exato com a régua nova (critério 2); fechamento usa a mesma
régua via `getResumoDia` (critério 3); produção: entradas do dia real fluindo + 08-07 intacto.

### Documentação da decisão (o risco apontado na demanda)
"Qual dia conta quando pagamento e entrega diferem" → **dia do PAGAMENTO**, decisão do Edvam
verbatim, gravada em comentário na coluna do banco e em cada ponto de soma.
