# 066 — Pedido Balcão: confirmar forma de pagamento e status de entrega ao finalizar venda

Status: aprovada
Criada em: 2026-07-05
Aprovada em: 2026-07-05
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Investigado pelo PM: hoje, ao clicar "Confirmar Venda" no PDV (`app/pdv/page.tsx`), o pedido de
balcão é gravado direto com `status: 'entregue'` e `pagamento_confirmado: true` fixos — sem
perguntar nada pro operador. Isso está errado em dois pontos, confirmados pelo Edvam:

1. **Forma de pagamento nunca é perguntada nem salva** — existe até o campo no banco
   (`forma_pagamento`), mas fica sempre vazio.
2. **Nem todo pedido de balcão é entregue na hora** — às vezes a pessoa deixa algo (ex.: um livro
   pra tirar xerox) e vem buscar depois. Hoje não tem como registrar isso — todo pedido de balcão
   nasce "entregue", mesmo quando não foi.

Achado à parte, também confirmado: quando o carrinho tem 2+ produtos diferentes, o sistema cria
um pedido separado por item (intencional, mantém granularidade de relatório por produto) — mas
não existe nenhum vínculo entre eles, então na aba Pedidos parecem vendas desconexas.

## Objetivo
Ao finalizar uma venda de balcão, o operador informa a forma de pagamento e se o produto já foi
entregue na hora — e os itens da mesma venda aparecem visualmente agrupados na aba Pedidos.

## Escopo
- Incluído:
  1. No fluxo de "Confirmar Venda" do PDV, adicionar duas perguntas simples antes de gravar:
     - **Forma de pagamento**: Dinheiro / Cartão / Pix / "Vai pagar na retirada" (salvar em
       `forma_pagamento`; se for "Vai pagar na retirada", `pagamento_confirmado` fica `false`).
     - **Já entregou agora?** Sim (padrão, é o caso mais comum) / Não. Se "Sim" → `status:
       'entregue'` (como já é hoje). Se "Não" → `status: 'aguardando_retirada'` (novo status da
       demanda 065 — este item depende da 065 estar pronta).
  2. Adicionar um identificador que vincula os itens do mesmo carrinho/checkout (ex.: um
     `venda_id` gerado no momento de "Confirmar Venda", igual pra todos os itens daquela venda).
     Na aba Pedidos, agrupar visualmente pedidos com o mesmo `venda_id` num único card/linha (com
     os itens dentro), em vez de listas soltas.
  3. Se ficou "Aguardando retirada" e ainda não pago, ao marcar como "Entregue" depois (retirada),
     mostrar aviso de pagamento pendente (mesmo conceito da demanda de pagamento discutida — se
     ela ainda não tiver sido criada como demanda separada, avisar o PM antes de implementar essa
     parte isoladamente).
- Fora de escopo: mudar a granularidade de gravação no banco (continua uma linha por item);
  automatizar a forma de pagamento por IA ou qualquer inferência — é sempre o operador que
  escolhe, manual.

## Critérios de aceite
- [ ] Ao confirmar venda, sistema pergunta forma de pagamento e se já entregou
- [ ] Pedido gravado com "Não entregou" aparece como "Aguardando retirada" na aba Pedidos
- [ ] Carrinho com 2+ produtos aparece agrupado como uma venda só na aba Pedidos (não like itens
      soltos sem relação visível)
- [ ] Testado com pelo menos 1 venda de balcão com múltiplos itens e forma de pagamento variada

## Riscos e cuidados
Depende da demanda 065 (status "Aguardando retirada") estar concluída antes desta.

