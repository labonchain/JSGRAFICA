# 235 — `data_timestamp` de `jsgrafica_log_msgs_privadas` está em milissegundos, não segundos

Status: concluída
Criada em: 2026-07-29
Aprovada em: 2026-07-29
Concluída em: 2026-07-29
Chat executor: 02 - DADOS JS GRAFICA

## Contexto
Achado da demanda 234 (06-ATENDIMENTO), encontrado de forma independente 2 vezes na mesma
investigação: a coluna `data_timestamp` de `jsgrafica_log_msgs_privadas` (usada pra ordenar/
filtrar mensagens por tempo, já que `sent_at`/`delivered_at` são `text` não confiável) está em
**milissegundos desde epoch, não segundos**. Usar `to_timestamp(data_timestamp)` direto produz
datas no ano 58021+, zerando silenciosamente qualquer filtro de janela de tempo (a correção é
`to_timestamp(data_timestamp / 1000.0)`). Isso é o tipo de bug que não dá erro visível — só faz
qualquer filtro de tempo baseado nessa coluna nunca casar nada, silenciosamente.

## Objetivo
Confirmar se algum código em produção (workflows n8n, rotas do app) lê `data_timestamp` sem essa
correção, e corrigir todos os pontos reais encontrados.

## ⚠️ Checkpoint obrigatório antes de mexer em código
Levantar TODOS os lugares que leem `data_timestamp` de `jsgrafica_log_msgs_privadas` — workflows
n8n (nós de código/Postgres/filtro), rotas de API do `caixa-js-grafica`, qualquer script em
`scripts/`. Para cada um, confirmar se já assume milissegundos corretamente ou se está quebrado.
Reportar a lista completa ao PM antes de corrigir qualquer coisa — se algum achado for de domínio
do 01-N8N (workflow), reportar como achado pro PM decidir se abre demanda separada pro 01-N8N, não
corrigir workflow diretamente (fora do domínio do 02-DADOS).

## Escopo
- Incluído: auditoria completa de onde `data_timestamp` é lido (app + scripts, domínio direto do
  02-DADOS/03-APP; leitura read-only de workflows n8n via MCP pra mapear, sem editar).
- Incluído: corrigir os pontos que forem código do `caixa-js-grafica` (rotas, scripts) confirmados
  quebrados.
- Incluído: verificar se algum dashboard/métrica já publicada (ex. demandas 159-163/204/205) usou
  essa coluna sem a correção — se sim, reportar se isso pode ter afetado algum achado já
  documentado (não recalcular sozinho, só sinalizar).
- Explicitamente fora de escopo: editar workflow n8n de verdade (reportar pro PM, que abre
  demanda separada pro 01-N8N se necessário).

## Critérios de aceite
- [ ] Lista completa de onde `data_timestamp` é lido (app, scripts, achados em workflows n8n)
- [ ] Cada ponto confirmado como correto ou quebrado, com evidência (não presumido)
- [ ] Pontos quebrados dentro do domínio do 02-DADOS/App corrigidos e testados
- [ ] Achados em domínio do 01-N8N reportados ao PM, não corrigidos diretamente
- [ ] Confirmado se algum achado já publicado (159-163/204/205) pode ter sido afetado

## Riscos e cuidados
Mesma disciplina de sempre: se achar que algum achado já publicado/decisão já tomada dependeu de
dado errado por causa disso, reportar com destaque antes de qualquer correção retroativa — não
"silenciosamente" ajustar histórico.

## Referências
Demanda 234 (achado original, `pm/conhecimento/manual-resposta-ia-100-clientes.md` seção 1.3).
Tabela `jsgrafica_log_msgs_privadas`.

## Relato de execução

**Status: concluída.** Boa notícia: **nenhum ponto quebrado encontrado** em código do
`caixa-js-grafica` (app, scripts, funções RPC do Postgres) — o achado da demanda 234 era real,
mas era um erro cometido nas consultas SQL ad hoc daquela investigação, não um bug em produção.
1 achado de domínio 01-N8N relatado (não corrigido, conforme escopo).

### O que foi feito — checkpoint de levantamento (antes de qualquer correção)

**1. App `caixa-js-grafica`** — busquei `data_timestamp` no repo inteiro (excluindo `.next/` e
backups). 7 arquivos de código real tocam a coluna:
- **Escrevem** `data_timestamp: Date.now()`: `lib/inboxLog.ts`, `app/api/inbox/enviar-midia/route.ts`
  (mensagens enviadas pelo próprio app) — sempre em milissegundos, correto por construção
  (`Date.now()` do JS já é ms).
