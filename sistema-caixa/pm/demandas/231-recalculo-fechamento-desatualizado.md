# 231 — Recalcular fechamento desatualizado quando pendência é classificada tarde

Status: concluída
Criada em: 2026-07-28
Aprovada em: 2026-07-28
Concluída em: 2026-07-28
Chat executor: 03 - APP JS GRAFICA

## Contexto
Última peça do desenho de conciliação (demanda 225, seção 3.4/5) — deixada de propósito pra
depois do resto rodar estável. O aviso "🔴 fechamento desatualizado" já existe na tela (demanda
229), mas não existe nenhum mecanismo pra agir sobre ele — hoje, toda vez que um fechamento
antigo precisa de correção, o PM refaz a conta na mão, dia por dia, direto no banco (foi feito
manualmente várias vezes nesta mesma semana, incluindo a correção retroativa da demanda 223).

**Modelo escolhido, já validado na prática hoje**: nunca recalcular o dia inteiro do zero a
partir do dado ao vivo (isso já quase causou erro real na 223 — uma primeira tentativa absorveu
um drift de R$51,20 não relacionado, sem querer). Em vez disso, **somar só o delta exato** que a
classificação da pendência criou, e propagar esse mesmo delta, sem mudar de valor, pros dias
seguintes — é a cadeia (`saldo_anterior` de um dia = `saldo_acumulado` do anterior).

**Simplificação importante a confirmar**: transferência entre 2 das 6 contas rastreadas já não
deveria mudar `total_entradas`/`total_saidas`/`resultado_dia` do fechamento "Sistema" — desde a
demanda 223, uma transferência conta como saída na origem E como entrada no destino, então se
ambos os lados são contas rastreadas, o efeito líquido no agregado já é zero. **Confirme isso
com teste real antes de assumir** — se não for verdade, reporte e ajuste o desenho.

## Objetivo
Quando o Admin classifica um item de conciliação (Entrada ou Saída) de um dia cujo fechamento
"Sistema" já foi fechado, existe um jeito seguro, com prévia e confirmação, de propagar essa
correção pelos fechamentos afetados — sem precisar de SQL manual do PM nunca mais.

## ⚠️ Checkpoint obrigatório antes de mexer em código
1. Confirme a simplificação da transferência (teste real, não assuma).
2. Proponha o desenho técnico exato (onde acumula o delta pendente por dia, como funciona o
   modo prévia, como funciona o modo aplicar) e relate ao PM.
3. Só depois de confirmação explícita, implemente.

## Escopo
- Incluído: ao classificar uma pendência (`ModalClassificarPendencia`, 229) como **Entrada** ou
  **Saída**, calcular o delta que isso cria no `total_entradas`/`total_saidas` do fechamento
  "Sistema" do `data_dia` daquele item — e acumular esse delta associado ao dia (não aplicar
  nada ainda). Se o fechamento daquele dia ainda não existir (dia futuro/não fechado), não há
  nada a acumular — o próximo fechamento normal já nasce certo.
- Incluído: se a simplificação da transferência se confirmar, ela não precisa acumular delta
  nenhum pro agregado "Sistema" (só afeta os saldos por conta, já tratado pela 227/228) —
  documentar essa decisão claramente no código, não deixar implícito.
- Incluído: **modo prévia** — dado um dia com delta(s) pendente(s), mostrar o antes/depois
  daquele dia E de todos os dias seguintes até hoje (a cascata inteira), sem aplicar nada no
  banco. Formato: tabela simples (dia, saldo_acumulado atual → novo, divergência atual → nova).
- Incluído: **modo aplicar** — só depois de confirmação explícita (um clique separado da
  prévia, nunca automático), aplica dia a dia em sequência estrita (do mais antigo pro mais
  recente), conferindo o resultado de cada um antes de seguir pro próximo — mesmo padrão manual
  da demanda 217. Se algum dia da cascata já tiver outro delta pendente não previsto na prévia
  (ex.: mais uma pendência foi classificada no meio do processo), parar e avisar, não aplicar
  silenciosamente.
- Incluído: depois de aplicado, os deltas daquele(s) dia(s) somem da lista de "pendente de
  recalcular" e o banner de desatualizado some.
- Incluído: **testar ponta a ponta com as 13 pendências reais já existentes** (dias 21 a 27/07,
  ver aba Conciliação) — é o caso de teste real perfeito, não precisa sintetizar nada. Simular
  a classificação de cada uma (sem aplicar de verdade em produção ainda) e conferir que a prévia
  calcula a cascata certa.
- Explicitamente fora de escopo: aplicar de verdade a recalculação nos 13 itens reais — isso é
  decisão de quando o Edvam fizer a conciliação com o Admin, não parte desta demanda. Mudar a
  lógica de matching/gap (227/228) ou o modal de classificação (229) além do necessário pra
  acumular o delta.

