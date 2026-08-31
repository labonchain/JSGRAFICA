# 133 — Criar pedido (Inbox): layout de categorias e produtos, tirar scroll interno forçado

Status: concluída
Criada em: 2026-07-09
Aprovada em: 2026-07-09
Concluída em: 2026-07-09
Chat executor: 03 - APP JS GRAFICA

## Contexto
O Edvam apontou (2026-07-09), vendo a tela ao vivo (painel "📦 Criar pedido", dentro do Inbox):
o grid de produtos tem um scroll interno forçado, cedo demais, e os cards de produto ficam
apertados. Causa, lendo `components/TelaInbox.tsx`:
- Linha 1531-1540 (tags de categoria — "Xerox", "Impressão", "Plastificação" etc.): fonte pequena
  (`text-xs`), padding apertado (`px-2 py-1`), difícil de escanear visualmente.
- Linha 1541 (grid de produtos): `grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto` — o
  `max-h-40` (só 160px) força um scroll **interno**, separado do scroll da página, cedo demais —
  cabe pouquíssimo produto visível. O container pai (linha ~1372) **já tem o próprio scroll**
  (`flex-1 overflow-y-auto`), então esse scroll interno é redundante e piora a experiência.

## Objetivo
A lista de produtos aparece maior, mais legível, sem precisar de um scroll interno separado — só
o scroll natural do painel (que só aparece se a lista realmente não couber, o que não deve
acontecer pra a maioria das categorias, ~10-12 produtos). Categorias mais fáceis de ler.

## Escopo
- Incluído:
  1. Remover `max-h-40 overflow-y-auto` do grid de produtos (linha 1541) — deixar a lista fluir
     naturalmente dentro do scroll do painel pai, sem cap de altura arbitrário.
  2. Trocar `grid-cols-2` por **1 produto por linha** (`grid-cols-1`) — cards maiores, mais fáceis
     de tocar/ler, em vez dos quadrados apertados de hoje. Aumentar um pouco a fonte (de `text-xs`
     pra `text-sm` no nome do produto) e o padding interno do card.
  3. Tags de categoria: aumentar levemente fonte e espaçamento (`text-xs`→`text-sm` ou meio-termo,
     padding `px-2 py-1`→`px-3 py-1.5`) — não precisa de cor nova, só melhorar a respiração visual
     pra ficar mais fácil de escanear rápido.
- Fora de escopo: mudar a lógica de filtro por categoria, o fluxo de seleção/carrinho, ou
  qualquer coisa além de espaçamento/tamanho/organização visual.

## Critérios de aceite
- [x] Grid de produtos sem `max-h`/scroll interno próprio — usa o scroll do painel
- [x] Produtos em 1 coluna, cards maiores e mais legíveis que hoje
- [x] Categorias com fonte/espaçamento mais confortável
- [x] Testado com uma categoria de poucos produtos e uma com muitos — fui além dos ~10-12: usei a
      pior categoria real do catálogo ("Impressão", 33 produtos), sem corte nem estouro

## Referências
Esta conversa (2026-07-09), print real do painel "Criar pedido" com o contato "Edvan Filho".
`components/TelaInbox.tsx` (linhas ~1489-1552).

## Relato de execução

### O que foi feito (`components/TelaInbox.tsx`, painel "📦 Criar pedido")
- **Grid de produtos**: removidos `max-h-40 overflow-y-auto` (o cap de 160px que forçava o scroll
  interno redundante — o painel pai já rola com `flex-1 overflow-y-auto`) e `grid-cols-2` virou
  `grid-cols-1` — 1 produto por linha, card com `p-3` (antes `p-2`) e nome em `text-sm` (antes
  `text-xs`); o preço ganhou um respiro (`mt-0.5`). Estado vazio ajustado (o `col-span-2` deixou
  de fazer sentido).
- **Tags de categoria**: `text-xs px-2 py-1` → `text-sm px-3 py-1.5`, `gap-1` → `gap-1.5` — sem
  cor nova, como pedido.
- Nenhuma mudança de lógica (filtro, seleção, carrinho) — só classes de layout.

### Testes realizados (só leitura — painel aberto, nenhum pedido confirmado)
- **Playwright na conversa real do "Edvan Filho"** (mesma do print da demanda):
  - Categoria pequena (Personalizados, 4 produtos): cards grandes, 1 por linha, legíveis, tags
    maiores — visual conferido por screenshot.
  - **Estilo computado do grid medido no DOM**: `overflowY: visible`, `maxHeight: none` — o
    scroll interno não existe mais de fato, não só na classe.
  - Categoria grande (Impressão, **33 produtos** — pior caso real, bem acima dos ~10-12
    típicos): o painel pai rola sozinho até o fim da lista, último card 100% visível
    (verificado programaticamente via `getBoundingClientRect`), "Cancelar criação de pedido"
    acessível embaixo — nada cortado, nada estourando a margem.
- `npx tsc --noEmit` e `npm run build` limpos.

### Status final
Concluída e em produção (`dpl_5EeQ6FVmziPKENF33T9pahbjh3FY`).
