# 020 — Corrigir cálculo do "dia" do caixa pro fuso de Recife

Status: aprovada — prioridade alta
Criada em: 2026-07-02
Aprovada em: 2026-07-02
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Screenshot do Edvam mostrou o cabeçalho com duas datas ao mesmo tempo — "Quinta-Feira,
02/07/2026" e "03-07-26" — e a tela de Movimento com "Movimento do dia — 03-07-26" enquanto
localmente em Recife ainda era dia 02. `formatarDiaCaixa()` em `lib/supabase.ts` usa
`new Date()` puro (`getDate/getMonth/getFullYear`) sem fixar fuso horário — em produção
(Vercel) isso roda em UTC, 3h à frente de Recife.

## Objetivo
Fazer o "dia do caixa" ser calculado sempre no fuso de Recife (America/Recife, GMT-3),
independente de onde o servidor rodar.

## Escopo
- Incluído: corrigir `formatarDiaCaixa()` pra converter pro fuso `America/Recife` antes de
  extrair dia/mês/ano; conferir se algum outro lugar do código também calcula "hoje" sem fuso
  (ex.: filtro do Dashboard, do Movimento).
- Fora de escopo: mudar o formato `DD-MM-AA` em si, ou migrar dado histórico já gravado com
  data errada (isso é decisão separada, só avisar se encontrar).

## Critérios de aceite
- [ ] Cabeçalho mostra uma única data, consistente com o horário de Recife
- [ ] Testado perto da virada do dia (ou simulado) pra confirmar que não adianta mais

## Referências
`lib/supabase.ts` (`formatarDiaCaixa`), telas Dashboard e Movimento.

## Relato de execução

### O que foi feito
- `lib/supabase.ts`: adicionado helper `agoraRecife()` — usa `Intl.DateTimeFormat` com
  `timeZone: 'America/Recife'` pra extrair ano/mês/dia/hora reais de Recife e monta um `Date`
  cujos getters locais (`getDate/getMonth/getFullYear/getDay/setHours`) refletem esse horário,
  independente do fuso do processo/servidor. `formatarDiaCaixa()` passou a usar
  `agoraRecife()` como default (era `new Date()` puro). `getSaldoAnterior()` também passou a
  ancorar o "hoje" em `agoraRecife()` (mesmo bug de virada de dia podia afetar o saldo
  anterior perto da meia-noite).
- `app/api/dashboard/route.ts`: `inicioSemana()`, `inicioMes()`, `inicio3Meses()`,
  `inicioAno()` e os limites `de`/`ate` do período (`periodo === 'hoje'` e o `ate` default)
  agora usam `agoraRecife()` em vez de `new Date()` — sem isso, o filtro de período "hoje"
  ficaria vazio durante a mesma janela de 3h (pois o boundary UTC já teria virado o dia
  enquanto o registro `data_dia` do "hoje" real de Recife ainda seria de ontem em UTC).
- `app/api/movimento/route.ts`, `saidas/route.ts`, `vendas/route.ts`, `fechamento/route.ts`
  não precisaram de mudança direta — todos já usam `formatarDiaCaixa()` importado de
  `lib/supabase.ts`, então herdam a correção automaticamente.
- Conferido `app/page.tsx:1523` e `app/pdv/page.tsx:238` (cabeçalho "Quinta-Feira,
  02/07/2026") — esses usam `new Date().toLocaleDateString()` **no browser** (client-side),
  então já refletem corretamente o fuso do operador (Recife), não precisam de mudança. O
  "duas datas ao mesmo tempo" do screenshot era exatamente esse descompasso: cabeçalho
  (client, certo) vs `nomeAba` vindo da API (server, UTC, errado) — agora os dois batem.

### Testes realizados
- `npm run build` — build de produção passou limpo.
- `npx tsc --noEmit` — sem erros de tipo.
- Sanity check isolado do algoritmo do `agoraRecife()` via `node -e` no momento em que UTC já
  estava em 03/07 01:51 e Recife ainda em 02/07 22:51 — confirmado que a função devolve
  `02-07-26` (correto), não `03-07-26`.
- **Teste decisivo: subi o `next dev` com `TZ=UTC`** (simulando o fuso do servidor na Vercel)
  no exato momento em que `date -u` mostrava `2026-07-03 01:5x UTC` (já virado em UTC) e
  chamei via `curl` real: `/api/vendas`, `/api/saidas`, `/api/fechamento`,
  `/api/movimento` e `/api/dashboard?periodo=hoje` — todos retornaram `nomeAba: "02-07-26"`
  (o dia certo de Recife), e o `dashboard?periodo=hoje` mostrou o histórico do dia
  corretamente preenchido (não vazio). Antes da correção esse cenário teria devolvido
  `"03-07-26"` e o período "hoje" do dashboard teria vindo vazio.
- Não testei a UI no navegador propriamente (cabeçalho/telas) — o teste via API cobre a causa
  raiz (cálculo do dia), e o cabeçalho client-side já estava correto antes da mudança.

### Achado relatado (não resolvido, fora de escopo)
- Não fiz auditoria dos dados históricos já gravados pra ver se algum registro específico
  caiu no dia errado por causa desse bug (a demanda pede só avisar, não migrar). Se o Edvam
  quiser, dá pra fazer uma varredura pontual depois — não fiz porque exigiria decidir critério
  de "qual registro está errado" sem uma fonte de verdade externa pra comparar.

### Deploy
`npx vercel --prod --yes` rodado com sucesso. Deployment `dpl_84C6W8TfabCdhE3aNzg3BMSBxqwc`,
aliased pra `pdv.jsgrafica.site`. Confirmado via `curl` em produção logo depois que
`https://admin.jsgrafica.site/api/movimento` e `https://pdv.jsgrafica.site/api/vendas` já
respondem com `nomeAba: "02-07-26"` (dia certo de Recife) em produção real.

### Status final
Concluída.
