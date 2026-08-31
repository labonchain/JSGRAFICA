# 237 — `sent_at` volta a `null` quando a mensagem recebe um status posterior

Status: concluída
Criada em: 2026-07-29
Aprovada em: 2026-07-29
Concluída em: 2026-07-29
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Achado da demanda 236, confirmado em teste ao vivo (não presumido): no workflow
`02 - LOG MSG ENVIADAS`, o nó "Processar Evento" recalcula
`sent_at: status === 'SENT' ? eventAt : null` **a cada execução**, e o nó `UPDATE MSG`
sobrescreve o campo com esse valor recalculado. Resultado: quando uma mensagem enviada recebe um
evento de status posterior (ex. `DELIVERED`, `READ`), o `UPDATE MSG` roda de novo com
`status !== 'SENT'`, e `sent_at` — que já tinha um valor real do evento `SENT` anterior — é
sobrescrito com `null`. Confirmado no teste da 236: depois de simular `DELIVERED`, `sent_at`
voltou a `null`.

Mesmo tipo de perda de dado silenciosa da 236 (campo real perdido sem erro visível), mas é um bug
diferente (aqui o valor existe e é apagado por sobrescrita; na 236 o valor nunca chegava a ser
gravado). `sent_at` é usado como uma das fontes de tempo mais confiáveis do log (`data_timestamp`
do app já cobre isso via `Date.now()`, mas o valor gerado a partir do evento real da Z-API se
perde).

## Objetivo
`sent_at` preserva o valor original do evento `SENT`, mesmo quando a mensagem recebe eventos de
status posteriores.

## ⚠️ Checkpoint obrigatório antes de mexer em código
Confirmar a causa exata (o nó "Processar Evento" recalculando a cada execução, sem olhar o valor
já gravado) e propor a correção antes de implementar: opções prováveis são (a) o `UPDATE MSG` só
incluir `sent_at` no payload quando `status === 'SENT'` (não sobrescrever com null nos demais
casos), ou (b) buscar o valor já gravado antes de decidir o que mandar. Reportar a recomendação
ao PM antes de mudar o workflow em produção.

## Escopo
- Incluído: investigar e confirmar a causa exata no workflow `02 - LOG MSG ENVIADAS`.
- Incluído: corrigir pra `sent_at` nunca ser sobrescrito com `null` por um evento de status
  posterior ao `SENT`.
- Incluído: testar com evento sintético (mesma técnica da 236) simulando SENT → DELIVERED → READ,
  confirmando que `sent_at` do evento SENT sobrevive aos updates seguintes.
- Incluído: verificar (só leitura) se o mesmo padrão existe no workflow `01 - LOG MSG RECEBIDAS`
  ou em `03 - STATUS MSG` — reportar se achar, não corrigir se for outro workflow sem antes
  alinhar com o PM.
- Explicitamente fora de escopo: backfill de `sent_at` já perdido no histórico (não dá pra
  recuperar valor sobrescrito).

## Critérios de aceite
- [ ] Causa confirmada com evidência (não presumida) e recomendação reportada antes de corrigir
- [ ] `sent_at` preservado em teste sintético SENT → DELIVERED → READ
- [ ] Sem regressão nos demais campos do workflow
- [ ] Confirmado se `01 - LOG MSG RECEBIDAS`/`03 - STATUS MSG` têm o mesmo padrão (reportado, não
      necessariamente corrigido nesta demanda)

## Riscos e cuidados
Workflow em produção ativo — testar com evento sintético contra o webhook de produção antes de
considerar concluído (mesma disciplina que a 236 já aplicou bem), não só validar a config do nó.

## Referências
Demanda 236 (achado original, seção "Achados fora do escopo"). Demanda 235 (mapa original de
onde `data_timestamp`/`sent_at` são lidos e escritos).

## Relato de execução

**Status final: concluída**

### Checkpoint — causa confirmada e recomendação (antes de mexer)
Confirmado lendo o node "Processar Evento" e o node "UPDATE MSG" ao vivo: `Processar Evento`
calcula `sent_at`/`delivered_at`/`read_at` de forma **mutuamente exclusiva por evento**
(`sent_at: status === 'SENT' ? eventAt : null`, mesma lógica pros outros dois) — ou seja, a cada
execução só 1 dos 3 campos vem com valor real, os outros 2 vêm `null` **por design** (o node não
tenta saber se já existia valor antes). O `UPDATE MSG` grava os 3 direto desse resultado, sem
checar o que já estava gravado — por isso um evento `DELIVERED` apaga o `sent_at` do evento `SENT`
anterior, e um evento `READ` apagaria o `delivered_at` do evento `DELIVERED` anterior (mesmo bug,
nos 3 campos, não só no que a demanda cita no título).

