# 269 — Botão "Adicionar entrada" na tela Entradas (Financeiro)

Status: concluída
Criada em: 2026-08-01
Aprovada em: 2026-08-01
Concluída em: 2026-08-14
Chat executor: 05 - FINANCEIRO JS GRAFICA

## Contexto
Pedido do Edvam (2026-08-01), direto da tela "🧾 Entradas" (Financeiro,
`components/TelaEntradas.tsx`): precisa de um jeito de lançar entrada manual — depósito numa conta
da gráfica, ou recebimento que não é venda de produto — sem precisar que isso passe por venda/
pedido.

Achado técnico relevante (confirmado hoje, durante a conciliação de julho): a função
`criarEntradaAvulsa` (`lib/supabase-admin.ts:1174-1198`) já faz exatamente isso — grava em
`jsgrafica_entradas_avulsas` (conta destino, valor, operador, descrição, data) e **já aceita
`pendenciaId: null`**, ou seja, já foi pensada pra funcionar sem depender de uma pendência de
conciliação. Só que hoje ela só é chamada a partir de
`app/api/conciliacao/pendencias/route.ts` (ação `entrada` da classificação) — não existe nenhuma
rota de API nem botão de UI que chame ela diretamente. Foi usada várias vezes hoje via SQL direto
(inserção manual) por falta desse caminho — a demanda é criar o caminho de verdade.

## Objetivo
Botão "+ Adicionar entrada" na tela Entradas, abre um formulário simples (conta destino, valor,
descrição, data), lança na hora sem precisar de pendência nem pedido.

## Escopo
- Incluído: rota de API nova (ex. `app/api/entradas-avulsas/route.ts`, `POST`) que chama
  `criarEntradaAvulsa` direto (sem `pendenciaId`) — reaproveitar a função existente, não duplicar
  lógica.
- Incluído: botão "+ Adicionar entrada" em `components/TelaEntradas.tsx`, abre modal/formulário
  com: conta destino (lista `CONTAS_ORIGEM`, mesma usada em Conciliação/Transferências —
  considerar se a "Dinheiro (Geral)" da demanda 261 já deve entrar aqui também), valor, descrição
  (opcional), data (default hoje, mas permitir escolher outra — mesmo padrão de "lançar em dia
  passado" que a classificação de pendência já suporta).
- Incluído: depois de lançada, a entrada aparece na lista da tela Entradas (já deve aparecer
  automaticamente, já que `jsgrafica_entradas_avulsas` provavelmente já alimenta essa lista —
  confirmar).
- Explicitamente fora de escopo: qualquer mudança na lógica de conciliação/pendências — essa
  função continua sendo usada por lá também, sem alteração.

## Critérios de aceite
- [ ] Botão "+ Adicionar entrada" visível na tela Entradas
- [ ] Formulário lança uma entrada real (via `criarEntradaAvulsa`, sem exigir pendência)
- [ ] Entrada lançada aparece na lista da tela, com o total do dia atualizado

## Referências
`lib/supabase-admin.ts:1174-1198` (`criarEntradaAvulsa`, já pronta). `components/TelaEntradas.tsx`.
`app/api/conciliacao/pendencias/route.ts` (uso atual, único caminho existente hoje). `lib/dados.ts`
(`CONTAS_ORIGEM`). Achado 2026-08-01, durante a conciliação de julho.

## Relato de execução

- **O que foi feito**: `app/api/entradas-avulsas/route.ts` novo (`POST`), chama `criarEntradaAvulsa`
  direto com `pendenciaId` implicitamente `null` (a função já previa isso desde a criação, na 226).
  `components/ModalAdicionarEntrada.tsx` novo — mesmo padrão visual/estrutural de
  `ModalClassificarPendencia.tsx` (grid de botões pra conta destino a partir de `CONTAS_ORIGEM`,
  já incluindo "Dinheiro (Geral)" da 261; campos valor/descrição/data). Botão "+ Adicionar entrada"
  em `TelaEntradas.tsx`, ao lado do total do dia.
- **Achado real, corrigindo a premissa da própria demanda**: o contexto afirma que a entrada
  avulsa "já deve aparecer automaticamente" na lista da tela Entradas, "já que
  `jsgrafica_entradas_avulsas` provavelmente já alimenta essa lista". **Isso está errado** —
  conferi `app/api/entradas/route.ts` (o `GET` que monta o ledger da tela) e ele nunca lia essa
  tabela, em nenhuma linha, desde que ela existe (demanda 226). Toda entrada avulsa já lançada até
  hoje (várias vezes, via SQL direto, durante a conciliação de julho) estava **invisível** na tela
  Entradas, mesmo estando gravada certinho no banco. Corrigido: nova consulta a
  `jsgrafica_entradas_avulsas` por `data_dia`, novo tipo de lançamento `entrada_avulsa` (label,
  emoji ➕, cor teal) somado ao total do dia junto com venda/pedido.
- **Achado técnico incidental, resolvido no caminho**: `TelaEntradas` não tinha nenhum jeito de
  saber QUEM está logado (só `operadorFixo`, que é "trava o filtro pra só esta pessoa", conceito
  diferente) — nem o Admin (`app/page.tsx`) passava essa informação. Precisei de identidade real
  pra saber quem lançou a entrada E pra decidir se mostra o botão (só Admin, mesma régua da
  demanda 102 pra "Lançar Saídas" — Zu/Gabi no PDV não veem). Adicionada prop nova `operadorLogado?:
  Usuario`, passada nos 2 pontos de uso (`app/page.tsx`: sempre o Admin logado; `app/pdv/page.tsx`:
  o usuário real do PDV, inclusive quando é o próprio Edvam usando o PDV).
- **Testes realizados e resultado**: em produção, com dado sintético real (apagado depois):
  `POST /api/entradas-avulsas` (conta `dinheiro_geral`, R$12,34) → sucesso; conferido em
  `GET /api/entradas?dia=14-08-26` → apareceu como `tipo: "entrada_avulsa"`, descrição certa,
  confirmando que o achado acima está mesmo corrigido (antes dessa mudança, essa consulta não
  devolvia essa linha de jeito nenhum). Registro apagado depois (`DELETE` direto na tabela — não
  existe endpoint de exclusão pra entrada avulsa, fora do escopo desta demanda criar um).
  `npx tsc --noEmit` e `npm run build` limpos.
- **Achados fora do escopo**: não existe hoje um jeito de editar/cancelar uma entrada avulsa já
  lançada (equivalente ao que a demanda 130 deu pras saídas manuais) — registrado pro PM avaliar
  se vale uma demanda futura, não implementado aqui (fora do pedido original).
- **Status final**: concluída. Deploy em produção junto com 261/264 (mesmo lote), aliases
  confirmados em `pdv.jsgrafica.site`/`admin.jsgrafica.site`.
