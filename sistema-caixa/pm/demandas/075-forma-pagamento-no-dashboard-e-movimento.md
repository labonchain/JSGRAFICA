# 075 — Unificar Movimento + Dashboard numa tela "📊 Financeiro" (reformulada)

Status: concluída
Criada em: 2026-07-06
Aprovada em: 2026-07-07
Concluída em: 2026-07-07
Chat executor: 03 - APP JS GRAFICA

## Contexto
Demanda original pedia só forma de pagamento no Dashboard e Movimento, separadamente — mas isso
duplicaria esforço (mesma informação, duas telas). Discutido com o Edvam: as duas telas mostram
basicamente a mesma coisa (entradas, saídas, resultado), só com filtro de tempo diferente —
"Movimento" (dia) e "Dashboard" (período). Proposta aceita: virar **1 tela só**, "📊 Financeiro"
(ver `pm/conhecimento/proposta-fluxo-financeiro.md`).

Feedback adicional do Edvam usando o sistema:
- **Movimento não tem seletor de período** — só mostra o dia, sem poder escolher outro intervalo
  (o Dashboard já tem isso: Hoje/Semana/Mês/Personalizado).
- **Resumo deveria ficar no topo, entradas de um lado e saídas do outro** — hoje a informação
  está espalhada, difícil de escanear rápido.
- Achado à parte, não confirmado pelo PM na investigação de código (aggregação de produtos já
  bate certo hoje, testado direto no banco) — se o ranking de produtos ainda aparecer contando
  pedido por pedido em vez de agrupar por produto, reportar com um exemplo concreto (nome do
  produto, período) pra investigar a fundo; não incluir correção às cegas nesta demanda.

## Objetivo
Uma tela só, "📊 Financeiro", substituindo Movimento e Dashboard — com seletor de período,
resumo claro (entradas de um lado, saídas do outro, no topo) e quebra por forma de pagamento.

## Escopo
- Incluído:
  1. Nova tela "📊 Financeiro" (substitui as abas "Movimento" e "Dashboard" — remover as duas do
     menu, não manter as três).
  2. Seletor de período: Hoje / Semana / Mês / Personalizado (reaproveitar o que o Dashboard já
     tem em `app/api/dashboard/route.ts`, não reinventar).
  3. Resumo no topo, lado a lado: total de Entradas (com quebra por forma de pagamento —
     dinheiro/cartão/Pix/"paga na retirada"/"não informado", ver regra abaixo) de um lado, total
     de Saídas (por categoria) do outro, resultado do período em destaque.
  4. Abaixo do resumo: produtos mais vendidos (ranking, já existe e agrega corretamente por
     nome — só migrar pra cá) e saídas por categoria (já existe no Dashboard).
  5. Regra de forma de pagamento: `forma_pagamento` só existe em `jsgrafica_pedidos` desde a
     demanda 066 — pedidos sem essa informação (antigos, ou do Inbox sem pagamento confirmado)
     caem visivelmente em "não informado", nunca somados em silêncio noutra categoria nem
     escondidos.
- Fora de escopo: mudar o cálculo de saldo acumulado histórico (isso é a demanda 090, correção de
  dado separada). Investigar o ranking de produtos sem um exemplo concreto reportado.

## Critérios de aceite
- [x] Tela "Financeiro" única, com seletor de período funcionando
- [x] Resumo no topo mostra Entradas e Saídas lado a lado, com forma de pagamento quebrada
- [x] Abas "Movimento" e "Dashboard" removidas do menu (substituídas pela nova)
- [x] Testado com pelo menos 2 formas de pagamento diferentes e 2 períodos diferentes

## Referências
`pm/conhecimento/proposta-fluxo-financeiro.md` (proposta completa). `app/api/dashboard/route.ts`
e `app/api/movimento/route.ts` (lógica a unificar, não duplicar). `jsgrafica_pedidos.forma_pagamento`
(demanda 066). Demanda 090 (correção do saldo acumulado histórico, tratada à parte).

## Relato de execução

