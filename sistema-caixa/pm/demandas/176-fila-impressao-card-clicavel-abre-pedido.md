# 176 — Fila de impressão: clicar no card deve abrir o pedido

Status: concluída
Criada em: 2026-07-15
Aprovada em: 2026-07-15
Concluída em: 2026-07-15
Chat executor: 03 - APP JS GRAFICA

## Contexto
Na "Fila de impressão" (`components/TelaPedidos.tsx`, `CardFila`), o card de cada pedido só
responde aos botões de ação ("Marcar como pronto"/"Iniciar produção", "✕" cancelar) — clicar em
qualquer outra parte do card (nome do cliente, número do pedido, serviço) não faz nada, não abre
o detalhe do pedido. Princípio geral do Edvam: **qualquer elemento que representa um pedido tem
que estar obviamente linkado a esse pedido** — é confuso ter um card com cara de "clicável" que na
verdade só reage a 2 botões específicos.

## Objetivo
Clicar em qualquer parte do card (fora dos botões de ação) abre o detalhe completo do pedido.

## Escopo
- Incluído: `CardFila` ganha um clique no corpo do card (fora dos botões) que abre o mesmo painel
  de detalhe (`PainelDetalhe`) usado em "Todos os pedidos" — decisão do executor sobre o mecanismo
  exato (modal, navegar pra aba "Todos os pedidos" já com esse pedido selecionado, etc.), desde
  que abra o detalhe completo, não só uma ação rápida.
- Os botões de ação continuam funcionando exatamente como hoje (clique neles não deve também
  disparar a abertura do detalhe — usar `stopPropagation` ou equivalente).
- Explicitamente fora de escopo: revisar outros lugares do app com o mesmo problema (se o executor
  achar mais casos parecidos, registrar pro PM, não corrigir tudo nesta demanda).

## Critérios de aceite
- [ ] Clicar no corpo do card na Fila de impressão abre o detalhe do pedido
- [ ] Clicar nos botões de ação continua fazendo só a ação (não abre o detalhe também)
- [ ] Testado com pelo menos 2 pedidos reais/sintéticos na fila

## Riscos e cuidados
Cuidado pra não quebrar o clique dos botões existentes (propagação de evento).

## Referências
`components/TelaPedidos.tsx` (`CardFila`, view "fila"). Print do Edvam, 2026-07-15.

## Relato de execução
Executada em 2026-07-15 (03 - APP JS GRAFICA, Fable 5). Deploy do lote `dpl_4HA2DPHLKjSSYN2fVu4AW8mmTdVs`.

### Mecanismo escolhido (decisão do executor)
Clicar no corpo do `CardFila` volta pra view "Todos os pedidos" já com o pedido SELECIONADO —
o mesmo `PainelDetalhe` completo de sempre (e venda agrupada quando o pedido faz parte de um
carrinho com 2+ itens, igual à seleção normal da lista). Card com `cursor-pointer` + hover
azul (fica com cara de link, o princípio do Edvam); botões de ação e o link de arquivo com
`stopPropagation` — continuam fazendo só a ação; modal aberto bloqueia a navegação do clique
que borbulha do overlay.

### Testes (Playwright, 2 pedidos na fila)
Clique no corpo (nome do cliente) → abriu o detalhe completo do pedido certo; clique em
"Iniciar produção" no card → SÓ avançou o status, seguiu na fila sem abrir detalhe
(contra-prova); "✕" cancelar continua só cancelando (ganhou de brinde o modal da 177 quando o
pedido é pago). Sintéticos apagados.

### Achado fora de escopo (registrado, como a demanda pediu)
Mesmo padrão "card que parece clicável mas só os botões respondem" existe no cartão "📦 Pedido
desta conversa" do Inbox — fica pro PM decidir se vira demanda.
