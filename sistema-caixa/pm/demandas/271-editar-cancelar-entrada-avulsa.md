# 271 — Editar/cancelar uma entrada avulsa já lançada

Status: concluída
Criada em: 2026-08-14
Aprovada em: 2026-08-14
Concluída em: 2026-08-14
Chat executor: 05 - FINANCEIRO JS GRAFICA

## Contexto
Achado fora do escopo da demanda 269 (botão "Adicionar entrada", concluída 2026-08-14): existe
hoje um jeito de editar e cancelar uma **saída** já lançada errada (`PATCH`/`DELETE` em
`app/api/saidas/route.ts`, demanda 130) — mas nenhum equivalente pra uma **entrada avulsa**
(`jsgrafica_entradas_avulsas`). Se uma entrada for lançada com valor/conta/descrição errada
(agora que existe um botão de verdade pra lançar isso, demanda 269), não tem como corrigir sem
mexer direto no banco.

## Objetivo
Editar (valor/conta destino/descrição/data) e cancelar uma entrada avulsa já lançada, mesmo
padrão de auditoria já usado pras saídas (demanda 130).

## Escopo
- Incluído: `PATCH` em `app/api/entradas-avulsas/route.ts` (rota criada na 269) — edita
  valor/categoria/descrição/data de uma entrada avulsa existente, mesma lógica de "o Admin manda
  o valor final que quer" (não recomputa nada automaticamente).
- Incluído: `DELETE` na mesma rota — cancela a entrada avulsa. Mesmo cuidado da 130 com saídas:
  não deletar sem confirmação, manter rastro se fizer sentido (ver se a tabela já tem campos tipo
  `editado_em`/`editado_por`, senão avaliar se vale adicionar seguindo o padrão de
  `jsgrafica_saidas`).
- Incluído: botão de editar/cancelar na lista de entradas de `components/TelaEntradas.tsx`, pro
  tipo `entrada_avulsa` especificamente (vendas/pedidos continuam sem esse botão, mesma regra de
  hoje — só entrada avulsa é lançamento manual, editável).
- Incluído: mesma restrição de acesso já usada no botão de adicionar (demanda 269, só Admin vê).
- Explicitamente fora de escopo: qualquer mudança em pendência de conciliação já classificada como
  "entrada" (essas viram entrada avulsa também, mas mexer nelas depois de classificadas é um caso
  separado — não travar nem destravar isso aqui).

## Critérios de aceite
- [ ] Dá pra editar valor/conta/descrição/data de uma entrada avulsa já lançada
- [ ] Dá pra cancelar (excluir) uma entrada avulsa já lançada
- [ ] Botões aparecem só pra Admin, só no tipo `entrada_avulsa` da lista

## Referências
`app/api/saidas/route.ts` (padrão `PATCH`/`DELETE`, demanda 130). `app/api/entradas-avulsas/route.ts`,
`components/TelaEntradas.tsx`, `lib/supabase-admin.ts` (`criarEntradaAvulsa`) — todos da demanda 269.
Achado 2026-08-14.

## Relato de execução

- **O que foi feito**: `jsgrafica_entradas_avulsas` não tinha `editado_em`/`editado_por` — a
  demanda já previa essa checagem no escopo ("senão avaliar se vale adicionar"); confirmei que não
  existiam e apliquei migration aditiva (`demanda_271_add_editado_em_por_entradas_avulsas`, 2
  colunas nullable, mesmo padrão de `jsgrafica_saidas`, não toca em nenhum dado existente).
  `app/api/entradas-avulsas/route.ts` (criada na 269) ganhou `PATCH` (edita valor/conta destino/
  descrição/data, mesma filosofia da 130: o Admin manda o valor final, sem recomputar nada, grava
  rastro) e `DELETE` (cancela de verdade — mesma decisão da 130 de não usar flag, já que nenhuma
  agregação que lê essa tabela hoje, só `GET /api/entradas` da 269, tem conceito de status).
  Diferente da saída (bloqueada quando é lado de uma transferência, 232/233), entrada avulsa não
  tem nenhum bloqueio por `pendencia_id` — decisão explícita do próprio escopo da demanda.
  `components/ModalAdicionarEntrada.tsx` virou um modal só, reaproveitado pros 2 modos (`add`/
  `edit`) via prop opcional `entradaExistente` — evita duplicar um componente quase idêntico; em
  modo edição troca POST por PATCH e ganha o botão "🗑️ Cancelar esta entrada (excluir)".
  `GET /api/entradas` (route.ts) passou a incluir `entradaAvulsaId`/`contaDestino` só nos
  lançamentos `entrada_avulsa` (os outros tipos não precisam). `TelaEntradas.tsx`: botão "✏️
  Editar" no card, só quando `tipo === 'entrada_avulsa'` e `operadorLogado?.papel === 'admin'` —
  mesma régua de quem vê "+ Adicionar entrada" (269).
- **Testes realizados e resultado**: em produção, com dado sintético real (removido depois):
  `POST /api/entradas-avulsas` (conta `stone`, R$50,00) → sucesso; `PATCH` mudando valor pra
  R$77,77 e conta pra `dinheiro_geral` → sucesso, resposta confirma `editado_em`/`editado_por`
  gravados; `GET /api/entradas?dia=14-08-26` → confirma o lançamento já com o valor/conta novos e
  os campos `entradaAvulsaId`/`contaDestino` presentes; `DELETE` → sucesso, `SELECT` direto no
  banco confirma 0 linhas com aquele id depois. `npx tsc --noEmit` e `npm run build` limpos. Deploy
  em produção: `dpl_7yiM66ziAR3BsjpodkcLWEBzar8g`, aliases confirmados via `vercel inspect` em
  `pdv.jsgrafica.site` e `admin.jsgrafica.site`.
- **Achados fora do escopo**: nenhum novo.
- **Status final**: concluída.