- **O que foi feito:**
  - Nova tela "📊 Financeiro" (`components/TelaFinanceiro.tsx`), substitui "Movimento" e
    "Dashboard" — as duas abas removidas do menu do admin e do PDV (`app/page.tsx`,
    `app/pdv/page.tsx`), grupo "💰 Financeiro" passou a apontar só pra "financeiro" (junto com
    "Lançar Saídas"/"Fechar Caixa"). Removidos: componente `TelaMovimento.tsx`,
    rota `app/api/movimento/route.ts` (nada mais os usava).
  - `app/api/dashboard/route.ts` reaproveitado (não duplicado) — seletor de período
    Hoje/Semana/Mês/3 meses/Ano/Todo histórico/Personalizado já existia ali, só adicionei
    `entradasPorFormaPagamento` (novo campo, quebra por Dinheiro/Cartão/Pix/Paga na
    retirada/Não informado, usando `jsgrafica_pedidos.forma_pagamento` da demanda 066 — pedidos
    sem a informação e `jsgrafica_vendas` histórico caem juntos em "Não informado", visível, como
    pedido explicitamente pela demanda).
  - Resumo do topo reorganizado: Entradas (com a quebra por forma de pagamento dentro) e Saídas
    (com a quebra por categoria dentro) lado a lado, resultado do período em destaque abaixo —
    mesmo padrão visual usado no resumo lado a lado da 074 (`TelaFechamento.tsx`), consistência
    entre as duas telas financeiras.
  - Acesso: "Financeiro" ficou disponível tanto no admin quanto no PDV (Zu/Gabi) — mesma
    visibilidade que "Movimento" já tinha no PDV antes; a diferença é que agora Zu/Gabi também
    ganham o seletor de período (antes só o admin tinha isso, via Dashboard).
  - **Achado corrigido no processo (bug real, não só cosmético)**: com period="hoje" (novo
    padrão da tela), o resumo do topo mostrava R$0,00 mesmo com o dia tendo entradas reais — a
    soma do resumo do período sempre vinha só de `jsgrafica_fechamento` (rollup gerado ao fechar
    o caixa), e "hoje" só ganha linha nessa tabela quando alguém fecha o caixa. A tela antiga
    mascarava isso com um card "hoje" à parte, sempre ao vivo (`getResumoDia`), que os critérios
    de simplificação desta demanda removeram por parecer redundante. Corrigido: o dia de hoje,
    quando ainda não fechado, é injetado no `historico` usando os mesmos dados ao vivo que já
    alimentam a quebra por forma de pagamento/categoria — resumo, gráfico e "melhores dias" ficam
    consistentes entre si.
  - **Achado corrigido no processo (bug real, mais sério)**: com a demanda 074,
    `jsgrafica_fechamento` passou a poder ter mais de 1 linha pra mesma `data_dia` (1 geral + 1
    por operador). O histórico do Financeiro não filtrava isso — um dia com fechamento de Zu/Gabi
    aparecia 2x (chave React duplicada, `Encountered two children with the same key`) e a
    entrada daquele dia era **somada em dobro** no resumo do período. Corrigido reaproveitando o
    mesmo filtro por exclusão da demanda 092 (`getSaldoAnterior`) — extraído pra uma função
    própria `ehFechamentoGeral()` em `lib/supabase-admin.ts`, usada nos dois lugares agora.

- **Testes realizados e resultado:**
  - Playwright: login admin → Financeiro → confirmado que "Movimento"/"Dashboard" sumiram do
    menu (só "Lançar Saídas"/"Fechar Caixa"/"Financeiro" na 2ª fileira). Testado período "Hoje"
    (Entradas R$254,25 com Dinheiro/Cartão/Pix/Não informado, Saídas R$30,24, Resultado R$224,01,
    tudo consistente com a quebra abaixo) e "Este mês" (2+ formas de pagamento reais: Dinheiro
    R$293,60, Cartão R$72,90, Pix R$328,65; 8 categorias de saída reais) — critério de aceite
    "testado com 2+ formas de pagamento e 2+ períodos" atendido.
  - Confirmado via SQL que a duplicata de linha (06-07-26: 1 fechamento "Sistema" + 1 fechamento
    "Gabi") existe de verdade em produção — não é hipotético. Reconfirmado depois do fix: só 1
    entrada por dia no gráfico, sem aviso de chave duplicada no console.
  - Testado também pelo lado do PDV (login como Zu): tela "Financeiro" acessível, mesmo
    conteúdo/seletor de período que o admin vê.
  - `npx tsc --noEmit` e `npm run build` limpos (rodados depois de `rm -rf .next` pra descartar
    referência antiga ao `/api/movimento` removido, que aparecia nos tipos gerados do build
    anterior). `curl` em produção confirmou `/api/movimento` retornando 404 e `/api/dashboard`
    com `entradasPorFormaPagamento` presente.

- **Achados fora do escopo:**
  - 🟡 **Dado histórico de `06-07-26` fica sem entradas no Financeiro depois do fix da
    duplicata.** A linha "Sistema" desse dia (âncora criada pela demanda 090) tem
    `total_entradas: 0` — só o `saldo_acumulado` (R$1.168,89) foi preenchido na âncora, não o
    total de entradas do dia. Antes do meu fix, o dia aparecia com entradas vindas por engano da
    linha da Gabi (R$536,49, parcial do caixa dela, não o dia inteiro); agora que a exclusão está
    certa, o dia fica com R$0,00 de entradas no histórico/gráfico do Financeiro (mesmo o dia tendo
    tido movimento real). Não é regressão desta demanda — é a mesma limitação da âncora da 090,
    só ficou visível agora que parei de contar a linha errada em cima dela. Fica pro 02-DADOS
    decidir se vale preencher `total_entradas`/`total_saidas` na linha "Sistema" de `06-07-26`
    também, não só o saldo.
  - Não investiguei o ranking de produtos além do que já existia (a própria demanda pediu pra só
    reportar se aparecer um exemplo concreto de agregação errada — nenhum foi reportado).
  - Widget "Por operador" (lançamentos por pessoa, contagem) e "Destaques do dia" (top 3
    medalhas) que existiam só no antigo "Movimento" não foram migrados — não estavam no escopo
    explícito da demanda (que lista só "produtos mais vendidos" e "saídas por categoria" pra
    migrar) e o "Ranking de produtos" já cobre a mesma informação de forma mais completa
    (período, não só hoje). Se o Edvam sentir falta da visão "quem lançou o quê hoje", vira
    demanda própria.

- **Status final:** concluída e em produção (`dpl_2dsDQhEvZu4tgjfgGrHkJv9mWCnc`,
  https://admin.jsgrafica.site e https://pdv.jsgrafica.site).
