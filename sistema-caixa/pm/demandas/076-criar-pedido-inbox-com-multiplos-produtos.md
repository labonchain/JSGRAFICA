# 076 — Permitir mais de um produto no "Criar pedido" do Inbox

Status: aprovada
Criada em: 2026-07-06
Aprovada em: 2026-07-06
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Feedback do time: no Inbox, "Criar pedido" só permite **1 produto por vez** — confirmado no
código (`components/TelaInbox.tsx`, `pedidoProdutoSel` é um produto só, `confirmarPedido()` faz
1 chamada com 1 `produtoId`). Cliente que pede 2+ produtos numa mesma conversa não tem como virar
1 pedido só hoje.

O balcão já resolveu exatamente esse problema na demanda 066: carrinho com vários itens, cada um
vira uma linha em `jsgrafica_pedidos`, todos compartilhando o mesmo `venda_id`, e
`TelaPedidos.tsx` já sabe agrupar visualmente por `venda_id` (`agruparPorVenda()`,
`PainelDetalheVenda`). A ideia aqui é estender o "Criar pedido" do Inbox pra funcionar do mesmo
jeito — não inventar um mecanismo novo.

## Objetivo
No Inbox, dá pra adicionar 2 ou mais produtos ao criar um pedido pra um cliente — vira 1 "venda"
agrupada na aba Pedidos, igual já acontece no balcão.

## Escopo
- Incluído:
  1. Em `TelaInbox.tsx`, o fluxo de "Criar pedido" vira um carrinho (like o do balcão) em vez de
     seleção única — adicionar produto, ajustar quantidade, adicionar outro produto, remover item,
     antes de confirmar.
  2. Ao confirmar, gerar 1 `venda_id` e chamar `POST /api/pedidos` uma vez por item (mesmo padrão
     do balcão), todos com o mesmo telefone/cliente e `venda_id`.
  3. A mensagem de confirmação (+ Pix, se algum item exigir) precisa virar **1 mensagem só**
     cobrindo todos os itens da venda (nome + valor de cada item, total geral) — não uma mensagem
     por item. Coordenar com a demanda 073 (mensagens de pedido viram rascunho, não envio
     automático): construir isso já em cima do mecanismo novo da 073, não do envio automático
     antigo — **executar a 076 depois da 073 estar concluída**, pra não fazer duas vezes.
- Fora de escopo: mudar o balcão (076 é só estender o mesmo padrão pro Inbox).

## Critérios de aceite
- [ ] Dá pra adicionar 2+ produtos diferentes num pedido criado pelo Inbox
- [ ] Os itens aparecem agrupados na aba Pedidos (mesmo card, "N itens", como já acontece no
      balcão)
- [ ] Rascunho/mensagem de confirmação cobre todos os itens numa mensagem só, com o total certo
- [ ] Testado com 1 pedido de 2 produtos (1 exigindo Pix, 1 não) — confirma que o texto reflete
      os dois corretamente

## Riscos e cuidados
Depende da demanda 073 estar concluída primeiro (mexem no mesmo mecanismo de mensagem).

