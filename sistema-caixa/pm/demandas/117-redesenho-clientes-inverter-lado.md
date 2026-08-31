# 117 — Tela Clientes: inverter lado da barra de detalhe

Status: concluída — deployada em produção
Criada em: 2026-07-08
Aprovada em: 2026-07-08
Concluída em: 2026-07-08
Chat executor: 04 - FRONTEND JS GRAFICA

## Contexto
Item 13 do backlog. Edvam pediu pra inverter o layout da tela Clientes: o painel de detalhe do
contato (resumo, aniversário/endereço, histórico de pedidos) deve ficar na **direita**, e a lista
de contatos (lista ou grade) no centro/esquerda — hoje está com a lista estreita numa lateral e o
detalhe ocupando o resto.

## Objetivo
Layout de Clientes com a lista de contatos mais espaçosa no centro/esquerda, painel de detalhe
compacto na direita.

## Escopo
- Incluído: inverter a estrutura de colunas em `components/TelaClientes.tsx` — lista de contatos
  (com os toggles lista/grade e ordenação já existentes) ganha mais espaço central/esquerdo,
  painel de detalhe do contato selecionado vai pra uma coluna à direita.
- Fora de escopo: mudar o conteúdo do painel de detalhe em si (campos, histórico) — só a posição.

## Critérios de aceite
- [x] Lista de contatos ocupa a área central/esquerda, com mais espaço que hoje
- [x] Painel de detalhe do contato selecionado fica à direita
- [x] Toggle lista/grade e busca continuam funcionando normalmente

## Riscos e cuidados
Mudança visual isolada, sem lógica nova — baixo risco.

## Referências
`components/TelaClientes.tsx` (demanda 086, construção original da tela).

## Relato de execução

**Status final: concluída — deployada em produção**

### O que foi feito
A ordem no DOM (lista primeiro, detalhe depois) já colocava a lista à esquerda — o problema era
só o **dimensionamento**: lista tinha `w-96 shrink-0` (largura fixa, estreita) e detalhe tinha
`flex-1` (ocupava o resto). Bastou trocar os dois: lista virou `flex-1` (ocupa o espaço
disponível), detalhe virou `w-96 flex-shrink-0` (largura fixa, compacta) — sem reordenar nada,
sem tocar no conteúdo do painel de detalhe (fora de escopo, confirmado).

Ajuste adicional dentro do escopo da própria lista (não do painel de detalhe): a visualização em
**grade** tinha `grid-cols-2` fixo, pensado pra uma coluna estreita de 384px — com a lista agora
ocupando bem mais espaço, 2 colunas deixaria muito vão vazio. Aumentei pra `grid-cols-3`, já que a
lista é o que "ganhou mais espaço" no pedido original — só usa o espaço novo, sem mudar nenhuma
lógica.

### Testes realizados e resultado
1. `npx tsc --noEmit`, `npx eslint`, `npm run build` limpos.
2. **Deploy em produção**: `npx vercel --prod --yes` → **`dpl_HkUop79izMUFgK8QKb9dY9PHeojA`**
   (mesmo deploy das demandas 110/115).
3. **Playwright em produção** (`pdv.jsgrafica.site`, login Edvam): aba Clientes aberta,
   selecionado um contato real da lista — confirmado visualmente (screenshot) que a lista ocupa a
   maior parte da tela à esquerda/centro (com fotos, nome, status, última mensagem visíveis sem
   cortar) e o painel de detalhe (nome editável, selo de status, resumo de recebidas/enviadas,
   aniversário/endereço, histórico de pedidos) ficou compacto à direita. Toggle lista/grade e
   campo de busca continuam no mesmo lugar, funcionando (usados durante o próprio teste pra
   navegar até o contato).

### Achados fora do escopo
Nenhum.

### Status final
Concluída e deployada em produção (`dpl_HkUop79izMUFgK8QKb9dY9PHeojA`). Os 3 critérios de aceite
confirmados em produção.
