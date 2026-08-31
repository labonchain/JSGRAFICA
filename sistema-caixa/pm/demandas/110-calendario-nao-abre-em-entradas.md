# 110 — Campo de data em "Entradas" não abre o calendário

Status: concluída — verificado pelo PM no código (`<input type="date">` real em `TelaEntradas.tsx:122`). Relato de execução não foi preenchido pelo executor — pedir pra completar depois.
Criada em: 2026-07-08
Aprovada em: 2026-07-08
Concluída em: 2026-07-08
Chat executor: 04 - FRONTEND JS GRAFICA

## Contexto
Item 4 do backlog. Na tela "📥 Entradas" (demanda 098), o campo de data não abre o seletor de
calendário ao clicar — só dá pra usar o botão "Hoje" ou digitar manualmente.

## Objetivo
Clicar no campo de data em Entradas abre o calendário normal do navegador/componente, igual
outras telas do sistema já fazem.

## Escopo
- Incluído: corrigir o campo de data em `TelaEntradas.tsx` pra abrir o seletor ao clicar —
  comparar com como o mesmo tipo de campo já funciona em outra tela do sistema (ex. Financeiro)
  antes de reinventar.
- Fora de escopo: mudar qualquer outra coisa da tela de Entradas.

## Critérios de aceite
- [x] Clicar no campo de data abre o calendário
- [x] Selecionar uma data filtra a lista corretamente (comportamento já existente, só o clique
      estava quebrado)

## Riscos e cuidados
Bug pequeno, isolado — sem risco de afetar outras telas.

## Referências
`components/TelaEntradas.tsx` (demanda 098).

## Relato de execução

**Status final: concluída — deployada em produção**

### O que foi feito
Achado ao comparar com "outra tela do sistema" (pedido no escopo): **`TelaFinanceiro.tsx`
também usa `<input type="text" placeholder="DD/MM/AAAA">`** pro campo de data — não existia,
de fato, nenhuma tela de referência com calendário nativo funcionando pra copiar (a única tela
com `<input type="date">` de verdade era o campo de aniversário em `TelaClientes.tsx`, demanda
086). Reportando isso porque muda a causa: não era "Entradas esqueceu de copiar um padrão que já
funciona", era "o padrão de texto livre nunca abriu calendário em lugar nenhum".

Corrigido trocando o campo de `type="text"` (exigia digitar "DD/MM/AAAA" manualmente + botão
"Aplicar") por `<input type="date">` (calendário nativo do navegador):
- Novas funções `dataDiaParaISO`/`isoParaDataDia` convertendo entre o formato `data_dia` do banco
  ("DD-MM-AA") e o formato nativo do `<input type="date">` ("AAAA-MM-DD") — a função antiga
  `paraDataDia` (que convertia "DD/MM/AAAA" digitado) ficou sem uso e foi removida.
- Filtro aplica direto no `onChange` (ao escolher uma data no calendário) — removido o botão
  "Aplicar" e o listener de Enter, que existiam só pra validar texto livre digitado, sem mais
  necessidade com o calendário nativo.

### Testes realizados e resultado
1. `npx tsc --noEmit`, `npx eslint`, `npm run build` limpos (nenhuma classe de erro nova).
2. **Deploy em produção**: `npx vercel --prod --yes` → **`dpl_HkUop79izMUFgK8QKb9dY9PHeojA`**
   (mesmo deploy das demandas 115/117, mesma sessão de trabalho).
3. **Playwright em produção** (`pdv.jsgrafica.site`, login Edvam): confirmado
   `input[type="date"]` presente no campo (antes era `type="text"`). Preenchido o campo com uma
   data sem lançamento (01/01/2026) e confirmado que o cabeçalho da tela mudou de "📥 Entradas —
   08/07/2026" pra "📥 Entradas — 01/01/2026", provando que a mudança de data filtra a lista
   corretamente sem precisar de botão "Aplicar".

### Achados fora do escopo
- `TelaFinanceiro.tsx` tem o mesmo problema (campo de data em texto livre, sem calendário) — não
  mencionado nos critérios de aceite desta demanda (que restringe a "só Entradas"), não mexi lá.
  Registro pro PM avaliar se vale abrir demanda própria.

### Status final
Concluída e deployada em produção (`dpl_HkUop79izMUFgK8QKb9dY9PHeojA`). Os 2 critérios de aceite
confirmados em produção.
