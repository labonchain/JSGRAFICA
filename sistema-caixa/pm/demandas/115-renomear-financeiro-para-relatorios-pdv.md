# 115 — Renomear "Financeiro" pra "Relatórios" no submenu do PDV

Status: concluída — deployada em produção
Criada em: 2026-07-08
Aprovada em: 2026-07-08
Concluída em: 2026-07-08
Chat executor: 04 - FRONTEND JS GRAFICA

## Contexto
Item 11 do backlog. Pedido cosmético do Edvam — o submenu do PDV que hoje mostra "📊 Financeiro"
(dentro do grupo "💰 Financeiro") deve virar "📊 Relatórios", já que a tela virou um menu de
relatórios nomeados (demanda 101).

## Objetivo
Rótulo da aba no PDV muda de "Financeiro" pra "Relatórios". Sem mudança de função.

## Escopo
- Incluído: mudar só o `label` da aba correspondente em `app/pdv/page.tsx` (`ABAS_PDV`). Avaliar
  se o Admin (`app/page.tsx`) também deveria mudar por consistência, ou se fica só no PDV — se
  não estiver claro, perguntar ao PM antes de decidir sozinho (é rótulo visto todo dia por todo
  mundo, vale confirmar o escopo exato).
- Fora de escopo: qualquer mudança de função/conteúdo da tela.

## Critérios de aceite
- [x] Aba mostra "📊 Relatórios" no PDV
- [x] Nenhuma função muda, só o texto

## Riscos e cuidados
Nenhum — mudança cosmética isolada.

## Referências
`app/pdv/page.tsx` (`ABAS_PDV`), `app/page.tsx` (avaliar consistência).

## Relato de execução

**Status final: concluída — deployada em produção**

### O que foi feito
Perguntei ao PM antes de decidir sozinho, conforme pedido no escopo — confirmado: **só no PDV**,
Admin mantém "Financeiro". Mudei só o `label` da entrada `financeiro` em `ABAS_PDV`
(`app/pdv/page.tsx`) de "Financeiro" pra "Relatórios". O rótulo do **grupo** na 1ª fileira
("💰 Financeiro") não muda — ele continua sendo a categoria guarda-chuva (Entradas + Fechar Caixa
+ Relatórios), só a sub-aba específica (2ª fileira) que virou o menu de 3 relatórios nomeados
(demanda 101) ganhou o nome novo. `app/page.tsx` (Admin) não foi tocado.

### Testes realizados e resultado
1. `npx tsc --noEmit`, `npx eslint`, `npm run build` limpos.
2. **Deploy em produção**: `npx vercel --prod --yes` → **`dpl_HkUop79izMUFgK8QKb9dY9PHeojA`**
   (mesmo deploy das demandas 110/117).
3. **Playwright em produção** (`pdv.jsgrafica.site`): confirmado que a sub-aba mostra
   "📊 Relatórios" e o texto "Financeiro" não aparece mais na 2ª fileira do PDV. Nenhuma mudança
   de função — mesma tela (`TelaFinanceiro.tsx`), mesmo conteúdo, só o rótulo do botão de
   navegação mudou.

### Achados fora do escopo
Nenhum.

### Status final
Concluída e deployada em produção (`dpl_HkUop79izMUFgK8QKb9dY9PHeojA`). Os 2 critérios de aceite
confirmados em produção.
