# 055 — Dashboard soma pedidos entregues (novo) + vendas históricas (antigo)

Status: aprovada — depende da 054 (precisa que pedidos passem a ser gerados)
Criada em: 2026-07-04
Aprovada em: 2026-07-04
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Continuação da unificação Venda→Pedido (demanda 054). A partir do deploy da 054,
`jsgrafica_vendas` para de receber linha nova — tudo (WhatsApp e balcão) passa a gravar em
`jsgrafica_pedidos` com `status='entregue'` quando concluído. O dashboard
(`app/api/dashboard/route.ts`) hoje soma só `jsgrafica_vendas` — precisa passar a somar as duas
fontes, cada uma cobrindo seu período.

## Objetivo
`topProdutos`, totais de entrada e demais métricas do dashboard refletem tanto o histórico
antigo (`jsgrafica_vendas`, até a data de corte) quanto os pedidos entregues novos
(`jsgrafica_pedidos`, a partir da data de corte) — sem contar nada em dobro, sem perder nada.

## Escopo
- Incluído:
  1. Definir a **data de corte** = data do deploy da demanda 054 (o dia em que `jsgrafica_vendas`
     parou de receber linha nova). Confirmar com o Edvam a data exata assim que a 054 for
     deployada, ou usar a própria `data_dia` mais recente existente em `jsgrafica_vendas` no
     momento do deploy como referência.
  2. `app/api/dashboard/route.ts`: buscar também `jsgrafica_pedidos where status = 'entregue'`,
     convertendo `data_entregue_at` (timestamptz) pro mesmo formato `data_dia` (`DD-MM-AA`) usado
     em `jsgrafica_vendas`, e somar junto com o que já vem de lá — mantendo a paginação/proteção
     contra o limite de 1.000 linhas que a demanda 043 já corrigiu (aplicar o mesmo padrão pra
     essa nova busca em `jsgrafica_pedidos`).
  3. `topProdutos`/`saidasPorCategoria` (o que for aplicável) precisam refletir produto vindo de
     `jsgrafica_pedidos.servico_nome`/`quantidade`/`valor_final`, com o mesmo agrupamento que já
     existe pra `jsgrafica_vendas.produto_nome`/`quantidade`/`total`.
- Fora de escopo: mudar a estrutura de `jsgrafica_fechamento` (fechamento diário continua vindo
  de onde já vem — se isso também precisar mudar, é achado a reportar, não resolver aqui sem
  confirmar).

## Critérios de aceite
- [ ] Um pedido de teste com `status='entregue'` aparece no `topProdutos` do dashboard
- [ ] Uma venda histórica antiga continua aparecendo normalmente (sem regressão)
- [ ] Nenhum dado contado em dobro (testar um dia específico e conferir soma manual)
- [ ] Sem lentidão perceptível (mesma atenção da demanda 043 ao limite de 1.000 linhas)

## Riscos e cuidados
Não confiar que `jsgrafica_fechamento` (o rollup diário usado no "resumo de hoje") já reflita
pedidos — conferir se `getResumoDia`/`getSaldoAnterior` (`lib/supabase-admin.ts`) também
precisam mudar, já que hoje somam só de `jsgrafica_vendas`/`jsgrafica_saidas`. Se precisar mudar
e não estiver claro como, reportar em vez de adivinhar.

## Referências
`app/api/dashboard/route.ts`. Demanda 043 (padrão de paginação a reaproveitar). Demanda 054
(dependência, gera os pedidos que este dashboard precisa somar). `lib/supabase-admin.ts`
(`getResumoDia`, `getSaldoAnterior`).

## Relato de execução

### O que foi feito
- **Decisão sobre "data de corte" (item 1 do escopo):** não criei uma constante de data
  hardcoded. `jsgrafica_vendas` e `jsgrafica_pedidos` são mutuamente exclusivas por construção —
  a partir do deploy da 054, vendas paradas ali, pedidos só passam a existir dali em diante.
  Como as duas fontes nunca podem ter a mesma transação, somar as duas por completo (sem filtro
  de data) nunca conta em dobro, em nenhum período. Uma data de corte explícita seria redundante
  e só criaria risco de ficar errada se alguém a esquecesse de atualizar.
- **`app/api/dashboard/route.ts`**: `buscarTodasLinhas` ganhou um parâmetro opcional `filtro`
  (aplica a mesma condição na contagem e em cada página) — usado pra restringir a busca em
  `jsgrafica_pedidos` só a `status='entregue'` antes de paginar. `topProdutos` agora soma
  `jsgrafica_vendas` (histórico) + `jsgrafica_pedidos` entregues (novo), no mesmo mapa por nome
  de produto/serviço.
