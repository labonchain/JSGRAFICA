# 061 — Categorias como botões grandes no centro (correção da 060)

Status: aprovada
Criada em: 2026-07-05
Aprovada em: 2026-07-05
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
A demanda 060 não entregou o que o Edvam tinha em mente — em especial o "Resumo de hoje" no
centro da tela, que ele **não pediu e não quer**. O pedido real, esclarecido com um mockup
aprovado (`https://claude.ai/code/artifact/ceab0e40-c82b-402f-8ae4-a481ae0e2cda`):

- Categorias viram **botões grandes e visíveis, no centro da tela** (não mais uma lista fina na
  lateral esquerda).
- Ao clicar numa categoria, os **produtos aparecem no mesmo lugar** (centro), não em outra área.

## Objetivo
A tela "Pedidos Balcão" usa o centro pra mostrar categorias grandes por padrão, e troca pro
grid de produtos da categoria escolhida no mesmo espaço — sem lista lateral fina de categorias.

## Escopo
- Incluído:
  1. **Remover o "Resumo de hoje"** da demanda 060 — não é mais desejado, tirar completamente
     (o cálculo de `itensVendidos`/total no dashboard pode continuar existindo se for usado em
     outro lugar, só não aparece mais nesta tela).
  2. **Estado inicial** (nenhuma categoria selecionada): centro mostra um grid de botões grandes,
     um por categoria (Xerox, Impressão, Plastificação, Encadernação, Recargas, Serviço
     Terceirizado, Personalizados, Escritório, Serviços, Entrada Avulsa) — ver mockup pra
     referência de tamanho/proporção.
  3. **Estado com categoria selecionada**: centro passa a mostrar o grid de produtos daquela
     categoria. Precisa de um jeito rápido de trocar de categoria sem "voltar" numa tela
     separada — no mockup isso é uma faixa de chips no topo do grid de produtos + botão
     "← Categorias". Pode ajustar o mecanismo exato, mas a ideia central (trocar categoria sem
     sair do centro) é o que importa.
  4. O carrinho (lateral direita) e o resto da tela (buscar/vincular contato, confirmar venda)
     continuam exatamente como estão hoje — não mexer.
  5. Manter o atalho de "produtos mais vendidos hoje" no carrinho vazio (item que a demanda 060
     acertou e o Edvam não reclamou) — só o "Resumo de hoje" no centro que sai.
- Fora de escopo: mudar o fluxo de confirmar venda/pedido; mudar categorias/produtos em si
  (isso já foi feito nas demandas 056/057).

## Critérios de aceite
- [ ] Tela sem categoria selecionada mostra os botões grandes de categoria no centro (sem
      "Resumo de hoje")
- [ ] Clicar numa categoria mostra os produtos dela no mesmo centro
- [ ] Dá pra trocar de categoria sem sair da área central
- [ ] Carrinho (lateral) e atalhos de mais vendidos continuam funcionando como já estava
- [ ] Testado visualmente (screenshot) nas duas telas (admin e PDV)

## Referências
Mockup aprovado: `https://claude.ai/code/artifact/ceab0e40-c82b-402f-8ae4-a481ae0e2cda`. Demanda
060 (a corrigir — ler o relato dela pra saber exatamente o que foi implementado e precisa
mudar). `app/page.tsx`, `app/pdv/page.tsx`.

## Relato de execução

### O que foi feito
Aplicado igual nas duas telas (`app/page.tsx` e `app/pdv/page.tsx`), seguindo o mockup aprovado:

1. **"Resumo de hoje" removido por completo** do centro — o campo `resumo.itensVendidos` no
   dashboard (criado na demanda 060) continua existindo (ainda alimenta o atalho de mais
   vendidos no carrinho), só parou de aparecer nesta tela.
2. **Lista lateral fina de categorias removida** — a coluna `w-44` com os botões estreitos saiu
   de vez.
3. **Estado inicial**: centro mostra um grid `grid-cols-4` de botões grandes (ícone + nome), um
   por categoria, com cabeçalho "Escolha uma categoria". Adicionado `iconeGrupo()` em
   `lib/dados.ts` (mapa categoria → emoji, com fallback 🏷️ genérico pra categoria nova que
   apareça no catálogo sem entrada aqui — já aconteceu antes, ver achados da 057/060).
4. **Estado com categoria selecionada**: cabeçalho vira o nome da categoria + botão
   "← Categorias" (volta pro grid). Abaixo, uma faixa de chips (mesmas categorias, com scroll
   horizontal) permite trocar de categoria com 1 clique sem sair do centro — clicar num chip
   troca o grid de produtos na hora, sem navegação nenhuma.
5. Carrinho (lateral direita), busca/vincular contato, atalho de "mais vendidos hoje" e o fluxo
   de confirmar venda **não foram tocados** — exatamente como a demanda pedia.

### Testes realizados
- `npx tsc --noEmit` e `npm run build` — limpos.
- Playwright local, admin (`admin.localhost:3000`) e PDV (`pdv.localhost:3000`, login Zu):
  - Confirmado "Resumo de hoje" **não aparece mais** em nenhuma das duas telas (0 ocorrências).
  - Grid de categorias grandes aparece no estado inicial, sem sidebar (confirmado `.w-44`
    ausente).
  - Clicar "Xerox" → produtos aparecem no mesmo centro, com "← Categorias" e a faixa de chips
    visíveis (screenshot conferido, bate com o mockup).
  - Clicar no chip "Plastificação" (estando na tela de Xerox) → troca direto pro grid de
    Plastificação, sem sair do centro nem precisar voltar antes (screenshot conferido).
  - Clicar "← Categorias" → volta pro grid de botões grandes.
- Confirmado visualmente (screenshot) nas duas telas, batendo com o mockup aprovado.

### Status final
**Concluída e deployada** (`dpl_4WpcyMRPvt9dqZfRTJRkuXqDWeXT`), testado local com Playwright
(admin + PDV) e confirmado em produção.
