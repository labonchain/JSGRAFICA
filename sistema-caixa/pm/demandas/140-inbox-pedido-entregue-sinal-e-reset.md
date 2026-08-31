# 140 — Inbox: pedido "entregue" não sinaliza conclusão e trava o botão de novo pedido

Status: concluída
Criada em: 2026-07-09
Aprovada em: 2026-07-09
Concluída em: 2026-07-09
Chat executor: 03 - APP JS GRAFICA

## Contexto
O Edvam testou o fluxo completo (Confirmado → Em produção → Pronto → Entregue) no painel de
pedido do Inbox (2026-07-09) e achou 2 problemas:

1. Ao chegar em "Entregue", não aparece nenhum sinal verde/"concluído" indicando que fechou.
2. O botão "📦 Criar pedido" não reaparece sozinho depois — precisa dar refresh na página.

Causa do item 2, confirmada no código (`components/TelaInbox.tsx`): existem **2 funções
diferentes** que avançam status de pedido nessa tela. `executarAvancoItemVenda` (linha 931, pra
vendas com 2+ itens) chama `await carregarPedidoAtivo(phoneAtivo)` depois do PATCH — isso
re-busca o pedido e, como `carregarPedidoAtivo` (linha 407-415) já trata `status === "entregue"`
como "sem pedido ativo" (`ativo = null`), o botão de criar pedido novo reaparece sozinho. Já
`executarAvancoPedido` (linha 885, pedido de item único — o caminho mais comum) só faz
`setPedidoAtivo(data.pedido)` direto com a resposta do PATCH, **sem** chamar
`carregarPedidoAtivo` de novo — por isso o card fica preso mostrando o pedido já entregue até a
página ser recarregada manualmente.

## Objetivo
Ao marcar um pedido como "Entregue" (nos 2 caminhos, item único ou venda com 2+ itens), a tela
mostra um sinal claro de conclusão e volta sozinha a oferecer "Criar pedido" pra essa conversa,
sem precisar de refresh.

## Escopo
- Incluído:
  1. `executarAvancoPedido` (linha 885) passa a chamar `carregarPedidoAtivo(phoneAtivo)` depois do
     PATCH, mesmo padrão que `executarAvancoItemVenda` já usa — unifica os 2 caminhos.
  2. Adicionar um sinal visual (ex. banner/badge verde "✓ Pedido concluído") no momento em que o
     status muda pra "entregue", antes do painel resetar pra "Criar pedido" — pra não sumir sem
     nenhuma confirmação visual do que aconteceu (decidir com o executor: um toast passageiro, ou
     um estado breve no próprio card antes de resetar).
- Fora de escopo: qualquer mudança na esteira de status ou nas fases do plano de jornada (137-139
  e seguintes) — isso é um bug de UI independente do plano de fases.

## Critérios de aceite
- [x] Marcar "Entregue" num pedido de item único reabre o botão "Criar pedido" sozinho, sem refresh
- [x] Marcar "Entregue" numa venda de 2+ itens continua funcionando igual (não quebrar o que já
      funciona)
- [x] Aparece algum sinal visual de "concluído" ao entregar, antes de resetar

## Referências
Esta conversa (2026-07-09) — teste ao vivo do Edvam. `components/TelaInbox.tsx` (linhas 407-415,
885-902, 926-948).

## Relato de execução

### O que foi feito (`components/TelaInbox.tsx`)
- **Fix do item 2** (causa exata que o PM já tinha apontado, confirmada): `executarAvancoPedido`
  fazia só `setPedidoAtivo(data.pedido)` com a resposta do PATCH — o card ficava preso mostrando
  o pedido já entregue. Agora chama `await carregarPedidoAtivo(phoneAtivo)` depois do PATCH,
  exatamente o padrão que `executarAvancoItemVenda` sempre usou — os 2 caminhos unificados;
  `carregarPedidoAtivo` já tratava entregue/cancelado como "sem pedido ativo", então o painel
  reseta sozinho pro "Criar pedido".
- **Sinal visual (item 1 — decisão do executor, como a demanda pedia)**: banner verde
  "✓ <serviço> entregue — pedido concluído!" renderizado no topo da seção "Pedido desta
  conversa", **nos 2 caminhos** (item único e item de venda 2+), que some sozinho em ~6s
  (timeout com cleanup) e também é limpo ao trocar de conversa — um estado breve no próprio
  painel, não um toast global, pra ficar exatamente onde o pedido estava.

### Testes realizados (Playwright na conversa real do Edvan Filho; sintéticos apagados)
- Pedido de item único percorreu a esteira inteira pela UI (Confirmado → Em produção → Pronto →
  Entregue, passando pelo modal de pagamento pendente da 113 no caminho): ao entregar, **banner
  verde visível E o botão "Criar pedido" reapareceu na hora, sem refresh** — screenshot mostra
  os dois juntos no painel.
- Caminho de venda 2+ itens: `executarAvancoItemVenda` não mudou de lógica (já rechamava
  `carregarPedidoAtivo`) — só GANHOU o mesmo sinal visual; sem regressão.
- `npx tsc --noEmit` e `npm run build` limpos.

### Status final
Concluída e em produção (`dpl_9XJXXLmsqMy6WsKrXdVRP2EmrXRE`, deploy compartilhado com a 139).