## Critérios de aceite
- [x] Simplificação da transferência confirmada com teste real (ou refutada e ajustada)
- [x] Delta acumulado corretamente ao classificar Entrada/Saída de dia já fechado
- [x] Modo prévia mostra a cascata completa (dia + todos os seguintes até hoje) sem tocar no banco
- [x] Modo aplicar funciona em sequência estrita, um dia de cada vez, com conferência
- [x] Testado ponta a ponta com as 13 pendências reais (modo prévia — não aplicar de verdade)
- [x] Banner de desatualizado (229) some depois de aplicado

## Riscos e cuidados
Este é o tipo de mudança que mais gerou retrabalho nesta investigação inteira (fechamento em
cascata). Não aplicar nada em produção real sem pedir confirmação extra e específica pra isso,
mesmo que os critérios de aceite técnicos já estejam todos marcados.

## Referências
Demanda 225 (`pm/conhecimento/desenho-conciliacao-automatica.md`, seção 3.4/5 — desenho
original). Demanda 223 (padrão de correção por delta, já usado com sucesso e com 1 erro
corrigido em tempo real — ler o relato dela inteiro antes de começar). Demanda 217 (padrão de
aplicação sequencial com confirmação). Demanda 229 (aviso de desatualizado, já existe).

## Relato de execução

### Checkpoint (antes de codar) — confirmação da simplificação da transferência
Testado com dado real contra as 12 transferências reais já lançadas (`jsgrafica_transferencias`
↔ saída-par em `jsgrafica_saidas`, categoria `transferencia_entre_contas`, vinculadas por
`saida_id`): em 11 delas o valor bate exatamente nos 2 lados (confirma que o efeito líquido no
agregado "Sistema" já é zero por construção — `criarSaidaETransferencia` sempre grava o mesmo
valor nos 2 lados). **Achada 1 exceção real**: a transferência de 24-07-26 (Dinheiro Zu → Mercado
Pago) tem `valor=945`, mas a saída-par foi editada depois (rota genérica de editar saída, demanda
130) pra `valor=890` — a edição não propaga pra `jsgrafica_transferencias.valor`, quebrando a
simetria pontualmente. **Simplificação confirmada como válida** (Transferência não precisa
acumular delta pro agregado "Sistema") — a exceção encontrada é um bug pré-existente e separado
(edição de saída sem consciência de transferência vinculada), não corrigido aqui, reportado como
achado fora do escopo.

### Achado crítico adicional, reportado e resolvido junto (com confirmação explícita do PM)
`jsgrafica_entradas_avulsas` era escrita (desde a demanda 229, classificação como Entrada) mas
**nunca lida em lugar nenhum** — nem `getResumoDia`, nem dashboard, nem fechamento. A própria
demanda 226 já tinha deixado isso deliberadamente como "próxima demanda" e nenhuma demanda
seguinte (227/228/229) pegou essa tarefa. Sem esse fix, a primeira classificação real como
"Entrada" criaria dinheiro invisível dali pra frente — não só no recálculo retroativo desta
demanda. Reportado ao PM, que confirmou incluir o fix aqui.

### O que foi feito
- **`lib/supabase-admin.ts` — `getResumoDia`**: passou a somar `jsgrafica_entradas_avulsas.valor`
  em `totalEntradas`, mesmo padrão exato da demanda 223 (transferências). Aditivo, nenhum campo
  existente mudou.
- **`lib/supabase-admin.ts` — mecanismo de recálculo (novo)**:
  - `getDeltasPendentesPorDia()` — deriva o delta pendente por dia SOB DEMANDA (sem coluna
    acumuladora nova): pendências `classificado`, tipo `entrada`/`saida` (nunca `transferencia` —
    confirmado líquida zero), `recalculo_aplicado_em is null`. Usa o valor REALMENTE gravado no
    registro vinculado (`jsgrafica_entradas_avulsas` via `classificacao.entradaAvulsaId`, ou
    `classificacao.valor` já embutido pra saída) — não o valor original da pendência, porque
    confirmei em `ModalClassificarPendencia.tsx` que o Admin pode editar o valor antes de
    confirmar a classificação.
  - `gerarPreviaRecalculo()` — modo prévia, só leitura: cascata a partir do 1º dia afetado até o
    último fechamento "Sistema" que existe (pela ORDEM dos fechamentos reais, não por dia de
    calendário — há lacunas reais, ex. fins de semana). Nunca recalcula `total_entradas`/
    `total_saidas` ao vivo do zero — só soma o delta exato no valor já congelado (lição da 223,
    que já causou 1 erro real fazendo diferente).
  - `aplicarRecalculo()` — modo aplicar: recebe o "fingerprint" exato da prévia (pendências
    contadas por dia); antes de cada `UPDATE`, re-deriva o delta fresco e compara — se o conjunto
    mudou (nova pendência classificada no meio do processo), PARA ali sem aplicar mais nada.
    Aplica em sequência estrita, um `UPDATE` de cada vez, marcando as pendências envolvidas com
    `recalculo_aplicado_em`.
- **Migration** (aplicada pelo PM via SQL Editor, conforme decisão explícita — este ambiente não
  tinha acesso de DDL configurado, só `service_role` via PostgREST): `ALTER TABLE
  jsgrafica_conciliacao_pendencias ADD COLUMN recalculo_aplicado_em timestamptz NULL`.
