# 132 — Fechar Caixa: reorganizar layout + renomear aba "Financeiro"

Status: concluída
Criada em: 2026-07-09
Aprovada em: 2026-07-09
Concluída em: 2026-07-09
Chat executor: 03 - APP JS GRAFICA

## Contexto
O Edvam apontou (2026-07-09), vendo a tela ao vivo: a estrutura de blocos da aba Fechar Caixa
"tá horrível e pouco funcional". Causa, lendo `components/TelaFechamento.tsx` (linha ~272): os
cards "Resumo geral" e "Contagem física" ficam lado a lado num `flex flex-wrap items-start` —
como "Contagem física" é bem mais alto (abertura dos operadores, campos de dinheiro/moedas/contas
nomeadas da 127, total físico, divergência, botão), "Resumo geral" fica curto ao lado dele com um
vazio enorme embaixo. "Histórico dos últimos dias" (linha ~448) vem depois, ocupando a largura
toda, sem aproveitar esse espaço vazio.

Segundo ponto, mesma conversa: a aba **"Financeiro"** dentro do submenu Financeiro (Entradas |
Saídas | Fechar Caixa | **Financeiro** | Contas a Pagar/Receber | Mercado Pago) tem o mesmo nome
da seção que a contém — confuso. É a tela de "Controle de Caixa" (fechamento por operador e
período) + "Fluxo de Caixa" + "Relatório de Saídas". O Edvam sugeriu renomear pra **"Movimento"**
ou **"Painel Geral"**.

## Objetivo
"Histórico dos últimos dias" fica encaixado logo abaixo de "Resumo geral", na mesma coluna — os
dois cards curtos formam uma coluna ao lado da coluna mais alta de "Contagem física", sem vazio.
A aba "Financeiro" (submenu) ganha um nome que não repete o da seção pai.

## Escopo
- Incluído:
  1. Agrupar "Resumo geral" e "Histórico dos últimos dias" dentro de um container de coluna
     (`flex flex-col gap-4`) que vira **1 item** do `flex flex-wrap` que hoje só tem "Resumo
     geral" e "Contagem física" como itens.
  2. "Contagem física" continua como está, item separado ao lado dessa nova coluna.
  3. Ajustar `min-w` dos itens se necessário pra não ficar apertado em telas menores — conferir
     em pelo menos 1366×768 (mesmo padrão de teste já usado na demanda 118).
  4. Renomear a aba/label "Financeiro" (submenu) pra **"Movimento"** — só o texto do botão/aba,
     não mexer em rota/URL se isso quebrar algo (conferir antes; se a rota já usa um slug próprio
     tipo `financeiro`, pode manter a URL e só trocar o texto visível).
- Fora de escopo: mudar conteúdo de qualquer um dos 3 blocos do Fechar Caixa — só reposicionamento.

## Critérios de aceite
- [x] "Histórico dos últimos dias" aparece logo abaixo de "Resumo geral", mesma coluna
- [x] "Contagem física" continua ao lado, sem mudança de conteúdo/comportamento
- [x] Sem quebra visual em 1366×768
- [x] Fechamento por operador (Zu/Gabi, só vê "Seu resumo hoje" + "Contagem física" própria) sem
      regressão — conferido: o Histórico É só-Admin (condição `isAdmin && dados.historico` da 099,
      e a API nem manda `historico` na visão por operador) — preservado exatamente assim
- [x] Aba do submenu mostra "Movimento" em vez de "Financeiro", sem quebrar navegação/rota

## Referências
Esta conversa (2026-07-09). `components/TelaFechamento.tsx` (linhas ~272-460). Componente do
submenu Financeiro (achar via grep por "Controle de Caixa"/"Fluxo de Caixa").

## Relato de execução

### O que foi feito
- **Layout** (`components/TelaFechamento.tsx`): "Resumo geral" + "Histórico dos últimos dias"
  viraram UMA coluna (`flex-1 min-w-[280px] flex flex-col gap-4`), item único do `flex flex-wrap`
  ao lado da "Contagem física" (que continua item separado, conteúdo intocado — só o `min-w`
  ajustado de 240→280px nos dois itens pro breakpoint de quebra ficar são). O bloco do Histórico
  foi **movido**, não reescrito — tabela/condições idênticas às da 099. Pro operador, a coluna
  contém só o "Seu resumo hoje" — visual idêntico ao de antes pra Zu/Gabi.
- **Rename**: aba do submenu "Financeiro" → **"Movimento"** (escolha do Edvam) em `app/page.tsx`.
  Só o rótulo: o `id: "financeiro"` é estado interno de aba (SPA), **não existe rota/URL** — nada
  a quebrar (conferido antes). Ironia registrada no comentário: a 075 tinha renomeado
  "Movimento"→"Financeiro"; o PDV mostra "Relatórios" desde a 115 e não foi tocado.

### Testes realizados (só leitura, nenhum dado sintético necessário)
- **Admin em 1366×768** (Playwright, mesmo padrão da 118): coordenadas medidas no DOM — "Resumo
  geral" e "Histórico" no MESMO x (49px, mesma coluna, Histórico logo abaixo), "Contagem física"
  ao lado (x 691px); screenshot sem quebra visual, com dados reais do dia (entradas R$196,10,
  por-operador, contas nomeadas da 127 no lugar).
- **Aba renomeada**: "📊 Movimento" no submenu, clique abre a tela normal (Fluxo de Caixa/
  Controle de Caixa/Relatório de Saídas respondendo).
- **Operador (Zu), na PRODUÇÃO pós-deploy** (localhost não alcança a visão do PDV — o
  `middleware.ts` roteia por host e redireciona `/pdv`→`/` fora de `pdv.*`): "Seu resumo hoje" +
  "Contagem física" própria (só dinheiro/moedas, sem as contas nomeadas da 127 — que são
  só-Admin), **sem** Histórico, aba do PDV segue "Relatórios" (115). Zero regressão.
- `npx tsc --noEmit` e `npm run build` limpos.

### Status final
Concluída e em produção (`dpl_5ULUi9gcgrdcNJyNZmV8zT67BP9H`).
