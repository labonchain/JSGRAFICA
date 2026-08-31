# 092 — `getSaldoAnterior()` não desempata quando há fechamento geral + por operador na mesma data

Status: aprovada — 🔴 URGENTE, bloqueia a 090 e a 074
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado pelo 02-DADOS executando a demanda 090 (âncora do saldo em 06-07-26): existe hoje 1
fechamento por operador pra `06-07-26` (Gabi, `total_entradas: 536.49`, um fechamento parcial) e
1 fechamento geral pra `06-07-26` (a âncora nova, `saldo_acumulado: 1168.89`) — **mesma
`data_dia`**. `getSaldoAnterior()` (`lib/supabase-admin.ts`) ordena só por `data_dia` convertida
em `Date`, sem nenhum desempate — quando duas linhas empatam na data, quem "ganha" é só a ordem
que o Postgres devolveu (sem `ORDER BY` explícito pra isso), não uma garantia. Testado de
verdade: hoje pega o valor da Gabi (R$536,49), não a âncora (R$1.168,89) — o oposto do que devia.

**Por que isso é urgente e não só um detalhe de hoje**: a demanda 074 (fechamento por operador)
vai criar, todo santo dia, uma linha por operador **na mesma data** do fechamento geral. Esse
empate vai acontecer sempre, não só nesse caso pontual — sem corrigir, o saldo do dia seguinte
fica numa loteria de qual linha o Postgres devolve primeiro.

## Objetivo
`getSaldoAnterior()` sempre usa o fechamento **geral** do dia (não um fechamento por operador
parcial) como base do saldo do dia seguinte — de forma determinística, não por acaso de ordenação.

## Escopo
- Incluído: em `getSaldoAnterior()` (`lib/supabase-admin.ts`), excluir fechamentos por operador
  do cálculo de saldo anterior — considerar só o fechamento geral (`fechado_por` que representa o
  dia inteiro, não uma pessoa específica; conferir com a 074 qual é o valor usado pra isso, ex.
  `'Sistema'` ou equivalente) como fonte de `saldo_acumulado`. Fechamento por operador nunca deve
  valer como "o saldo do dia" pro cálculo do dia seguinte — mesmo tipo de confusão que a demanda
  080 já tinha achado (item 2, divergência falsa da Gabi).
- Fora de escopo: mudar a estrutura da 074 em si (essa demanda só corrige `getSaldoAnterior()`).

## Critérios de aceite
- [ ] Com um fechamento geral e um fechamento por operador na mesma data,
      `getSaldoAnterior()` retorna o valor do fechamento geral, sempre
- [ ] Testado de verdade contra o cenário real de hoje (fechamento geral R$1.168,89 vs. Gabi
      R$536,49 em `06-07-26`) — confirma que retorna R$1.168,89
- [ ] Coordenar com a demanda 074 (mesma tabela, fechamentos por operador) antes de finalizar

## Riscos e cuidados
Bloqueia o objetivo da demanda 090 (âncora do saldo) — sem este fix, a âncora criada não tem
efeito prático no próximo fechamento. Fazer antes do próximo fechamento geral acontecer.

## Referências
`lib/supabase-admin.ts` (`getSaldoAnterior()`). Demanda 090 (achado original, registro de âncora
criado). Demanda 074 (fechamento por operador, mesma tabela, coordenar). Demanda 080 (mesmo tipo
de confusão achado antes).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  Antes de mexer, conferi os dados reais de `06-07-26`: a linha geral (âncora da 090) tem
  `fechado_por: 'Sistema'`, `saldo_acumulado: 1168.89`; a linha da Gabi tem `fechado_por: 'Gabi'`,
  `536.49` — confirma exatamente o empate descrito.
  `getSaldoAnterior()` (`lib/supabase-admin.ts`) passou a excluir linhas cujo `fechado_por` seja
  nome de um operador conhecido (`Gabi`/`Zu`/`Edvam`, de `lib/usuarios.ts`) antes de escolher a
  mais recente. **Decisão tomada por exclusão, não por uma lista fixa de valores "gerais"**: as
  225 linhas históricas importadas usam `fechado_por: 'import'` (não `'Sistema'`) — se eu tivesse
  filtrado só por `= 'Sistema'`, todo o histórico anterior a hoje ficaria invisível pra esse
  cálculo, e qualquer dia sem a âncora manual da 090 quebraria a continuidade do saldo. Com
  exclusão, `'import'`, `'Sistema'`, `null` e qualquer outro valor não-pessoal continuam contando
  como "fechamento geral do dia" — só fechamento por operador é excluído.
  **Cuidado extra encontrado no processo**: o filtro inicial usava `NOT IN` do próprio Postgres
  (`.not('fechado_por', 'in', ...)`), mas descobri que existe 1 linha histórica real
  (`03-07-26`, `fechado_por: null`, saldo R$557,67) que `NOT IN` do SQL **exclui silenciosamente**
  por causa da lógica de 3 valores do Postgres (`NULL NOT IN (...)` nunca é `true`). Troquei pra
  filtrar em JavaScript (busca todas as linhas, filtra na aplicação) — assim `null` conta
  corretamente como "geral", sem essa armadilha.
  Coordenado com a demanda 074 (ainda não implementada nesta sessão): a convenção formalizada é
  `fechado_por = 'Sistema'` pro fechamento geral do dia (já é o que `app/api/fechamento/route.ts`
  grava quando `operador` não é enviado) e `fechado_por = <nome>` pro fechamento parcial de cada
  operador — vou seguir exatamente essa convenção ao implementar a 074 em seguida, garantindo que
  a ação de "fechar o dia inteiro" sempre grave `'Sistema'`, nunca o nome de quem clicou.
- Testes realizados e resultado:
  Testado contra o cenário real exato citado no critério de aceite: `GET /api/fechamento` (que
  chama `getSaldoAnterior()` internamente) retornou `saldoAnterior: 1168.89` — o valor do
  fechamento geral, não os R$536,49 da Gabi. Testado local e reconfirmado em produção depois do
  deploy. `npx tsc --noEmit` e `npm run build` rodaram limpos. Deploy em produção:
  `npx vercel --prod --yes` → `dpl_H5zjszZqaXarxTXWTepTpDktgk3Z`.
- Achados fora do escopo:
  A linha `03-07-26` com `fechado_por: null` (mencionada acima) não é um achado novo que precise
  de ação — só documentando que ela existe e que o fix precisou considerá-la explicitamente pra
  não regredir esse dia.
- Status final: concluída.
