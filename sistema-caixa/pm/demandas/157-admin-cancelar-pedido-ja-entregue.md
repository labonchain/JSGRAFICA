# 157 — Admin consegue cancelar pedido já "Entregue" (devolução depois da entrega)

Status: concluída
Criada em: 2026-07-10
Aprovada em: 2026-07-10
Concluída em: 2026-07-10
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado ao vivo pelo Edvam (2026-07-10): lançou um pedido de teste no balcão (Xerox, sem
cliente) que caiu direto em "Entregue" (venda "leva agora") e não conseguiu cancelar — o botão
"Cancelar" simplesmente não aparece pra pedido nesse status (`components/TelaPedidos.tsx`, as
duas ocorrências de `pedido.status !== "entregue" && pedido.status !== "cancelado"`, linhas 275 e
467, escondem toda a barra de ações inclusive o Cancelar).

**Isso já tinha sido identificado antes, com decisão registrada, mas nunca virou demanda formal**
(`pm/demandas/STATUS.md`, achado de 2026-07-07): já aconteceu na gráfica, de verdade, um cliente
pagar, receber a impressão, e devolver/cancelar depois — não é hipotético. Decisão já tomada na
época: **cancelamento tira o valor da soma total do dia** (mesmo efeito de nunca ter contado).

**Achado do PM ao investigar** (verificado direto no código antes de escrever esta demanda): o
**backend já suporta cancelar um pedido `entregue` corretamente** — `cancelarPedido()`
(`lib/supabase-admin.ts:368`) só bloqueia se o pedido **já** estiver `cancelado`, não importa o
status de origem; reverte `saida_vinculada_id` (apaga a saída automática vinculada, se houver) e
sai do total do dia sozinho (todo cálculo de entrada já filtra `status='entregue'`). Confirmado
ao vivo: o PM cancelou o pedido de teste do Edvam (`ped-0677`) via `PATCH /api/pedidos` direto na
API de produção, com o pedido já em `entregue` — funcionou sem erro. **O gap é só de UI.**

## Objetivo
O Admin consegue cancelar um pedido que já está "Entregue", pra cobrir o caso real de devolução
depois da entrega — sem precisar de mim (PM) fazendo isso na mão pela API.

## Escopo
- Incluído:
  1. Revelar o botão **Cancelar** também pra pedidos em `status === "entregue"` — **só quando
     `operador.papel === "admin"`** (Zu/Gabi continuam sem ver essa opção; elas já podiam cancelar
     pedido não-entregue, isso não muda). Aplicar nos 2 pontos (`PainelDetalhe` de item único e o
     painel de venda agrupada).
  2. Confirmação mais forte que o `confirm()` simples usado pra cancelamento normal — esse é
     dinheiro que já foi contado no caixa. Reaproveitar o padrão visual de modal já existente no
     projeto (ex. `ModalConfirmarPagamento`) em vez de criar um estilo novo: perguntar o motivo
     antes de cancelar, com pelo menos 2 opções — **"Cancelamento"** (nunca devia ter contado, ex.
     erro de lançamento/teste) e **"Devolução/Reembolso"** (cliente devolveu depois de já ter
     recebido) — mesmo efeito na soma do dia, mas rótulo diferente pra rastreabilidade (decisão já
     registrada no achado de 07/07, aplicar agora). Gravar o motivo escolhido em
     `jsgrafica_pedidos` (coluna nova, ex. `motivo_cancelamento`, nullable — pedido cancelado antes
     desta demanda fica null, sem valor inventado).
  3. **Aviso quando o pedido é de um dia já fechado** (comparar a data de `data_entregue_at` do
     pedido contra o histórico de `jsgrafica_fechamento` — mesmo critério de "dia fechado" já usado
     no Diagnóstico de Fechamento, 149/`lib/diagnostico.ts`): cancelar não corrige o fechamento
     antigo já gravado (é histórico), só some do recálculo "hoje" pra frente — isso pode criar uma
     divergência nova nesse dia antigo. O aviso deve deixar isso claro antes de confirmar
     (ex. "Esse pedido já foi contado no fechamento de DD/MM, que já está fechado. Cancelar agora
     não corrige aquele fechamento — vai aparecer como divergência se você conferir aquele dia
     depois.") — não precisa resolver a divergência sozinho, só avisar (o Diagnóstico de
     Fechamento, 149-153, já existe pra investigar isso depois).
- Fora de escopo: reembolso de pagamento de verdade (estornar no Mercado Pago/Stone/dinheiro
  físico) — isso é ação manual fora do sistema, o sistema só tira o pedido da soma. Sangria/
  suprimento de caixa (achado relacionado do mesmo dia, mas outro assunto — não misturar).

## Critérios de aceite
- [ ] Admin vê "Cancelar" num pedido `entregue`; Zu/Gabi não veem (testar com os dois papéis)
- [ ] Cancelar pede o motivo (Cancelamento / Devolução-Reembolso) antes de confirmar
- [ ] Pedido cancelado sai do total do dia automaticamente (sem lógica nova — já é o
      comportamento do filtro por `status='entregue'`, só confirmar que continua batendo)
- [ ] Saída automática vinculada (recarga etc.) é revertida — regressão do que `cancelarPedido`
      já faz, testar com 1 pedido de recarga sintético