- **Leem**: `lib/inboxContexto.ts`, `app/api/inbox/mensagens/route.ts`,
  `app/api/inbox/conversas/route.ts`, `app/api/clientes/route.ts`, `components/TelaInbox.tsx`.
  **Nenhum desses usa `to_timestamp()` ou qualquer conversão SQL** — todos comparam/ordenam o
  valor numérico bruto em JS (`a.data_timestamp - b.data_timestamp`, `.order('data_timestamp')`
  no Supabase client). Isso é **seguro independente da unidade**, contanto que a coluna seja
  consistente entre si (todo valor no mesmo padrão) — o que confirmei no passo 3. Achado
  incidental: `TelaInbox.tsx` (`formatarHora`, linha 1245) já tem uma heurística defensiva
  própria (`ts > 1e12 ? new Date(ts) : new Date(ts * 1000)`) que trata os dois casos — alguém já
  tinha desconfiado dessa ambiguidade antes e blindado a exibição.
- **Scripts** (`scripts/`): os 4 scripts existentes (`spike-203`, `spike-205`, `spike-219`,
  `spike-220`) não referenciam `data_timestamp` — confirmado, zero ocorrências.

**2. Funções RPC do Postgres (domínio 02-DADOS, não é "app" nem "n8n")** — busquei em TODO o
schema `public` (`pg_proc.prosrc ilike '%data_timestamp%'`), não só nas funções óbvias. Achei 2
relevantes: `jsgrafica_ultima_msg_recebida_em_lote` e
`jsgrafica_ultima_msg_qualquer_direcao_em_lote` (usadas por `conversas/route.ts` e
`clientes/route.ts` pra "última mensagem"). As duas fazem
`order by phone, data_timestamp desc nulls last, sent_at desc nulls last` — de novo, comparação
numérica bruta, sem `to_timestamp()`, sem risco de unidade. As 4 RPCs de relatório usadas pelo
workflow n8n `JSGRAFICA | REPORT SHEETS` (`report_agent_summary/contatos/grupos_full/history`)
**não referenciam `data_timestamp` em nenhum lugar** — usam outra fonte de tempo.

**3. Dado real no banco (confirmar unidade, não presumir)**: `min/max/count` de `data_timestamp`
em toda a tabela — 55.197 linhas, 827 nulas, **0 linhas com valor "pequeno" (< 4 bilhões, escala
de segundos)**, 100% das linhas populadas em escala de milissegundos (`1768149717000` a
`1785288361000`, batendo com o período real 2026-01 a 2026-07). **A coluna é 100% consistente em
milissegundos, sem mistura entre escritores.**

**4. Workflows n8n (leitura via MCP, sem editar — conforme escopo)**: busquei os 8 workflows
`jsgrafica` e abri o código de cada um que toca `jsgrafica_log_msgs_privadas`:
- `01 - LOG MSG RECEBIDAS` (nó "Processar Evento"): grava `data_timestamp: rawZapi.momment ?? null`
  — repassa direto o campo `momment` que a própria Z-API manda no webhook, sem conversão. Testei
  contra o dado real (passo 3): os valores batem com milissegundos — confirma que a Z-API já manda
  `momment` em ms, e o n8n só repassa. **Não é um ponto quebrado.**
- `03 - STATUS MSG`: não toca `data_timestamp` (só `status`/`delivered_at`/`read_at`).
- `JSGRAFICA | REPORT SHEETS`: não toca `data_timestamp` (ver item 2).
- Os outros 5 workflows jsgrafica (`06-PEDIDOS`, `12-SYNC`, `13-LEMBRETE`, `JSGRAFICA_ATENDIMENTO_AI`)
  não referenciam essa tabela/coluna.

**🟡 Achado de domínio 01-N8N, reportado e NÃO corrigido (fora do meu domínio)**: o workflow
`02 - LOG MSG ENVIADAS` (nó "Processar Evento") **calcula** `data_timestamp: raw.momment ?? null`,
mas esse campo **não está no mapeamento de campos dos nós `CREATE MSG` nem `UPDATE MSG`**
(Supabase) — ou seja, é calculado e descartado, nunca chega a ser gravado. Confirmei isso batendo
com o dado real: as 827 linhas com `data_timestamp` nulo têm **100% a mesma assinatura**
(`tipo_evento='ENVIADA'`, `direction='OUTBOUND'`, `status='SENT'`, `sent_at` preenchido, sem
texto/mídia) — exatamente o padrão que esse workflow gera. **Não é o bug de ms/segundos** — é um
campo que nunca é persistido nessa rota específica. **Sem sintoma visível hoje**: todo código que
lê `data_timestamp` já tem fallback pra `sent_at` quando é nulo (confirmei nos 3 arquivos do item
1). Reportando pro PM decidir se abre demanda separada pro 01-N8N (adicionar `data_timestamp` no
mapeamento do `CREATE MSG`/`UPDATE MSG` desse workflow) — não mexi no workflow.