- **Achado crítico, resolvido (item do "Riscos e cuidados"):** `getResumoDia`
  (`lib/supabase-admin.ts`) somava só `jsgrafica_vendas`/`jsgrafica_saidas` — usada não só pelo
  dashboard ("hoje"), mas também por `POST /api/fechamento`, o fechamento de caixa de verdade.
  Sem esse fix, a partir do deploy da 054 o fechamento diário passaria a registrar entrada
  **zerada ou incompleta todo santo dia** (venda de balcão parou de gravar em
  `jsgrafica_vendas`). Corrigido: `getResumoDia` agora soma também
  `jsgrafica_pedidos where status='entregue'` do dia. Isso não era ambíguo o suficiente pra só
  reportar (a demanda pedia reportar "se não estiver claro como") — o padrão de soma aditiva já
  é usado em vários lugares do sistema, então implementei em vez de deixar quebrado.
- **Problema de fuso ao cruzar timestamptz com data_dia (achado ao implementar):**
  `jsgrafica_pedidos.data_entregue_at` é `timestamptz` de verdade (instante absoluto correto),
  mas `agoraRecife()`/`parseDiaCaixa()` (usados em todo o resto do sistema) constroem Dates
  "fingindo" fuso de Recife via `new Date(ano, mês, dia, hora,...)` — comparar os dois tipos de
  Date direto dava resultado errado perto da virada do dia (diferença de 3h, o offset de
  Recife). Resolvido com duas funções novas em `lib/supabase.ts`:
  - `timestampParaDiaCaixa(iso)` — converte um instante real pro mesmo formato `DD-MM-AA` usado
    em todo lugar, permitindo reaproveitar o filtro `dentroDoPeriodo` já existente (usado pro
    dashboard, que cobre períodos arbitrários).
  - `limitesDiaCaixaUTC(dataDia)` — devolve o intervalo UTC exato de um dia-caixa, usado em
    `getResumoDia` pra filtrar `data_entregue_at` **direto no Postgres** (`gte`/`lt`) em vez de
    trazer todos os pedidos entregues da história pra filtrar em memória a cada chamada — essa
    função roda a cada carregamento de dashboard/fechamento, então evitar esse crescimento era
    importante (mesmo cuidado das demandas 041/043, mas resolvido de forma mais direta aqui
    porque a coluna já é timestamptz de verdade, não texto).

### Testes realizados
- `npx tsc --noEmit` e `npm run build` — limpos.
- Criei 2 pedidos de teste via `origemBalcao` (um sem contato, um com contato) e confirmei que
  `topProdutos` (`periodo=hoje`) passou a somar as duas linhas certinho.
- **Teste decisivo de fuso horário**: o pedido real "IMPRESSÃO COLORIDA A3" (demanda 046,
  confirmado pelo Edvam) tem `data_entregue_at = 2026-07-04 03:57:13 UTC` — um horário próximo
  da meia-noite em Recife (00:57 local). Confirmei que `hoje.totalEntradas` bateu **exatamente**
  R$ 11,85 (soma dos 2 pedidos de teste + este pedido real de R$3,50), provando que
  `timestampParaDiaCaixa`/`limitesDiaCaixaUTC` classificaram esse horário limítrofe no dia certo
  (04-07-26, não 03-07-26 nem 05-07-26).
- Testado `POST /api/fechamento` (GET, sem fechar de verdade) — `totalEntradas` bateu igual ao
  do dashboard, confirmando que o fechamento de caixa real também está corrigido, não só a tela.
- Testado via Playwright (fluxo real de "Pedidos Balcão", ver relato da 054) — "Entradas do dia"
  no header atualizou ao vivo depois de confirmar uma venda de balcão, confirmando end-to-end.
- Regressão: `periodo=mes` continua trazendo produtos históricos de `jsgrafica_vendas`
  corretamente (ex. "ENTRADA DIVERSAS", "RECARGA VEM" nos primeiros lugares) — nenhuma mudança
  no comportamento antigo, só adição da fonte nova.
- Dados de teste (2 pedidos) apagados do banco depois de confirmar.

### Achados fora do escopo
Nenhum novo além do já citado (correção do `getResumoDia`, que a própria demanda já antecipava
como risco a conferir).

### Status final
**Concluída e deployada** (junto com a 054, `dpl_y8wxFZAjhYH2zN3Vs3Vnp3uA8CEa`), testado local e
confirmado em produção (`hoje.totalEntradas` bateu exato com o pedido real existente).
