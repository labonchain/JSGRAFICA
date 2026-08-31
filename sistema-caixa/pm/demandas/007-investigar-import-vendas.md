# 007 — Investigar a importação de 946 linhas em jsgrafica_vendas

Status: concluída
Criada em: 2026-07-02
Aprovada em: 2026-07-02
Concluída em: 2026-07-02
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
Achado fora de escopo na demanda 002: `jsgrafica_vendas` recebeu 946 linhas novas em
2026-07-02 com `operador='import'` e `phone=null`. Parece a importação do histórico do
Google Sheets (item antigo do backlog, ver `HISTORICO.md`), mas não está confirmado quem/o
que rodou, quando exatamente, nem se terminou corretamente. O Edvam não tem certeza do que é.

## Objetivo
Identificar a origem exata dessa importação, confirmar se terminou corretamente (sem
duplicar ou perder dado), e avaliar como esse dado pode ser usado (ex.: alimentar
dashboard/histórico).

## Escopo
- Incluído: analisar as 946 linhas (datas cobertas, produtos, valores, timestamps de
  `created_at`), comparar com o que se sabe do histórico do Google Sheets (`data_dia` no
  formato DD-MM-AA), checar se há duplicidade com vendas já existentes, e propor como esse
  dado deveria ser tratado (mantido como está, vinculado a contato quando possível, etc.).
- Fora de escopo: apagar ou alterar essas linhas sem aprovação.

## Critérios de aceite
- [ ] Origem da importação identificada (ou "não determinável")
- [ ] Confirmação de que não há duplicidade/perda de dado
- [ ] Proposta de como usar/tratar esse dado daqui pra frente

## Riscos e cuidados
Não alterar as 946 linhas nesta demanda — é só diagnóstico.

## Referências
Tabela `jsgrafica_vendas`. Ver `HISTORICO.md` (Fase 3 — migração Sheets → Supabase) e
demanda 002 (onde foi encontrado).

## Relato de execução

**Status: concluída.** Só diagnóstico, nenhuma linha alterada.

### Origem — identificada com certeza

Essa importação **fui eu mesmo quem rodei**, nesta mesma sessão de chat, mais cedo hoje
(2026-07-02), **antes desse fluxo de tarefas/demandas existir** — por isso o Edvam não
reconheceu de cara. O Edvam me passou o link de uma planilha Google Sheets
(`Caixa_JS_Grafica_ATUAL.xlsx`, mantida manualmente pela gráfica com uma aba por dia) e pediu
para trazer esse histórico pro Supabase. Escrevi um parser, validei os 50 dias contra os
totais que a própria planilha reporta (0 divergência) e importei via script Node usando o
mesmo client Supabase que o app usa em produção.

**Isso NÃO é a mesma migração da Fase 3 do `HISTORICO.md`** (aquela rodou em 2026-05-02, trouxe
2.727 linhas com datas de **2025** — `01-05-25` a `31-07-25`, soma R$ 108.820,16 — é a migração
original Sheets→Supabase feita na construção do sistema). São dois batches de import
completamente distintos, distinguíveis por `created_at`:

| Batch | `created_at` | Linhas | Período (`data_dia`) | Soma |
|---|---|---|---|---|
| Migração original (Fase 3) | 2026-05-02 | 2.727 | 2025 (mai–jul) | R$ 108.820,16 |
| **Este (investigado aqui)** | **2026-07-02** | **946** | 2026 (24/abr–03/jul, 49 dias com movimento) | **R$ 42.459,39** |

Junto dessa mesma importação (mesma origem, mesma sessão) também entraram 237 linhas em
`jsgrafica_saidas` e 50 registros (upsert) em `jsgrafica_fechamento` — fora do escopo desta
demanda (que é só `jsgrafica_vendas`), mas registrado aqui pra rastreabilidade completa.

### Confirmação de que não há duplicidade nem perda de dado

- **Duplicidade interna:** nenhuma linha repetida dentro das 946 (mesmo `data_dia` +
  `produto_nome` + `quantidade` + `valor_unit` + `total` não se repete).
- **Duplicidade com o outro batch:** sem sobreposição possível — os dois batches cobrem anos
  diferentes (2025 vs 2026) no campo `data_dia`.
- **Duplicidade com vendas reais do PDV:** existem 9 linhas de vendas reais (não-import) em
  datas de 2026 — `02-05-26` (Zu, R$ 1,45) e `03-05-26` (Edvam R$ 21,00 + Zu R$ 3,50) — mas
  **nenhuma dessas datas está entre as abas da planilha importada** (a planilha pula direto de
  `01-05-26` pra `04-05-26`), então não há conflito. O único dia que colidia de fato
  (`02-07-26`, com lançamentos de teste do PDV) já tinha sido resolvido antes de importar:
  apaguei o teste e substituí pelo dia real da planilha, na mesma sessão.
- Total conferido: 946 linhas, 49 dias distintos com movimento (o dia 50, `03-07-26`, ficou
  zerado — sem vendas naquele dia, só o fechamento), soma R$ 42.459,39 — bate exatamente com
  a soma que a própria planilha reporta.

### Proposta de uso

**Já está em uso** — não precisa de nenhuma ação adicional. `app/api/dashboard/route.ts` lê
`jsgrafica_vendas` sem filtrar por `operador`, então essas 946 linhas já alimentam o
dashboard/fluxo de caixa automaticamente, lado a lado com as vendas reais do PDV. Já testei ao
vivo (mesma sessão) os 6 filtros de período (hoje/semana/mês/3 meses/ano/tudo) depois dessa
importação — todos bateram com o esperado. Único ponto que exigiu correção à parte (já feita,
fora do escopo desta demanda porque é código do app, domínio 03-APP): dois bugs de comparação
de data como texto no dashboard, que já foram corrigidos e implantados em produção antes
desse fluxo de tarefas existir.

**Recomendação:** nada a fazer aqui. Se quiser, registrar essas 946 linhas no `HISTORICO.md`
como uma "Fase 3b" (backfill adicional abr–jul/2026 via planilha manual), pra não confundir
com a Fase 3 original — mas isso é decisão do PM, não execução minha.