- [ ] Cancelar pedido de um dia já fechado mostra o aviso de divergência antes de confirmar;
      cancelar pedido de hoje (dia ainda aberto) não mostra esse aviso
- [ ] Testado contra um caso real equivalente ao do Edvam (venda balcão sem cliente, "leva agora",
      depois cancelada) — sintético, apagado depois

## Riscos e cuidados
- Dinheiro real — pedido já pago que sai da soma do dia. Motivo obrigatório existe justamente pra
  não virar "sumiço" de venda sem rastro.
- Só Admin — não abrir essa porta pra atendente por engano.
- Não confundir com sangria/suprimento de caixa (mexer no dinheiro físico do dia) nem com estorno
  de pagamento — este é só o registro do pedido saindo da contagem.

## Referências
`lib/supabase-admin.ts:368` (`cancelarPedido`, já pronta e correta, reaproveitar sem mudar a
lógica central). `components/TelaPedidos.tsx` (linhas 275/467, condição a abrir). Demanda 149
(Diagnóstico de Fechamento, referência pro aviso de dia já fechado). Achado registrado em
`pm/demandas/STATUS.md`, seção "🔴 Pendente agora" (2026-07-07) — decisão original do Edvam sobre
cancelamento/reembolso tirarem da soma do dia.

## Relato de execução
Executada em 2026-07-10 (03 - APP JS GRAFICA, Fable 5). Deploy `dpl_GEpisDw9h5N6P4s7EwGoHMubCMff`,
verificado em produção com os DOIS papéis.

### O que foi feito
1. **Backend (mínimo, como o PM previu)**: `cancelarPedido()` ganhou parâmetro opcional `motivo`
   (lógica central intocada — a reversão de saída vinculada e o resto seguem idênticos);
   `PATCH /api/pedidos` repassa `motivoCancelamento` nos 2 caminhos de cancelamento (id e
   vendaId); migration `add_motivo_cancelamento_pedidos` (`motivo_cancelamento text` nullable —
   cancelamentos antigos ficam null, sem valor inventado).
2. **Rota nova leve `GET /api/fechamento/dia-fechado?ts=<ISO>`**: converte o timestamp pro dia do
   caixa NO SERVIDOR (`timestampParaDiaCaixa`, fuso de Recife — mesma régua de tudo) e responde
   `{dataDia, fechado, fechadoEm}` via `getStatusFechamentoHoje` (que já aceitava qualquer
   `data_dia`). Falha na checagem não bloqueia o cancelamento — só fica sem o aviso.
3. **UI (`TelaPedidos`)**: botão **"Cancelar pedido entregue"** (item único) / **"Cancelar item
   entregue"** (venda agrupada) — ambos SÓ quando `operador.papel === 'admin'`; as barras de ação
   existentes de pedido não-entregue ficaram intocadas (Zu/Gabi seguem cancelando não-entregue
   como sempre). Modal novo `ModalCancelarEntregue` no padrão visual do `ModalConfirmarPagamento`:
   motivo obrigatório (**Cancelamento** / **Devolução/Reembolso**, com legenda explicando a
   diferença e que o estorno do dinheiro em si é por fora), aviso âmbar quando o dia do
   `data_entregue_at` já tem fechamento geral ("cancelar agora não corrige aquele fechamento —
   vai aparecer como divergência..."), confirmação vermelha.

### Testes (sintéticos, todos apagados; nenhum dado real tocado)
- Rota dia-fechado: ts de 08-07 → `fechado: true`; hoje → `false`; inválido → 400.
- **UI local (Playwright)**: pedido entregue HOJE com saída de repasse vinculada → botão visível,
  modal com os 2 motivos e SEM aviso (dia aberto) → "Devolução/Reembolso" → cancelado, motivo
  gravado, **saída vinculada apagada** (regressão do `cancelarPedido`, testada com recarga como o
  critério pedia); pedido de **dia fechado (08-07)** → modal COM o aviso citando "fechamento de
  08-07-26" (screenshot).
- **Total do dia**: provado por SQL que a soma dos entregues de hoje (R$248,10) bate exata com o
  `totalEntradas` da API e o cancelado está fora — a comparação simples antes/depois divergiu
  R$2,20 porque havia VENDA REAL entrando ao mesmo tempo (49 pedidos hoje, gráfica aberta), por
  isso a prova final foi por SQL, não por snapshot.
- **Produção, caso real equivalente ao do Edvam** (critério 6): venda balcão "leva agora" SEM
  cliente criada em produção → **Zu no PDV abriu o pedido e NÃO viu o botão**; **Edvam no admin
  viu, cancelou pelo modal** com motivo "Cancelamento" → banco: `cancelado`, motivo gravado,
  `cancelado_por: Edvam`. Sintético apagado.

### Critérios de aceite
- [x] Admin vê "Cancelar" em pedido entregue; Zu não vê (testado com os 2 papéis em produção)
- [x] Motivo obrigatório (Cancelamento / Devolução-Reembolso) antes de confirmar
- [x] Cancelado sai do total do dia (provado por SQL exato, sem lógica nova)
- [x] Saída automática vinculada revertida (testado com recarga sintética)
- [x] Aviso de dia fechado presente (08-07) e ausente em dia aberto (hoje)
- [x] Caso real equivalente ao do Edvam testado de ponta a ponta em produção