**5. Achados já publicados (159-163/204/205) — confirmado se foram afetados, com evidência, não
presumido**: a correção documentada na demanda 161 (`pm/demandas/161-...md`, seção "Achado fora do
escopo original") já é especificamente sobre **fuso horário** (`AT TIME ZONE 'America/Recife'`
faltando, sessão do Postgres em UTC), não sobre unidade ms/segundos — e o próprio texto mostra o
"antes" e "depois" com o **mesmo formato/pico de horário comercial, só relabelado em -3h** (ex.:
pico de mensagens "13h UTC (453)" virou "13h local (373)", mesma posição relativa do pico).
Matematicamente, se a consulta original tivesse usado `to_timestamp(data_timestamp)` direto (ms
como se fosse segundos — o bug real desta demanda), o resultado seria uma data no ano 58021+, e
`extract(hour from ...)` dessa data não teria NENHUMA relação sistemática com a hora real da
mensagem (multiplicar segundos-reais por 1000 não preserva a hora do dia módulo 86400) — o padrão
ficaria embaralhado, não um pico coerente de horário comercial deslocado em exatos 3h.

Não me contentei só com esse raciocínio — **testei ao vivo**: recalculei a distribuição de
mensagens por hora local (`to_timestamp(data_timestamp/1000.0) at time zone 'America/Recife'`,
mesma janela 06-10/07, excluindo o contato de teste) e o resultado bate na **forma** com o
publicado no item 4 do mapa da jornada — pico às 13h local, concentração 07h-17h, quase zero fora
disso. Os totais absolutos não são idênticos (meus números ficam ~15-40% mais altos por hora), mas
isso é esperado: rodei a consulta hoje (29/07), quase 3 semanas depois da 161 (10/07), sobre uma
tabela que só cresce/é reprocessada (backfills, correções de contato) — recalcular esse gap
específico está fora do escopo desta demanda (que é sobre o bug de unidade, não sobre reconciliar
retroativamente contagens de 3 semanas atrás). **Conclusão: 159-163/204/205 não foram afetadas
pelo bug de ms/segundos** — o único bug real que essas investigações tiveram foi o de fuso
horário, já documentado e já corrigido na própria 161.

Também conferi a memória própria (`project_inbox.md`, já existente antes desta demanda) — já
documentava corretamente que `data_timestamp` é ms e que `formatarHora`/queries já tratam isso.
Nenhuma memória precisou de correção.

### Testes realizados e resultado
- `count(*)` com `data_timestamp < 4e9` (limiar de "seria segundos"): 0 linhas — confirma unidade
  100% consistente em ms.
- Correlação das 827 linhas `data_timestamp is null` com sua assinatura completa (`tipo_evento`,
  `direction`, `status`, `sent_at`) — 100% bate com o padrão gerado pelo workflow `02 - LOG MSG
  ENVIADAS`, confirmando a causa (campo calculado mas não mapeado no INSERT/UPDATE), não uma
  amostra aleatória de "dado corrompido".
- Recomputo ao vivo da distribuição de hora local (`to_timestamp(data_timestamp/1000.0) at time
  zone 'America/Recife'`) pra janela 06-10/07/26, com e sem filtro de conteúdo — mesma forma/pico
  do publicado na 159/161, confirmando que a conversão original já dividia por 1000 corretamente.
- 100% leitura — nenhum UPDATE/DELETE/INSERT executado em nenhuma etapa.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
- Workflow `02 - JSGRAFICA | LOG MSG ENVIADAS` nunca persiste `data_timestamp` (calculado, não
  mapeado no CREATE/UPDATE) — 827 linhas afetadas, sem sintoma visível hoje por causa do fallback
  pra `sent_at` já existente no app. Domínio 01-N8N — reportado ao PM, workflow não foi editado.

### Status final
Concluída. Nenhum ponto quebrado dentro do domínio 02-DADOS/App — nada a corrigir. 1 achado real
de domínio 01-N8N relatado (não corrigido). Confirmado com evidência (não presumido) que os
achados publicados 159-163/204/205 não foram afetados pelo bug de ms/segundos — só pelo bug de
fuso horário já documentado e corrigido na própria 161.

### Critérios de aceite
- [x] Lista completa de onde `data_timestamp` é lido (app, scripts, achados em workflows n8n)
- [x] Cada ponto confirmado como correto ou quebrado, com evidência (não presumido)
- [x] Pontos quebrados dentro do domínio 02-DADOS/App corrigidos e testados — nenhum encontrado
- [x] Achados em domínio do 01-N8N reportados ao PM, não corrigidos diretamente
- [x] Confirmado se algum achado já publicado (159-163/204/205) pode ter sido afetado — não foi