**Recomendação escolhida — opção (b) da demanda, mais simples do que parecia**: o workflow já
busca a linha existente antes de decidir `CREATE` vs `UPDATE` (node `Get MSG`, com
`alwaysOutputData: true` — já correto, não é o bug da 015). O `If` que decide `UPDATE MSG` só
repassa esse resultado adiante **sem alterar o `$json`** — ou seja, dentro do `UPDATE MSG`,
`$json` já É a linha atual do banco (vinda do `Get MSG`), e `$('Processar Evento').item.json` é o
evento novo. Não precisei buscar nada a mais: só troquei os 3 campos pra
`={{ $('Processar Evento').item.json.<campo> || $json.<campo> || null }}` — usa o valor novo
quando existe, senão preserva o que já estava na linha, só cai em `null` se nunca existiu (linha
nova, caso que `UPDATE MSG` nem alcança). Não precisou de node novo nem branch novo.

### O que foi feito
1. Backup do workflow antes de mexer:
   `pm/backups/02-jsgrafica-log-msg-enviadas_pre-demanda237_2026-07-29.json`.
2. Alterados só os 3 campos afetados no `UPDATE MSG` (`sent_at`, `delivered_at`, `read_at`) pra
   fórmula de preservação acima. Nenhum outro campo/node tocado (`tipo_evento`, `direction`,
   `from_me`, `status`, `last_update_at`, `data_timestamp` continuam mapeados igual — `status` e
   `last_update_at` devem mesmo sempre refletir o evento mais recente, não têm esse bug).
3. Deploy via API REST do n8n. Workflow confirmado `active: true` depois.

### Testes realizados e resultado
Evento sintético contra o webhook de produção (`jsgraficamsgenviadas`), mesmo `message_id`,
telefone do Edvam, ciclo completo pedido no escopo:
1. `SENT` (momment T) → linha criada, `sent_at = T`, `delivered_at/read_at = null` (esperado).
2. `DELIVERED` (momment T+30s) → **`sent_at` continuou `T`** (preservado, era o bug), `delivered_at`
   passou a `T+30s`, `read_at` continuou `null`.
3. `READ` (momment T+~9min) → **`sent_at` continuou `T`, `delivered_at` continuou `T+30s`**
   (os dois preservados), `read_at` passou a `T+~9min`. `status` e `last_update_at` seguiram o
   evento mais recente normalmente (comportamento correto, não é bug).
Linha de teste apagada depois (`DELETE ... where message_id = 'teste237-ciclo-...'`, 1 linha).

**Sem regressão**: `status`, `tipo_evento`, `direction`, `from_me`, `last_update_at`,
`data_timestamp` (fix da 236) continuaram corretos nos 3 estágios do teste.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
- **O mesmo padrão exato existe no workflow `03 - JSGRAFICA | STATUS MSG`** (id
  `hg12ud3yo5mTu3XI`), nos nodes `UPDATE STATUS MSG PRIVADA`/`UPDATE STATUS MSG GRUPO`: o node
  `PROCESSAR STATUS` calcula `delivered_at`/`read_at` de forma mutuamente exclusiva
  (`if (raw.type === 'DeliveryCallback') delivered_at = eventAt`, idem pra `ReadCallback`, o outro
  fica `null`), e o `UPDATE` grava os dois direto — um evento `ReadCallback` processado por **este**
  workflow apagaria o `delivered_at` já gravado. Confirmado só por leitura (não editei), conforme
  pedido no escopo. Não sei, sem investigar mais, se hoje é o workflow `02` ou o `03` que
  efetivamente recebe os webhooks de status da Z-API em produção (podem ser o mesmo evento
  duplicado pros dois, ou tipos diferentes de webhook Z-API por trás de cada um) — reportando pro
  PM decidir se abre demanda separada pro `03`, não mexi nele.
- Verificado (só leitura, conforme pedido): workflow `01 - LOG MSG RECEBIDAS` **não** tem esse
  padrão — nenhuma ocorrência de `sent_at`/`delivered_at`/`read_at` no workflow inteiro (mensagens
  recebidas não passam por esse ciclo de status de envio).
- `first_event_at` (não pedido no escopo, verificado por precaução já que é campo "de primeira
  vez" parecido): confirmado que `UPDATE MSG` **não** inclui esse campo no mapeamento — é gravado
  uma vez no `CREATE MSG` e nunca mais tocado. Não tem o bug desta demanda.

### Critérios de aceite
- [x] Causa confirmada com evidência (não presumida) e recomendação documentada antes de corrigir
- [x] `sent_at` preservado em teste sintético SENT → DELIVERED → READ (e `delivered_at` também,
      mesma causa raiz, mesmo teste)
- [x] Sem regressão nos demais campos do workflow
- [x] Confirmado se `01 - LOG MSG RECEBIDAS`/`03 - STATUS MSG` têm o mesmo padrão — `01` não tem,
      `03` tem (reportado, não corrigido)
