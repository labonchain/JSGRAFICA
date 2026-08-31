# 100 — Refazer o mockup do Financeiro com fidelidade real (corrige a 094)

Status: concluída — aprovada visualmente pelo Edvam em 2026-07-07 (link: https://claude.ai/code/artifact/2b6ec6b8-c1a2-4cde-bf07-ecd8e8f0c011). Destrava a demanda 101.
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: 2026-07-07
Chat executor: 04 - FRONTEND JS GRAFICA

## Contexto
A demanda 094 (mockup do menu de relatórios nomeados) foi **rejeitada pelo Edvam** — o estado
"Proposta" foi recriado com CSS próprio (tokens `--azul`, `--verde` etc.) em vez de usar as
classes reais do app (Tailwind: `bg-blue-600`/`700`, `rounded-xl`, escala `text-xs`/`text-sm`,
cards `border-gray-200` — conferido direto em `components/TelaFinanceiro.tsx`). Mesmo com paleta
parecida, não bateu com o layout de hoje. Citação direta do Edvam: **"esse artefato não veio nada
parecido com o que é o layout hoje... bem fora do escopo. Se fosse pra fazer assim vc teria
feito."** Ver `pm/conhecimento/checklist-reestruturacao-financeiro.md` (A8) — este mockup
**bloqueia** a demanda 101 (implementação real), que só pode começar depois de aprovado.

## Objetivo
Mockup do menu de 3 relatórios nomeados (Fluxo de Caixa / Controle de Caixa / Relatório de
Saídas) dentro do Financeiro, fiel o bastante pro Edvam aprovar de primeira — sem recriar a UI do
zero.

## Escopo
- Incluído:
  1. **Antes de desenhar qualquer coisa**: ler `components/TelaFinanceiro.tsx` de verdade e
     listar as classes/cores/espaçamentos exatos usados hoje (não estimar de memória).
  2. Preferir **anotar em cima do print real** (Playwright, produção, mesmo processo da 094) —
     setas, badges sobrepostos, crop — em vez de reconstruir a tela em HTML/CSS do zero. Se
     precisar desenhar algo novo (ex. os 3 cards de relatório, que não existem hoje), usar as
     classes Tailwind reais copiadas do componente, não CSS customizado com tokens próprios.
  3. Mostrar: (a) estado atual (print real, sem alteração), (b) proposta — os 3 cards nomeados
     (📈 Fluxo de Caixa / 🔒 Controle de Caixa / 💸 Relatório de Saídas) substituindo o seletor de
     período único, cada um com filtro de Período + Operador + botão "Visualizar" — mesmo padrão
     de toggle "Hoje"/"Proposta" já aprovado na 087.
- Fora de escopo: implementar de verdade — é mockup, aguarda aprovação visual antes da 101.

## Critérios de aceite
- [x] Mockup usa as classes/cores reais do app (Tailwind, conferidas linha a linha em
      `TelaFinanceiro.tsx`), não CSS aproximado
- [x] Link do mockup compartilhado pro PM/Edvam revisar
- [ ] PM confirma visualmente antes de liberar a demanda 101 — depende de resposta do Edvam,
      fora do meu controle

## Riscos e cuidados
Já foi rejeitado 1x por esse motivo — não repetir o erro. Se tiver dúvida sobre qual classe usar
em algum elemento novo (ex. os cards de relatório, que não existem hoje), preferir copiar de um
componente existente parecido (ex. os cards de "Top produtos"/"Melhores dias" já existentes em
`TelaFinanceiro.tsx`) a inventar estilo novo.

## Referências
`components/TelaFinanceiro.tsx` (fonte de verdade do layout real). Demanda 094 (motivo da
rejeição, não repetir). Demanda 087 (mecanismo de toggle Hoje/Proposta aprovado).
`pm/conhecimento/checklist-reestruturacao-financeiro.md` (A8/A9).

## Relato de execução

**Status final: mockup concluído e publicado — aguardando aprovação visual (fora do meu controle)**

### O que foi feito
1. **Li `components/TelaFinanceiro.tsx` inteiro, linha a linha**, antes de desenhar qualquer
   coisa (era exatamente o passo pulado na 094). Listei as classes reais a reaproveitar:
   - Wrapper: `overflow-y-auto h-full bg-gray-50`, conteúdo `p-5 space-y-4`
   - Cards: `bg-white rounded-xl border border-gray-200 p-5` (título `text-sm font-semibold
     text-gray-700`, descrição `text-xs text-gray-400`)
   - Botão período/"Aplicar": `border border-gray-200 rounded-lg px-2 py-1.5 text-xs
     focus:outline-none focus:border-blue-400 bg-white` (inputs) e `px-3 py-1.5 bg-blue-600
     text-white rounded-lg text-xs font-medium hover:bg-blue-700` (botão)
   - "Resultado do período": `rounded-xl border p-4` com `bg-blue-50 border-blue-100` (positivo)
   - Nav real de `app/page.tsx`: header `bg-blue-700 text-white px-6 py-3`; 1ª fileira
     `h-[46px] text-sm ... border-blue-600 text-blue-700 font-bold` (atual) /
     `border-transparent text-gray-500` (inativo); 2ª fileira `bg-blue-50 ... h-[38px]
     text-[13px] ... border-blue-600 text-blue-800 font-bold` (atual)
2. **Print real via Playwright** (mesmo processo da 094, produção): descobri que o container que
   rola de verdade não é o `<body>` nem o `<main>` (que ficam travados em `h-screen`/
   `overflow-hidden`) — é o próprio `div.overflow-y-auto.h-full` do componente. Medi a altura real
   do conteúdo por esse seletor específico (não por `main`, que dava uma altura menor e cortava
   as seções "Produtos mais vendidos"/"Melhores dias"/"Por semana" sem eu perceber — corrigido
   antes de montar o mockup). Cortei o print exatamente na borda inferior do botão "Aplicar" (fim
   da fileira de período) em 2 imagens: topo (header+nav+fileira de período) e resto (tudo dali
   pra baixo, sem alteração nenhuma).
3. **Mockup**: reaproveitei o mecanismo de toggle "Hoje"/"Proposta" da 087. "Hoje" = as 2 imagens
   reais empilhadas (idênticas ao print único). "Proposta" = header/nav + os 3 cards de relatório
   reconstruídos em HTML usando **as mesmas strings de classe Tailwind** do código-fonte (não
   CSS próprio) + a mesma imagem real do "resto" da tela colada embaixo, sem alteração — prova
   visual de que só a fileira de período muda. Escrevi um subconjunto de CSS que define cada
   classe Tailwind usada (`bg-blue-600`, `rounded-xl`, `text-xs`, etc.) com os valores reais do
   Tailwind (hex/rem oficiais), então o HTML usa literalmente os mesmos nomes de classe do
   componente — quem conferir o `className` contra o arquivo real encontra a mesma string, não
   uma aproximação.
4. Os 3 cards de relatório (que não existem hoje) usam o container de card real (`bg-white
   rounded-xl border border-gray-200 p-4`, variante `p-4` já usada na própria tela pro
   "Resultado do período") + estado selecionado com `border-2 border-blue-600 bg-blue-50`. Filtro
   Período/Operador/Visualizar reaproveita literalmente as classes do input/botão "Aplicar" já
   existentes (só troquei o texto do botão e dupliquei o campo pra Período+Operador).

### Testes realizados e resultado
1. Self-check visual (Playwright, arquivo local): tirei screenshot dos estados "Hoje" e "Proposta"
   antes de publicar — a costura entre o bloco novo (cards) e a imagem real colada embaixo é
   invisível, cores/fontes/espaçamento batem exatamente com o resto da tela real.
2. Link publicado como Artifact: **https://claude.ai/code/artifact/2b6ec6b8-c1a2-4cde-bf07-ecd8e8f0c011**

### Achados fora do escopo
- Notei uma aba nova "📋 Contas a Pagar/Receber" na navegação real (não existia na 094) — outro
  chat implementou esse item do checklist (A3/A4) nesse meio tempo. Incluí essa 4ª aba na 2ª
  fileira reconstruída do mockup pra ficar fiel ao estado atual, sem mexer em mais nada relativo
  a ela.
- O mesmo achado de cache/medição de altura (container real vs `main`) pode valer a pena registrar
  como nota técnica se algum chat precisar tirar prints full-page dessa tela de novo no futuro —
  `document.querySelector('.overflow-y-auto.h-full')` é o seletor certo, não `main`/`body`.

### Status final
Mockup concluído e publicado, desta vez com fidelidade real conferida linha a linha. Falta só a
aprovação visual do Edvam antes de liberar a demanda 101 — isso não depende de mim.