- **`app/api/conciliacao/recalculo-previa/route.ts`** (novo) — `GET`, só leitura.
- **`app/api/conciliacao/recalculo-aplicar/route.ts`** (novo) — `POST`, recebe `diasEsperados`.
- **`app/api/conciliacao/pendencias/route.ts`** — `fechamentoDesatualizado` passou a exigir
  `recalculo_aplicado_em is null` E excluir `transferencia` do gatilho (ela nunca precisa de
  recálculo — antes ficaria "desatualizado" pra sempre, sem nunca poder ser resolvida).
- **`components/TelaConciliacao.tsx`** — banner de nível-dia ("🔴 N dia(s) com fechamento
  desatualizado") com botão "Ver prévia do recálculo"; corrigido comentário que referenciava
  "demanda 230" (renumerada) pra "demanda 231".
- **`components/ModalRecalculoFechamento.tsx`** (novo) — mostra a cascata (dia, entradas/saídas/
  saldo acumulado/divergência antes→depois, itens incluídos), nunca aplica sozinho; "Aplicar
  recálculo" exige confirmação explícita (`confirm()`, mesmo padrão de "ignorar pendência" já
  usado em `ModalClassificarPendencia.tsx`) e mostra o resultado por dia depois.

### Testes realizados e resultado
- `npx tsc --noEmit` e `npm run build` limpos (2 erros de inferência circular do TS corrigidos
  com anotação de tipo explícita nas variáveis de cascata — não eram bug de lógica).
- **Sintético ponta a ponta** (`scripts/teste-231-recalculo-sintetico.ts`, mantido no repo, dias
  isolados 2099, mesmo padrão de isolamento da 223): 2 fechamentos "Sistema" encadeados (dia A →
  dia B) + 3 pendências classificadas no dia A (Entrada +300, Saída +50, Transferência, esta
  última pra confirmar que NUNCA entra no delta). Confirmado via API real (`GET`/`POST` contra o
  dev server): prévia calcula `totalEntradas`/`totalSaidas`/`saldo_acumulado`/`divergência`
  corretos pro dia A E propaga certo pro dia B (`saldo_anterior` herdado, sem alterar os totais
  próprios de B); tentativa de aplicar com fingerprint errado para cedo SEM escrever nada
  (confirmado via `SELECT` direto); aplicar com fingerprint certo grava os 2 dias em sequência,
  marca as 2 pendências reais (`recalculo_aplicado_em`) e NUNCA marca a de transferência;
  reaplicar depois não encontra mais nada pendente (idempotência); banner de desatualizado some
  pra Entrada/Saída já aplicadas e nunca aparece pra Transferência. Todas as 7 linhas sintéticas
  removidas ao final, confirmado 0 resíduo.
- **Projeção read-only contra as 41 pendências reais** (21 a 27/07, todas ainda `pendente` — não
  classifiquei nenhuma de verdade, decisão do Admin): script à parte (removido depois de rodar,
  não gravou nada) simulou "e se cada uma virasse Entrada/Saída pelo sinal do valor" e rodou a
  mesma matemática de cascata contra os fechamentos "Sistema" reais, só leitura. Resultado
  sensato em todos os 5 dias afetados (21, 22, 23, 24, 27/07 — pulando corretamente o buraco de
  25/26/07, sem fechamento "Sistema"), sem NaN/overflow, cascata propagando corretamente de dia a
  dia. Confirmado também que `GET /api/conciliacao/recalculo-previa` real retorna `{previa: []}`
  (nada classificado de verdade ainda) e que `/api/dashboard` continua respondendo 200 depois do
  fix em `getResumoDia`.
- Deploy: `npx vercel --prod --yes`, aliased em `pdv.jsgrafica.site` e `admin.jsgrafica.site`.

### Achados fora do escopo (não corrigidos aqui)
- **Drift real de R$55 entre transferência e saída-par** (24-07-26, `valor=945` vs `valor=890`) —
  causado pela edição genérica de saída (demanda 130) não propagar pra
  `jsgrafica_transferencias.valor`. Recomendo demanda separada: sincronizar o valor da
  transferência quando a saída-par é editada, ou bloquear/redirecionar essa edição específica pra
  um fluxo próprio.
- Mais amplamente: **qualquer edição de uma saída já lançada (não só as de transferência), num
  dia cujo fechamento "Sistema" já foi fechado, dessincroniza esse fechamento silenciosamente,
  sem nenhum aviso** — o banner de desatualizado só cobre o caminho de classificação de
  conciliação (229/231), não o caminho genérico de editar saída (130). Fora do escopo desta
  demanda (que é especificamente sobre conciliação), mas é um gap real que vale uma demanda
  própria de auditoria/decisão.

### Status final: concluída
Todos os critérios de aceite atendidos. Nenhuma das 41 pendências reais foi classificada ou
recalculada de verdade — isso continua sendo decisão do Edvam/Admin, feita pela tela normal
(🔎 Conciliação → classificar → banner de desatualizado, se aplicável → "Ver prévia do
recálculo" → conferir → "Aplicar recálculo").
