# 091 — "Lançar Saídas" não mostra o que já foi lançado (fica vago)

Status: aprovada
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Edvam usando o sistema: a tela "Lançar Saídas" é só um formulário — depois de lançar uma saída,
não tem nenhuma lista/histórico visível ali mesmo do que já foi registrado (nem na barra
lateral, nem embaixo do formulário). Fica "vago" — quem lança não sabe se já lançou aquilo antes,
nem consegue conferir rápido o que já entrou hoje sem sair da tela.

## Objetivo
A tela "Lançar Saídas" mostra as saídas já lançadas (pelo menos do dia), visível na mesma tela,
sem precisar ir pra outra aba.

## Escopo
- Incluído: adicionar uma lista (lateral ou abaixo do formulário — decisão de UI do executor,
  seguindo o padrão visual já usado nas outras telas) com as saídas já lançadas, pelo menos do
  dia atual (categoria, valor, operador, horário). Atualizar a lista assim que uma nova saída for
  lançada, sem precisar recarregar a página.
- Fora de escopo: filtro por período nessa lista (é só pra dar visibilidade do dia, a visão por
  período fica na tela "Financeiro", demanda 075).

## Critérios de aceite
- [ ] Lista de saídas do dia aparece na própria tela "Lançar Saídas"
- [ ] Lançar uma nova saída atualiza a lista na hora, sem recarregar
- [ ] Testado lançando 2+ saídas reais e conferindo que aparecem na lista

## Referências
`app/api/saidas/route.ts`. Componente da tela "Lançar Saídas" (verificar nome exato no código).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  Achado no código antes de implementar: a tela "Lançar Saídas" (`TelaSaidas` em `app/page.tsx`)
  **já tinha** o painel lateral "Lançamentos de hoje" pronto e renderizado — só que o estado
  `historico` começava vazio (`useState([])`) e só era populado localmente, na sessão do
  navegador, a cada saída lançada ali mesmo. Nunca buscava do servidor: recarregar a página, ou
  abrir a tela sem ter lançado nada antes, mostrava sempre vazio mesmo com saídas reais já
  lançadas no dia — exatamente o sintoma da demanda.
  1. `app/api/saidas/route.ts` (GET): passou a selecionar também `operador` e `created_at` (antes
     só `categoria_nome, valor`), e ordenar por `created_at` decrescente (mais recente primeiro,
     mesma convenção que a lista já usava).
  2. `TelaSaidas`: nova `carregarHistorico()` busca `/api/saidas` e popula `historico` de verdade
     (categoria, valor, operador, hora formatada) — chamada ao montar o componente e de novo,
     depois de cada `lancarSaida()` bem-sucedido, em vez de continuar só empilhando localmente.
     Estado de carregamento (`carregandoHistorico`) adicionado pro "Carregando..." não piscar
     "Nenhuma saída lançada ainda hoje" por engano antes do fetch responder.
- Testes realizados e resultado:
  Lançada 1 saída de teste real (`Fornecedores`, R$12,50, operador `TesteAutomatizado`) via
  `POST /api/saidas` e confirmado via `GET` que ela aparece junto com uma saída **real** que o
  próprio Edvam lançou nesse meio tempo (`Sistemas (RedeSuc)`, R$30,24) — as duas apareceram
  corretamente na lista via UI (Playwright, screenshot confirmando categoria/valor/hora/operador
  de cada uma). `npx tsc --noEmit` e `npm run build` rodaram limpos (build teve 2 crashes
  transitórios de worker do Next.js no Windows por resource contention — dezenas de processos
  Chrome órfãos de testes anteriores nesta sessão consumindo memória; matei todos e o build
  seguinte rodou limpo). Deploy em produção: `npx vercel --prod --yes` →
  `dpl_H5zjszZqaXarxTXWTepTpDktgk3Z` (junto com a 092, mesmo working tree), reconfirmado com
  `/api/saidas` respondendo em produção com os campos novos. Registro de teste (`Fornecedores`,
  R$12,50) apagado do Supabase depois — o lançamento real do Edvam (`Sistemas (RedeSuc)`,
  R$30,24) não foi tocado.
- Achados fora do escopo:
  Durante os testes de UI desta sessão, descobri dezenas de processos `chrome.exe` órfãos
  (Playwright que não fechou o browser corretamente em testes anteriores, incluindo scripts meus
  de demandas passadas) consumindo até ~460MB cada — provável causa dos 2 crashes de build por
  falta de memória. Também descobri que `browser.close()` sozinho não encerra o processo Node do
  script de teste (precisa de `process.exit(0)` explícito no fim) — não é um problema do app, é só
  da minha própria automação de teste; registro só pra próximas sessões não perderem tempo com o
  mesmo sintoma.
- Status final: concluída.
