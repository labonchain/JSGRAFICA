# 123 — Saídas: reorganizar em previstas (por data) + lançadas, categoria vira botão lateral

Status: concluída
Criada em: 2026-07-08
Aprovada em: 2026-07-08
Concluída em: 2026-07-08
Chat executor: 03 - APP JS GRAFICA

## Contexto
Edvam revisou "💸 Lançar Saídas" (só Admin, PDV nunca acessa — confirmado, 102 cancelada) e pediu
reorganização. Hoje (`TelaSaidas`, `app/page.tsx:839`) a tela é: grade grande de botões de
categoria ocupando a área principal → escolhe categoria → formulário de valor aparece → lista
"Lançamentos de hoje" embaixo → card "contas a vencer em 7 dias" (097) clicável pra Contas a
Pagar/Receber.

Pedido: virar **"Saídas"** (tira "Lançar" do nome), e a área principal passa a mostrar 2 listas:
1. **Saídas previstas** — não só o resumo "R$X a vencer em 7 dias" (097), mas a **lista completa**
   das contas a pagar pendentes, com data de vencimento e valor de cada uma (fonte: Contas a
   Pagar/Receber, 095/096, `tipo: 'pagar'`, `status: 'pendente'` — sem limite de 7 dias, tudo que
   está pendente).
2. **Lançamentos já feitos** — o que já existe hoje (demanda 091), sem mudança de fonte.

A escolha de categoria pra "adicionar uma saída" vira um **botão** (não mais a grade grande
ocupando a tela toda) — abre o formulário, com as categorias organizadas numa **coluna à
esquerda** da tela, em vez de ocupar o centro inteiro antes de escolher.

## Objetivo
Tela "Saídas" prioriza visualmente o que importa pra decisão do dia (previstas + já lançadas), e
lançar uma saída nova vira uma ação secundária (botão + coluna lateral), não o conteúdo principal.

## Escopo
- Incluído:
  1. Renomear a aba de "Lançar Saídas" pra "Saídas" (`app/page.tsx`, array de abas).
  2. Nova seção "Saídas previstas" — lista completa (não só resumo) de contas a pagar pendentes,
     ordenada por vencimento, mostrando nome/categoria/valor/data. Reaproveitar a API de Contas a
     Pagar/Receber (096) — não duplicar lógica de busca. Cada item pode levar pra Contas a Pagar/
     Receber (mesmo padrão de clique já usado no card da 097) pra dar baixa.
  3. Seção "Lançamentos de hoje" (091) continua existindo, sem mudança de fonte de dado — só
     reposicionar no novo layout.
  4. Botão "+ Adicionar saída" — abre o formulário de categoria/valor (o que hoje é a grade
     grande) numa coluna à esquerda ou um painel dedicado, não mais ocupando a área principal
     antes de qualquer escolha.
  5. Card "contas a vencer em 7 dias" (097): avaliar se ainda faz sentido como resumo separado
     agora que a lista completa de previstas já está na tela — pode virar redundante. Decidir ao
     implementar, registrar a escolha no relato.
- Fora de escopo: mudar a lógica de cadastro/baixa de Contas a Pagar/Receber (096) — só
  reorganizar como aparece aqui. PDV continua sem acesso a essa aba (não reabrir essa decisão).

## Critérios de aceite
- [x] Aba renomeada pra "Saídas"
- [x] Lista completa de saídas previstas (contas a pagar pendentes, por data) visível na tela
- [x] Lista de lançamentos já feitos continua funcionando (091, sem regressão)
- [x] Adicionar saída vira botão + categoria numa coluna lateral, não a tela inteira
- [x] Testado com dado real (contas a pagar reais cadastradas) mostrando a lista ordenada certo

## Riscos e cuidados
Reorganização de layout numa tela usada todo dia — testar o fluxo completo de lançar uma saída
nova depois da mudança (categoria → valor → confirmar) pra garantir que não ficou mais lento ou
confuso do que antes.

## Referências
`app/page.tsx` (`TelaSaidas`, linha 839), `app/api/contas-pagar-receber` (095/096), demanda 091
(lançamentos de hoje), demanda 097 (card "a vencer", pode virar redundante).

## Relato de execução

