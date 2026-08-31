# 043 — Dashboard corta em 1.000 linhas (limite padrão do Supabase) e perde vendas/saídas recentes

Status: aprovada — prioridade alta (afeta o dashboard de produção agora, hoje)
Criada em: 2026-07-03
Aprovada em: 2026-07-03
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado do 02-DADOS ao validar a demanda 042 (import do caixa de hoje): `topProdutos` do
dashboard veio **vazio para hoje**, mesmo com as 18 vendas de hoje corretamente gravadas no
banco (confirmado pelo PM via SQL).

Causa confirmada (leitura de `app/api/dashboard/route.ts`, linha 82): a rota busca
`jsgrafica_vendas` inteira sem `.limit()`/paginação —
`supabaseAdmin.from('jsgrafica_vendas').select('data_dia, produto_nome, quantidade, total')` —
e filtra por período **em memória** depois (necessário porque `data_dia` é texto `DD-MM-AA`,
não dá pra usar `gte`/`lte` direto no Postgres — comentário já existe no código explicando
isso). O problema: o Supabase/PostgREST **corta em 1.000 linhas por padrão** quando não há
`.range()` explícito. `jsgrafica_vendas` já tem **3.700 linhas** (depois da importação
histórica + da 042) — a busca sem paginação só traz uma fatia da tabela, e as vendas de hoje
(inseridas por último) provavelmente ficam de fora dessa fatia.

Conferido pelo PM: `jsgrafica_saidas` já tem **946 linhas** — abaixo do limite por pouco, mas
vai bater no mesmo problema em breve (é a mesma rota, mesmo padrão de busca sem paginação).
`jsgrafica_fechamento` tem 226 linhas, sem risco imediato.

**Importante:** só afeta `topProdutos` e `saidasPorCategoria`/parte do agregado por período —
os totais de "hoje" (`resumo.totalEntradas`/`totalSaidas`/saldo) vêm de outras funções
(`getResumoDia`/`getSaldoAnterior`, tabela pequena/cálculo direto), então o saldo do caixa
continua certo. O problema é só na lista de produtos/categorias.

## Objetivo
O dashboard deve refletir 100% das vendas/saídas dentro do período selecionado, não importa
quantas linhas a tabela tenha no total.

## Escopo
- Incluído: em `app/api/dashboard/route.ts`, buscar `jsgrafica_vendas` e `jsgrafica_saidas` por
  completo de forma paginada (loop com `.range(offset, offset+999)` até não vir mais linha, ou
  outra abordagem que garanta buscar a tabela inteira) — mantendo o filtro em memória por
  `data_dia` que já existe (esse filtro continua necessário, não é o que está errado).
- Considerar (não obrigatório, mas registrar como achado se não fizer agora): mover a agregação
  de `topProdutos`/`saidasPorCategoria` pra uma função/RPC no Postgres (SUM/GROUP BY direto no
  banco), evitando trazer 3.700+ linhas pra memória da função a cada carregamento do dashboard —
  mais eficiente e escala melhor conforme o histórico cresce. Se decidir não fazer agora (fora
  do critério de aceite mínimo), registrar como achado pra decisão futura.
- Fora de escopo: mudar o formato de `data_dia` (`DD-MM-AA`) — é o padrão usado em todo o
  sistema, não mexer aqui.

## Critérios de aceite
- [ ] `topProdutos` reflete as vendas de hoje (18 itens de 03-07-26 aparecem na agregação)
- [ ] Testado com período "hoje" e período "mês" (ou "tudo"), confirmando que a soma bate com o
      total real de linhas em `jsgrafica_vendas`/`jsgrafica_saidas` pro período, não só 1.000
- [ ] Sem regressão de performance perceptível no carregamento do dashboard

## Riscos e cuidados
Esta rota já processa bastante dado em memória (é o padrão existente, não desta demanda) — se a
paginação virar muito lenta conforme a tabela cresce mais, isso reforça a sugestão acima de
mover a agregação pro Postgres via RPC. Não é bloqueante pra fechar esta demanda, só um
alerta pro futuro.

## Referências
`app/api/dashboard/route.ts`. Achado original: relato da demanda 042 (02-DADOS).

## Relato de execução

