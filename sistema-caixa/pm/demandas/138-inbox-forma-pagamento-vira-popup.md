# 138 — Inbox: forma de pagamento (Fase 1) vira popup, igual ao balcão

Status: concluída
Criada em: 2026-07-09
Aprovada em: 2026-07-09
Concluída em: 2026-07-09
Chat executor: 03 - APP JS GRAFICA

## Contexto
A demanda 137 (Fase 1) adicionou "Forma de pagamento"/"Pagar quando?" **inline**, dentro do card
do carrinho, no painel "Criar pedido" do Inbox (`components/TelaInbox.tsx`). O Edvam testou ao
vivo (2026-07-09) e confirmou que funciona (depois de um refresh de cache), mas achou fácil de
passar despercebido — o painel já rola (`overflow-y-auto`) e a seção fica "no meio do caminho",
diferente do balcão, onde a forma de pagamento é perguntada num **popup** (modal "Finalizar
venda", demanda 066) que força atenção antes de confirmar.

## Objetivo
A pergunta de forma de pagamento no Inbox vira um popup/modal, igual ao padrão já usado no
balcão — mais visível, mais difícil de pular sem querer.

## Escopo
- Incluído:
  1. Ao clicar em "Confirmar pedido" no carrinho do Inbox, abrir um modal (mesmo estilo visual do
     "Finalizar venda" do balcão) com as 2 perguntas já existentes ("Forma de pagamento":
     Dinheiro/Pix/Cartão; "Pagar quando?": Agora/Na retirada) + botões Cancelar/Confirmar.
  2. Confirmar no modal executa exatamente o que `confirmarPedidoCarrinho` já faz hoje — só muda
     ONDE a pergunta é feita (popup em vez de inline), não a lógica de gravação (já correta, da
     137).
  3. Perguntas continuam **opcionais, sem default** — mesma decisão da 137 (não enviesar dado).
  4. Remover a seção inline equivalente do card do carrinho (não deixar duplicado).
- Fora de escopo: qualquer mudança de comportamento além de onde a pergunta aparece. Isso
  continua sendo só captura de dado, nenhuma cobrança/checagem nova (mesmo escopo da 137).

## Critérios de aceite
- [x] Clicar "Confirmar pedido" abre modal com as 2 perguntas, visualmente parecido com o do balcão
- [x] Confirmar no modal grava exatamente igual à 137 (mesmos campos, mesmo comportamento)
- [x] Cancelar no modal não cria o pedido
- [x] Seção inline antiga removida, sem duplicar a pergunta em 2 lugares

## Referências
Demanda 137 (Fase 1, implementação original — inline). Demanda 066 (modal "Finalizar venda" do
balcão, referência visual). Esta conversa (2026-07-09) — feedback do Edvam testando ao vivo.

## Relato de execução

### O que foi feito (`components/TelaInbox.tsx`)
- Seção inline das 2 perguntas (137) **removida** do card do carrinho — o botão "Confirmar
  pedido" agora abre um **modal** no mesmo padrão visual do "Finalizar venda" do balcão (066):
  overlay escuro, card branco `w-96`, título + "N itens · Total: R$X", as 2 perguntas em grids
  de botões `border-2` (seleção azul, igual ao balcão), rodapé Cancelar + "✓ Confirmar" verde.
- **Nenhuma mudança de lógica**: o "✓ Confirmar" do modal chama exatamente o
  `confirmarPedidoCarrinho` de sempre (mesma gravação da 137, mesmos estados
  `pedidoFormaEscolhida`/`pedidoMomento`); perguntas continuam **opcionais e sem default**
  (decisão da 137 preservada, rotuladas "(opcional)"); clicar de novo desmarca. Cancelar (ou
  clicar fora) só fecha — carrinho e seleções intactos. Modal também é resetado no
  `cancelarFluxoPedido`.

### Testes realizados (Playwright na conversa real do "Edvan Filho"; sintéticos apagados)
- **Inline removido**: 0 ocorrências de "Pagar quando?" no painel antes de abrir o modal —
  pergunta não existe mais em 2 lugares.
- **Modal abre** no clique de "Confirmar pedido" com as 2 perguntas (contagem 2/2) — screenshot
  conferido, visual espelhando o modal do balcão.
- **Cancelar não cria pedido**: fechou o modal e o carrinho continuou com o item (nenhum POST).
- **Confirmar grava igual à 137**: pedido real criado via modal com Dinheiro+Agora →
  `('dinheiro','agora')` no banco, mesmo comportamento de status/rascunho de sempre. Pedido e
  rascunho de teste apagados depois.
- `npx tsc --noEmit` e `npm run build` limpos.

### Status final
Concluída e em produção (`dpl_8anxsPi2xWuJuu5BS1mvGYBwFFrD`).