## Referências
`components/TelaInbox.tsx` (fluxo atual de "Criar pedido"). `app/pdv/page.tsx` e
`components/TelaPedidos.tsx` (`agruparPorVenda`, `venda_id` — padrão de referência da demanda
066). Demanda 073 (mensagem vira rascunho — fazer 076 depois).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  Executada depois da 073 (rascunho, não envio automático), como exigido — o mecanismo de
  mensagem combinada já usa o rascunho da 073, não foi implementado duas vezes.
  1. `components/TelaInbox.tsx`: o fluxo "Criar pedido" virou carrinho — nova interface
     `ItemCarrinhoPedido` e estado `pedidoCarrinho`. Selecionar um produto + confirmar
     quantidade/valor manual agora **adiciona ao carrinho** (`adicionarAoCarrinho()`) em vez de
     enviar direto, e volta pro seletor de categoria/produto (pode adicionar outro). Card de
     resumo do carrinho (itens, remover, total) aparece acima do seletor quando há 1+ item, com
     o botão final "Confirmar pedido (N itens)".
  2. `confirmarPedidoCarrinho()`: gera 1 `venda_id` só quando há 2+ itens (1 item só continua sem
     `venda_id`, igual sempre foi — mesma regra do balcão, demanda 066) e chama `POST /api/pedidos`
     sequencialmente, uma vez por item, marcando `finalizarVenda: true` só no último.
  3. `app/api/pedidos/route.ts` (branch `produtoId`): passou a aceitar `vendaId` e
     `finalizarVenda`. Grava `venda_id` no insert; só monta e grava o rascunho de confirmação
     quando `finalizarVenda` é `true` — nesse momento, se houver `vendaId`, busca **todos** os
     pedidos já gravados com esse `venda_id` (inclusive os das chamadas anteriores da mesma
     venda) pra montar 1 mensagem só. Sem `vendaId`, comportamento idêntico ao de sempre (1 item,
     finaliza na hora).
  4. `lib/pedidos.ts`: nova `montarMensagensConfirmacaoPedidoMultiplo(itens[], chavePix,
     titularPix)` — com 1 item só, retorna exatamente o texto já usado desde a 062 (reaproveita a
     função original, sem mudar a mensagem que o cliente já recebe hoje). Com 2+, monta 1
     mensagem listando cada item (nome, quantidade se >1, valor, desconto se houver) + total
     geral; se algum item exigir Pix (`pagamento_tipo: pre_producao`), adiciona 1 mensagem de Pix
     cobrindo só a soma dos itens que exigem (não o total geral) — os demais itens continuam
     "paga na entrega/depois".
  5. Agrupamento na aba Pedidos: nenhuma mudança em `TelaPedidos.tsx` — `agruparPorVenda()` já é
     genérico (olha só se 2+ pedidos compartilham `venda_id`, não importa a origem), então pedidos
     multi-item criados pelo Inbox já aparecem agrupados "N itens" sem precisar tocar nesse
     código, exatamente como a demanda pedia.
- Testes realizados e resultado:
  Testado com o contato real "Edvan Filho" (`5521965185667`): 1 produto sem Pix (XEROX PRETO E
  BRANCO A4, R$0,45) + 1 produto com Pix obrigatório (BANNER OU LONA ACIMA 50X1,00, R$65,00,
  `pagamento_tipo=pre_producao`). Primeiro validado via `curl` direto na API (2 chamadas
  sequenciais, mesmo `vendaId`, segunda com `finalizarVenda:true`) — rascunho combinado saiu
  certo: os 2 itens listados, total R$65,90, mensagem de Pix com o valor certo (R$65,00, só do
  item que exige). Depois testado o fluxo real de ponta a ponta pela UI (Playwright): abrir
  "Criar pedido", adicionar os 2 produtos ao carrinho (contador "Carrinho (1 item)" →
  "Carrinho (2 itens)" atualizando certo), confirmar — os 2 pedidos foram criados com o mesmo
  `venda_id`, e a aba Pedidos mostrou o card agrupado "🧾 Edvan Filho · 2 itens", painel de
  detalhe com os 2 serviços certos (confirma que `agruparPorVenda()` já cobria isso sem
  alteração). `npx tsc --noEmit` e `npm run build` rodaram limpos antes do deploy. Deploy em
  produção: `npx vercel --prod --yes` → `dpl_FEWCtayFxeApoc5CnvCFfJywShpw`, reconfirmado com
  `/api/inbox/rascunho-pedido` respondendo em produção. Pedidos e rascunho de teste apagados do
  Supabase depois.
- Achados fora do escopo:
  O cartão pequeno "📦 Pedido desta conversa" no painel do Inbox (diferente da aba Pedidos) só
  mostra 1 pedido por vez (`GET /api/pedidos?telefone=...` pega só o mais recente) — com um
  pedido de 2+ itens, esse card mostra só o último item criado, não a venda inteira. Isso já era
  uma limitação do design do card antes desta demanda (nunca foi pensado pra múltiplos itens) e
  não está nos critérios de aceite (que só pedem agrupamento na aba Pedidos, já confirmado
  funcionando). Não alterei esse card — fica registrado caso o Edvam ache confuso na prática e
  peça pra mostrar a venda inteira ali também.
- Status final: concluída.
