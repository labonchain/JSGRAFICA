# 099 — Selo aberto/fechado + histórico de dias anteriores em Fechar Caixa

Status: concluída (verificado pelo PM em produção — deploy Ready, `/api/fechamento` retornando `fechadoHoje: false` + `historico` populado)
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: 2026-07-07
Chat executor: 03 - APP JS GRAFICA

## Contexto
Item A7 do checklist. Hoje `TelaFechamento.tsx` não informa se o fechamento geral do dia já
aconteceu ou não, e não mostra nada de dias anteriores (esse histórico só existe agregado dentro
de "Financeiro"). O Edvam quer poder olhar a tela e saber na hora se já fechou hoje, e comparar
rápido com os últimos dias sem trocar de aba.

## Objetivo
Admin abre "Fechar Caixa" e vê de cara se o dia está fechado ou em aberto, e uma lista dos
últimos dias abaixo do resumo.

## Escopo
- Incluído:
  1. Selo visual ("🟢 Fechado às HH:MM" / "🟡 Ainda em aberto") baseado em existir ou não um
     registro de fechamento geral (`fechado_por: 'Sistema'`, mesma convenção formalizada na
     demanda 092) pra `data_dia` de hoje.
  2. Lista dos últimos N dias (sugestão: 10, mas confirmar com o Edvam se prefere outro número)
     abaixo do resumo, cada linha com: data, quem fechou, total entradas, total saídas,
     divergência. Reaproveitar `ehFechamentoGeral()` (extraída na demanda 092/075) pra não
     duplicar fechamento geral + por operador na mesma linha.
  3. Resumo por operador (bloco que já existe, "Entradas por operador hoje") ganha também a
     coluna de saídas por operador — hoje só mostra entradas.
- Fora de escopo: mudar a lógica de abertura de caixa (isso é a demanda 103, que já vai mexer
  nessa mesma tela — coordenar pra não pisar no mesmo arquivo ao mesmo tempo, ver aviso abaixo).

## Critérios de aceite
- [x] Selo mostra corretamente fechado/aberto, testado nos dois estados
- [x] Histórico lista os últimos dias sem duplicar linha de fechamento geral + por operador
- [x] Resumo por operador mostra entradas E saídas, não só entradas

## Riscos e cuidados
Mudança visual/aditiva (não altera fluxo de abertura nem permissão) — pode ir a qualquer momento
tecnicamente, mas mexe no mesmo arquivo (`TelaFechamento.tsx`) que a demanda 103. **Coordenar com
o PM antes de rodar em paralelo com a 103** — mais seguro rodar em sequência (099 primeiro, 103
depois, ou vice-versa) do que simultâneo, já que não há git nesse repositório.

## Referências
`components/TelaFechamento.tsx`, `lib/supabase-admin.ts` (`getSaldoAnterior`, `ehFechamentoGeral`
— demandas 092/075), `lib/usuarios.ts`.

## Relato de execução

- **O que foi feito:**
  - `lib/supabase-admin.ts`: 2 funções novas.
    - `getStatusFechamentoHoje(dataDia)` — busca `jsgrafica_fechamento` do dia, acha a linha de
      fechamento GERAL (`ehFechamentoGeral`, mesmo filtro por exclusão de nome de operador da
      092/075), retorna `{ fechado, fechadoEm }`.
    - `getHistoricoFechamento(limite=10)` — busca a tabela inteira, filtra só fechamento geral,
      deduplica por `data_dia` (fica com o `fechado_em` mais recente em caso de 2+ linhas gerais
      no mesmo dia, cenário improvável mas possível), ordena por data real (parseada via
      `parseDiaCaixa` — `data_dia` é texto DD-MM-AA, não dá pra ordenar direto no Postgres) e
      corta nos N mais recentes.
  - `app/api/fechamento/route.ts` (GET, sem `operador` — visão geral do admin): passou a chamar
    as 2 funções acima em paralelo com `getResumoPorFormaPagamento`, retornando `fechadoHoje`,
    `fechadoEmHoje`, `historico` na resposta. Caminho com `operador` (fechamento por operador)
    não muda — selo/histórico são conceito só do fechamento geral.
  - `components/TelaFechamento.tsx`:
    - Selo no cabeçalho (🟢 "Fechado às HH:MM" / 🟡 "Ainda em aberto"), só admin.
    - Nova seção "Histórico dos últimos dias" (tabela: dia, entradas, saídas, saldo acumulado,
      divergência), só admin, abaixo do bloco Resumo/Contagem física.
    - Bloco "Entradas por operador hoje" virou "Por operador hoje", mostrando entradas E saídas
      por operador (achado: o dado já vinha na mesma resposta de `/api/fechamento?operador=X`
      desde a 074/080 — `d.totalSaidas` só não estava sendo capturado no `.then()`; não precisou
      de nenhuma chamada de API nova).

- **Testes realizados e resultado:**
  - Estado "🟡 Ainda em aberto": confirmado com Playwright real (screenshot) — hoje (`07-07-26`)
    ainda não tinha fechamento geral no banco (confirmado via SQL antes de testar).
  - Estado "🟢 Fechado às HH:MM": como forçar esse estado exige um fechamento geral REAL de hoje
    (e o caixa de hoje ainda está aberto — não fechar de verdade fora de hora, mesmo cuidado
    reforçado pelo PM), testei inserindo uma linha sintética via SQL direto
    (`fechado_por: 'Sistema'`, valores claramente de teste — `divergencia: 99999`), confirmei o
    selo mudando pra 🟢 com o horário certo (conferido o fuso: `19:20 UTC` → exibido `16:20`,
    Recife = UTC-3), **e apaguei a linha de teste imediatamente depois** (confirmado via SQL:
    `07-07-26` voltou a ter 0 linhas em `jsgrafica_fechamento`, estado real intacto pro
    fechamento de verdade de hoje à noite).
  - Histórico: confirmado por screenshot mostrando os últimos dias em ordem decrescente real
    (`06-07-26`, `03-07-26`, `02-07-26`...) — inclui a âncora `06-07-26` (demanda 090,
    `fechado_por: 'Sistema'`) corretamente, sem duplicar com nenhuma linha por operador.
  - "Por operador hoje": confirmado mostrando entradas E saídas de Edvam/Zu/Gabi lado a lado.
  - PDV (testado logado como Zu): confirmado que selo/histórico/"Por operador hoje" **não
    aparecem** (são só do admin) — abertura de caixa (074) continua normal.
  - `npx tsc --noEmit` e `npm run build` limpos. Reconfirmado em produção via curl:
    `/api/fechamento` retornando `fechadoHoje: false`, `historico` preenchido.

- **Achados fora do escopo:** nenhum.

- **Status final:** concluída e em produção (`dpl_4JgmP1JS726tLykgNgvqUA1PQCA6`). Fora do
  escopo desta demanda (fica pra 103, avisado pelo PM): mudar a lógica de abertura de caixa — não
  toquei em nada relacionado a isso.
