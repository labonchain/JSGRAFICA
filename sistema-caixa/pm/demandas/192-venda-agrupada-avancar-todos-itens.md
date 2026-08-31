# 192 — Venda agrupada na aba Pedidos: avançar todos os itens de uma vez

Status: concluída
Criada em: 2026-07-15
Aprovada em: 2026-07-15
Concluída em: 2026-07-15
Chat executor: 03 - APP JS GRAFICA

## Contexto
A demanda 190 resolveu o mesmo problema no card do Atendimento/Inbox: uma venda com vários itens
precisava avançar status um por um (N cliques). Achado registrado no relato da 190: o painel de
venda agrupada da aba **Pedidos** (`PainelDetalheVenda`, `components/TelaPedidos.tsx`) ainda tem o
mesmo problema — avança item por item.

## Objetivo
Avançar todos os itens de uma venda agrupada de uma vez, na aba Pedidos, igual ao que a 190 já fez
no Atendimento.

## Escopo
- Incluído: aplicar o mesmo mecanismo da 190 (botão "Avançar os N itens → etapa", gate de
  pagamento abrindo uma vez só) no `PainelDetalheVenda` da aba Pedidos.
- Itens em etapas diferentes continuam com os botões individuais (mesmo comportamento da 190).
- Explicitamente fora de escopo: qualquer outra tela.

## Critérios de aceite
- [ ] Venda agrupada com todos os itens na mesma etapa tem botão único que avança todos
- [ ] Itens em etapas diferentes mantêm avanço individual
- [ ] Gate de pagamento (154/180) continua intacto
- [ ] Testado com venda sintética de 3+ itens

## Riscos e cuidados
Reaproveitar o mesmo mecanismo da 190 em vez de reimplementar do zero.

## Referências
Demanda 190 (mesmo mecanismo, outro lugar). `components/TelaPedidos.tsx` (`PainelDetalheVenda`).

## Relato de execução
Executada em 2026-07-15 (03 - APP JS GRAFICA, Fable 5). Deploy `dpl_H3AEArqb1iH3o1u3N34c8rWWacCG`.

### O que foi feito (mesmo mecanismo da 190, como o escopo mandou)
`PainelDetalheVenda` (aba Pedidos) ganhou o avanço em lote: quando 2+ itens ABERTOS estão na
mesma etapa, aparece **um botão de lote por destino possível** — detalhe próprio desta tela: o
`PROXIMO` daqui tem etapas com 2 destinos ("Pronto" → "✓ Entregue (levou agora)" OU
"📦 Aguardando retirada", da 065), então o lote vira 2 botões lado a lado, um por opção
("Todos os N itens: <destino>"). Gate de pagamento idêntico ao da 190/154: um
ModalConfirmarPagamento só, forma vale pra todos os itens não pagos, item já pago avança sem
receber forma (180 preservada). Etapas divergentes → aviso "avance um a um" e os botões por
item continuam (mesma regra da 190). `mudarStatusLote` no TelaPedidos: 1 PATCH por item mas UM
reload só no fim (o caminho por item recarrega a cada chamada).

### Testes (venda sintética de 3 itens não pagos, retira-depois; tudo apagado)
Pela UI (Playwright), esteira completa em lote: "Todos os 3 itens: Iniciar produção" → gate
abriu UMA vez (Dinheiro) → 3 confirmados+em produção juntos → "Marcar como pronto" em lote →
"pronto" virou os 2 botões de lote (screenshot) → "📦 Aguardando retirada" em lote →
divergência forçada (1 item devolvido a 'pronto') → aviso visível e lote some → item alinhado
pelo botão individual → lote voltou → "Marcar entregue" em lote SEM novo modal (já pagos).
Banco conferido no fim: 3 entregues/pagos Dinheiro. Critérios 1-4 todos exercitados.
