# 175 — Tela de Pedidos: melhor aproveitamento do espaço

Status: concluída
Criada em: 2026-07-15
Aprovada em: 2026-07-15
Concluída em: 2026-07-15
Chat executor: 03 - APP JS GRAFICA

## Contexto
Na aba "Todos os pedidos" (`components/TelaPedidos.tsx`, view "lista"), a lista de pedidos fica
espremida numa coluna estreita à esquerda (`w-80`), e o painel da direita fica enorme e vazio —
quando nada está selecionado, mostra só "Selecione um pedido para ver os detalhes" centralizado
num espaço em branco gigante. Print do Edvam mostra isso claramente: telas grandes desperdiçam
muito espaço horizontal.

## Objetivo
Melhor aproveitamento do espaço da tela — lista com mais espaço quando fizer sentido, e o painel
direito não fica um vazio enorme sem informação nenhuma quando não há seleção.

## Escopo
- Incluído: repensar o layout da view "lista" — largura da coluna esquerda, e o que mostrar no
  painel direito quando nada está selecionado (decisão do executor: pode ser um resumo/atalhos
  úteis em vez de só uma frase vazia — ex. contagem por status, pedidos mais recentes, o que fizer
  sentido pra tela não ficar "morta").
- Manter responsivo (funciona em telas menores também, não só monitor grande).
- Explicitamente fora de escopo: mudar a lógica de filtro/busca/seleção (já funciona) — só o
  aproveitamento visual do espaço.

## Critérios de aceite
- [ ] Painel direito sem seleção mostra algo útil, não só espaço vazio
- [ ] Lista de pedidos usa o espaço melhor (decisão do executor sobre a proporção exata)
- [ ] Testado em resolução normal de desktop e numa tela menor

## Riscos e cuidados
Nenhum risco de dado — é só layout visual sobre funcionalidade que já existe.

## Referências
`components/TelaPedidos.tsx` (view "lista"). Print do Edvam, 2026-07-15.

## Relato de execução
Executada em 2026-07-15 (03 - APP JS GRAFICA, Fable 5). Deploy do lote `dpl_4HA2DPHLKjSSYN2fVu4AW8mmTdVs`.

### O que foi feito
1. **Lista cresce com a tela**: `w-80` fixo virou `w-80 xl:w-96 2xl:w-[28rem]` — em monitor
   grande a coluna ganha até ~35% de largura; em tela pequena fica como era (responsivo, sem
   quebrar nada).
2. **Painel direito sem seleção virou "Panorama dos pedidos"** (decisão do executor): contagem
   por status em cards CLICÁVEIS (aplicam o filtro da lista), faixa de pagamentos pendentes
   (quantos + valor), faixa vermelha de estornos detectados (integra a 178) e os 6 pedidos em
   aberto mais recentes, clicáveis (selecionam direto). Tudo derivado da lista JÁ carregada —
   zero chamada nova. A frase morta "Selecione um pedido..." não existe mais.

### Testes
Playwright em 1600×900 com dado real (panorama com contagens reais, screenshot) e conferência
em viewport menor (1280×800 — coluna volta a 320px, panorama empilha em 2 colunas); filtros e
seleção pelos atalhos funcionando; regressão de busca/seleção normal intacta (os testes das
outras demandas do lote rodaram todos por esta tela).