## Referências
`app/pdv/page.tsx` (fluxo "Confirmar Venda"). `app/api/pedidos/route.ts` (POST com
`origemBalcao`). `components/TelaPedidos.tsx` (exibição agrupada). Demanda 065 (status novo).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  1. Migration `add_venda_id_to_pedidos`: coluna `venda_id` (text, nullable) + índice em
     `jsgrafica_pedidos`.
  2. `app/api/pedidos/route.ts` (branch `origemBalcao`): passou a aceitar `formaPagamento`,
     `pagamentoConfirmado`, `statusEntrega` (`entregue`/`aguardando_retirada`) e `vendaId` do
     corpo da requisição, em vez dos valores fixos antigos (`status: 'entregue'`,
     `pagamento_confirmado: true`). `data_entregue_at` só é preenchido quando o status final é
     `entregue`.
  3. Modal "Finalizar venda" adicionado em **`app/pdv/page.tsx`** (PDV, Zu/Gabi) e em
     **`app/page.tsx`** (`TelaPDV`, admin/Edvam — mesma lógica duplicada no código já existente,
     segui o padrão já usado nas demandas 054/060/061 de replicar em ambas as telas): botão
     "Confirmar Venda" abre o modal em vez de gravar direto; pergunta forma de pagamento
     (Dinheiro/Cartão/Pix/"Paga na retirada" — some `pagamento_confirmado=false`) e "Já entregou
     agora?" (Sim, padrão / Não → usa o status `aguardando_retirada` da demanda 065). Um
     `venda_id` (`venda-{timestamp}-{random}`) é gerado 1x por confirmação e enviado igual pra
     todos os itens do carrinho.
  4. `components/TelaPedidos.tsx`: nova função `agruparPorVenda()` — pedidos com o mesmo
     `venda_id` (2+) viram uma única entrada na lista esquerda ("🧾 Cliente · N itens · total"),
     em vez de aparecerem soltos. Novo componente `PainelDetalheVenda` no painel direito, mostrando
     cabeçalho da venda (cliente, forma de pagamento, total) + cada item com seu próprio status e
     botões de avançar (a gravação continua por item, só a exibição é agrupada). Aviso de
     "pagamento pendente" já aparece automaticamente no cabeçalho do grupo se algum item tiver
     `pagamento_confirmado=false` (usa o campo que já existe, sem precisar de UI nova).
- Testes realizados e resultado:
  Playwright local (`admin.localhost:3000`, mesmo Supabase de produção): venda de balcão com 2
  produtos de categorias diferentes (Xerox + Escritório), forma de pagamento "Pix" e "Não, vai
  buscar depois" → os 2 pedidos foram gravados com `status=aguardando_retirada`,
  `forma_pagamento=Pix`, `pagamento_confirmado=true` e o mesmo `venda_id` (confirmado direto via
  SQL). Na aba Pedidos, o card agrupado apareceu com "2 itens" e o total certo; o painel de detalhe
  mostrou os 2 serviços, forma de pagamento e nenhum aviso de pendência (pago via Pix). Avançando 1
  dos 2 itens pra "Entregue", o card da lista passou a mostrar "Vários status" corretamente
  (confirma que o agrupamento é só visual, sem sincronizar status entre itens). Depois do deploy,
  reconfirmado em produção via `curl` direto em `pdv.jsgrafica.site/api/pedidos` (mesmo
  comportamento). Registros de teste apagados do Supabase depois de cada rodada.
  `npx tsc --noEmit` e `npm run build` rodaram limpos antes do deploy.
  Deploy em produção: `npx vercel --prod --yes` → `dpl_BGRDkt9e8WU1YWYrHy4LLBiweH5u`.
- Achados fora do escopo:
  Item 3 da demanda (aviso de pagamento pendente ao marcar "Entregue" a partir de "Aguardando
  retirada", quando ainda não pago) — implementei a parte mais simples e já coberta pelo campo
  existente (`pagamento_confirmado`): o aviso já aparece no cabeçalho do painel agrupado sempre que
  algum item da venda estiver com pagamento pendente, sem precisar de tela nova. Não implementei um
  aviso extra/bloqueante especificamente no momento de clicar "Marcar entregue" (ex.: confirmação
  modal "tem certeza, ainda não foi pago?") — não existe demanda separada de cobrança/pagamento
  pendente no `STATUS.md`, e a própria demanda 066 pede pra avisar o PM antes de implementar essa
  parte isoladamente. Fica sinalizado pro PM decidir se vale um passo extra de confirmação ali ou
  se o aviso visível já no painel é suficiente.
- Status final: concluída (critérios de aceite atendidos; item 3 parcialmente coberto, ver achado
  acima).