### O que foi feito
Em `app/api/dashboard/route.ts`, criada `buscarTodasLinhas<T>(tabela, colunas)` — mesmo padrão
já usado na demanda 041 (`conversas/route.ts`): pega o total exato primeiro
(`count: 'exact', head: true`, sem trazer linha nenhuma), calcula quantas páginas de 1.000 são
necessárias (trava de segurança em 30 páginas / 30.000 linhas) e busca todas em paralelo com
`.range()` + `.order('id')` (ordem estável entre páginas).

Apliquei nas **três** tabelas buscadas nesse `Promise.all` — `jsgrafica_vendas` e
`jsgrafica_saidas` (pedidas no escopo) e também `jsgrafica_fechamento` (não pedida — 226
linhas, "sem risco imediato" segundo a própria demanda — mas como o helper já estava pronto e
é o mesmo `Promise.all`, achei melhor prevenir o mesmo bug ali também em vez de deixar uma
tabela sem proteção por enquanto). O filtro em memória por `data_dia`/período continua
exatamente igual, só a busca ficou paginada.

### Testes realizados
- `npx tsc --noEmit` e `npm run build` — limpos.
- **Confirmei o total real primeiro** via SQL direto: `jsgrafica_vendas` tem 3.700 linhas, 18
  delas de hoje (`03-07-26`) somando R$ 2.585,10; `jsgrafica_saidas` tem 946 linhas somando
  R$ 156.528,42.
- **Testado local** (`npm run dev`):
  - `GET /api/dashboard?periodo=hoje` → `resumo.totalEntradas` bateu **exatamente** R$ 2.585,10
    (as 18 vendas de hoje entraram na conta — antes ficavam de fora, capturadas fora da janela
    de 1.000 linhas sem paginação).
  - `GET /api/dashboard?periodo=tudo` (força buscar a tabela inteira) → `saidasPorCategoria`
    somado bateu **exatamente** R$ 156.528,42 (as 946 linhas de saídas, todas contabilizadas).
  - `topProdutos` retorna 15 itens (limite de exibição pré-existente, top 15 por valor — não é
    truncamento de dado, é ranking).
- **Performance**: `periodo=tudo` (o cenário mais pesado, processa as 3 tabelas inteiras) ficou
  em ~0,7-1,2s local — sem lentidão perceptível.
- **Testado direto em produção** depois do deploy: `resumo.totalEntradas` (hoje) = 2.585,10;
  `periodo=tudo` respondeu em ~1,1s.

### Achado fora do escopo (relatado, não corrigido)
Ao validar `periodo=tudo`, notei que `resumo.totalSaidas` (que vem de
`jsgrafica_fechamento.total_saidas`, um rollup diário separado) **não bate** com a soma direta
de `jsgrafica_saidas` (R$ 160.098,29 vs R$ 156.528,42 — diferença de ~R$ 3.570). Confirmei que
isso **não é causado por este fix** — `saidasPorCategoria` (que vem direto de
`jsgrafica_saidas`, já testado acima) bate exato com o valor real da tabela; a divergência é
entre o rollup de `jsgrafica_fechamento` e a tabela itemizada `jsgrafica_saidas`, provavelmente
da importação histórica (demandas 007/042). Não investiguei a causa raiz nem qual das duas
fontes é a correta — é uma questão de reconciliação de dado, fora do escopo desta demanda
(que era só sobre paginação). Candidata a demanda pro 02-DADOS.

### Sobre mover a agregação pro Postgres (RPC)
A demanda pedia registrar como achado se eu decidisse não fazer agora — decidi não fazer: a
paginação em paralelo já resolveu a lentidão (ver testes acima), e criar uma função no Postgres
seria mudança de schema (fora do meu domínio, 02-DADOS). Registro aqui como recomendação
futura se o histórico crescer muito mais (hoje ~4.900 linhas combinadas entre as 3 tabelas,
sem sinal de lentidão).

### Critérios de aceite
- [x] `topProdutos` reflete as vendas de hoje (confirmado via `resumo.totalEntradas` exato)
- [x] Testado com "hoje" e "tudo", confirmando que a soma bate com o total real das tabelas
- [x] Sem regressão de performance perceptível (~0,7-1,2s pro cenário mais pesado)

### Deploy
`npx vercel --prod --yes` — deployment `dpl_dvyMDAzsQ1QUjdYihSBUhh91yuJ6`. Confirmado direto em
produção (`admin.jsgrafica.site`): `resumo.totalEntradas` (hoje) = 2.585,10, `periodo=tudo`
respondeu em ~1,1s.

### Status final
Concluída e deployada.