- **O que foi feito:**
  - Aba renomeada "Lançar Saídas" → "Saídas" (`app/page.tsx`, array `abas` — só o admin acessa
    essa aba, PDV nunca teve, 102 cancelada, não reaberta).
  - Layout invertido: coluna esquerda (`w-72`) virou "Adicionar saída" — colapsada por padrão só
    com o botão "+ Adicionar saída"; ao clicar, expande na própria coluna a lista vertical de
    categorias (antes era grade 3 colunas ocupando a área principal) + o formulário
    (valor/descrição, ou o formulário especial de Recarga VEM) empilhado logo abaixo da categoria
    escolhida — tudo dentro da coluna estreita, sem precisar de modal novo. "⚙️ Gerenciar
    categorias" continua acessível (só aparece quando a coluna está expandida).
  - Área principal (antes era a grade de categorias) virou 2 seções empilhadas:
    1. **"Saídas previstas"** — nova. Busca `GET /api/contas-pagar-receber` **sem parâmetro**
       (mesmo endpoint que a própria tela de Contas a Pagar/Receber usa, sem duplicar lógica de
       busca no servidor) e filtra no cliente `tipo === "pagar" && status !== "pago"` — já vem
       ordenado por vencimento (a API já ordena assim). Mostra nome/categoria/valor/vencimento de
       cada conta, badge "Atrasado" quando aplicável, total pendente no cabeçalho, e cada linha é
       clicável (`onAbrirContasPagarReceber`, mesmo padrão de navegação que o card da 097 já
       usava) pra ver detalhes/dar baixa em Contas a Pagar/Receber.
    2. **"Lançamentos de hoje" (091)** — mesma fonte (`GET /api/saidas`), mesmo hook
       `carregarHistorico()`, zero mudança de lógica — só saiu da coluna lateral fina e virou um
       card na área principal, em grade (2-3 colunas conforme largura) em vez de lista vertical
       única.

- **Achado/decisão sobre o card da 097 (pedido explícito da demanda pra decidir e registrar)**:
  **removido por completo**, não só escondido. Virou redundante de verdade — a lista completa de
  "Saídas previstas" já mostra tudo que o card resumia (total + contagem), só que com todos os
  detalhes junto (não só 7 dias, todas as pendentes) — manter os dois seria mostrar a mesma
  informação 2x na mesma tela. Removi também o código morto que ficou órfão depois disso, já que
  nenhum outro lugar usava: a branch `?resumo=vencer` em `app/api/contas-pagar-receber/route.ts`
  (GET) e a função `getTotalContasAVencer()` em `lib/supabase-admin.ts` — confirmado por grep antes
  de apagar que não tinham nenhum outro chamador.

- **Testado com dado real (não sintético), exatamente como o critério de aceite pede** — a base já
  tinha 9 contas a pagar reais cadastradas (aluguel, telefone/internet, folha da Gabi, placa solar
  etc.), incluindo 1 vencida (`Vivo - telefone`, venceu 01/07, hoje é 08/07) — sem precisar criar
  nenhum dado sintético pra essa parte:
  - Lista "Saídas previstas" renderizou as 9, ordenada por vencimento crescente, badge "Atrasado"
    certo na Vivo vencida, total pendente exato (R$ 3.298,25) — confirmado via Playwright.
  - Fluxo completo de lançar saída nova testado do zero: botão "+ Adicionar saída" → coluna expande
    com categorias em lista vertical → escolhe "Fornecedores" → formulário aparece na mesma coluna
    → preenche valor/descrição → "Lançar" → confirmado via SQL que gravou certo
    (`categoria_nome: "Fornecedores"`, `valor: 12.34`) e que a coluna recolhe a seleção depois —
    sem regressão no fluxo em si, só mudou de lugar na tela. Apagado depois.
  - "Lançamentos de hoje" confirmado funcionando sem regressão com um lançamento real do dia
    (Repasse Recarga Celular, R$27,50, Gabi, 10:05) — mesma fonte/lógica de sempre, só reposicionada.

- **Verificações finais:** `npx tsc --noEmit` e `npm run build` limpos.

- **Status final:** concluída e em produção (`dpl_6Tjh5AfiK9uhhsFzkL3hgiEnK8Xt`, aliasado em
  `pdv.jsgrafica.site` e `admin.jsgrafica.site`).
