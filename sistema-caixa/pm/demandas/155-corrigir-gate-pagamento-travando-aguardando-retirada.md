# 155 — Corrigir gate de pagamento (154): "aguardando retirada" não pode exigir pagamento

Status: concluída
Criada em: 2026-07-10
Aprovada em: 2026-07-10
Concluída em: 2026-07-10
Chat executor: 03 - APP JS GRAFICA

## Contexto
A demanda 154 implementou o gate de pagamento pedindo travar `entregue` e a transição
`aguardando_retirada → entregue`. A execução colocou `aguardando_retirada` como **alvo travado**
também — ou seja, `pronto → aguardando_retirada` (botão "📦 Aguardando retirada") agora exige
`pagamento_confirmado = true` antes de deixar marcar.

Isso quebra um fluxo legítimo: pedido com `pagamento_momento = 'retirada'` ("paga na retirada")
chega nesse estado **sem pagamento por design** — o cliente paga quando vem buscar. Prova real:
existem hoje 2 pedidos em produção parados em `aguardando_retirada` sem pagamento confirmado —
esse é o estado normal e esperado. Com o gate do jeito que foi implementado, nenhum pedido futuro
vai conseguir chegar nesse mesmo estado sem o atendente confirmar (ou forjar) um pagamento que
ainda não aconteceu.

O PM verificou isso lendo `components/TelaPedidos.tsx` (`STATUS_AVANCO_COM_GATE`) e
`app/api/pedidos/route.ts` (mesmo conjunto no backend) — confirmado nos dois lugares.

## Objetivo
"Aguardando retirada" volta a ser um estado de espera livre (pedido pronto, cliente ainda não
veio buscar/pagar) — o gate só trava a ENTREGA (`entregue`) e o início de produção
(`em_producao`/`pronto`), como a 154 pediu originalmente.

## Escopo
- Incluído:
  1. Tirar `aguardando_retirada` do conjunto de status travados — no front
     (`STATUS_AVANCO_COM_GATE`, `components/TelaPedidos.tsx`) e no backend (mesmo conjunto em
     `app/api/pedidos/route.ts`). Conjunto final: `em_producao`, `pronto`, `entregue`.
  2. Manter os dois conjuntos IGUAIS entre front e backend (mesmo cuidado que a 154 já tinha —
     não pode divergir, senão um avanço legítimo vira 400 seco sem modal).
  3. `aguardando_retirada → entregue` continua travado (via `entregue` já estar no conjunto) —
     isso é o que a 154 pedia de fato, fica intacto.
- Fora de escopo: qualquer outra parte do gate da 154 (backend atômico com `formaPagamento`,
  unificação da `precisaConfirmarPagamento`, etc.) — só tirar `aguardando_retirada` do conjunto.

## Critérios de aceite
- [ ] `pronto → aguardando_retirada` funciona sem modal, mesmo com `pagamento_confirmado = false`
      (regressão do bug — testar com pedido `pagamento_momento: 'retirada'` sintético)
- [ ] `aguardando_retirada → entregue` continua travado sem pagamento confirmado (não regredir o
      que a 154 corrigiu — reusar o caso de teste do "gap da 141" já documentado no relato da 154)
- [ ] `em_producao` e `pronto` como alvo continuam travados normalmente (regressão)
- [ ] Os 2 pedidos legado hoje parados em `aguardando_retirada` sem pagamento continuam podendo
      seguir o fluxo normal (chegar em `entregue` ainda exige confirmação, como já era)

## Referências
Demanda 154 (`pm/demandas/154-jornada-pedido-fase4-travar-producao-sem-pagamento.md`) — Objetivo
original citava só `entregue` e `aguardando_retirada → entregue`, não `aguardando_retirada` como
alvo.

## Relato de execução
Executada em 2026-07-10 (03 - APP JS GRAFICA, Fable 5). Deploy `dpl_C2cmLbcew5cRJ5xDWx1BrSmVg23m`,
correção provada em produção.

### O que foi feito
`aguardando_retirada` saiu do `STATUS_AVANCO_COM_GATE` nos DOIS lugares (front
`components/TelaPedidos.tsx` e backend `app/api/pedidos/route.ts` — conjuntos mantidos idênticos,
mesmo cuidado da 154). Conjunto final: `em_producao`, `pronto`, `entregue`. Comentários no código
atualizados explicando o porquê: "aguardando retirada" é estado de ESPERA — "paga na retirada"
chega nele sem pagamento POR DESIGN; travar ali obrigava o atendente a confirmar (ou forjar) um
pagamento que ainda não aconteceu. A saída de verdade continua travada porque `entregue` segue no
conjunto. Nada mais da 154 foi tocado (PATCH atômico com `formaPagamento`, unificação da
`precisaConfirmarPagamento` — intactos).

### Testes (sintéticos, todos apagados)
- **API**: pedido `pagamento_momento: 'retirada'` não pago, `pronto → aguardando_retirada` sem
  forma → **passou** (bug corrigido); o MESMO pedido `→ entregue` sem forma → 400, com forma →
  entregue+pago (caso do gap da 141 reusado, como o critério pedia — 154 intacta);
  `confirmado → em_producao` e `em_producao → pronto` não pagos → 400 (regressões ok).
- **UI (Playwright)**: pedido pronto não pago → botão "📦 Aguardando retirada" avançou SEM modal
  (banco: `aguardando_retirada`, `pagamento_confirmado: false`); em seguida "Marcar entregue" →
  modal "Pagamento pendente" abriu e o pedido NÃO avançou.
- **Legado (critério 4)**: os 2 pedidos reais parados em `aguardando_retirada` sem pagamento
  (ped-0425, ped-0514) conferidos read-only — continuam no estado normal; pra eles nada mudou
  em nenhum momento (o alvo travado só afetaria transições NOVAS pra esse estado), e o
  `→ entregue` deles segue exigindo confirmação, como sempre.
- **Produção**: PATCH real `pronto → aguardando_retirada` não pago → passou; `→ entregue` → 400.
  Sintético apagado.

### Critérios de aceite
- [x] `pronto → aguardando_retirada` sem modal/400 com pagamento pendente (API + UI + produção)
- [x] `aguardando_retirada → entregue` continua travado (caso do gap da 141 reusado)
- [x] `em_producao` e `pronto` como alvo continuam travados (regressão)
- [x] Os 2 legados reais seguem o fluxo normal (verificados read-only, intactos)
