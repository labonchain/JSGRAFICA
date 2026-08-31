# 236 — Workflow "02 - LOG MSG ENVIADAS" calcula `data_timestamp` mas nunca grava

Status: concluída
Criada em: 2026-07-29
Aprovada em: 2026-07-29
Concluída em: 2026-07-29
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Achado da demanda 235 (02-DADOS), confirmado com evidência (não presumido): o nó "Processar
Evento" do workflow `02 - LOG MSG ENVIADAS` **calcula** `data_timestamp: raw.momment ?? null`,
mas esse campo não está no mapeamento de campos dos nós Supabase `CREATE MSG`/`UPDATE MSG` — ou
seja, é calculado e descartado, nunca chega a ser gravado. As 827 linhas de
`jsgrafica_log_msgs_privadas` com `data_timestamp` nulo têm 100% a mesma assinatura
(`tipo_evento='ENVIADA'`, `direction='OUTBOUND'`, `status='SENT'`, `sent_at` preenchido) — exatamente
o padrão gerado por esse workflow, confirmando a causa.

**Sem sintoma visível hoje**: todo código que lê `data_timestamp` já tem fallback pra `sent_at`
quando é nulo (confirmado na 235). Por isso isso não é urgente/quebrando nada agora — mas é uma
perda de dado real e silenciosa que só vai crescer (toda mensagem enviada pelo n8n perde esse
campo), e qualquer funcionalidade futura que dependa de `data_timestamp` com precisão de
milissegundo (ex. ordenação fina entre mensagens do mesmo segundo, cálculo de rajada) vai herdar
esse buraco sem avisar.

## Objetivo
O workflow `02 - LOG MSG ENVIADAS` grava `data_timestamp` corretamente em toda mensagem nova,
igual já acontece no workflow `01 - LOG MSG RECEBIDAS`.

## Escopo
- Incluído: adicionar `data_timestamp` ao mapeamento de campos dos nós Supabase `CREATE MSG` e
  `UPDATE MSG` do workflow `02 - LOG MSG ENVIADAS`, usando o valor que o nó "Processar Evento" já
  calcula (`raw.momment ?? null`) — mesma lógica que o `01 - LOG MSG RECEBIDAS` já usa certo.
- Incluído: validar com um envio real de mensagem pelo Inbox que a linha nova sai com
  `data_timestamp` preenchido.
- Explicitamente fora de escopo: backfill das 827 linhas históricas com `data_timestamp` nulo —
  não há como recuperar o valor original perdido (não foi gravado em lugar nenhum); se quiser
  aproximar via `sent_at`, é decisão separada do Edvam, não faz parte desta demanda.
- Explicitamente fora de escopo: qualquer mudança em `01 - LOG MSG RECEBIDAS` ou em código do app
  (já confirmados corretos na 235).

## Critérios de aceite
- [ ] `data_timestamp` mapeado corretamente nos nós `CREATE MSG`/`UPDATE MSG` do workflow 02
- [ ] Testado com envio real (Inbox → Z-API → linha nova em `jsgrafica_log_msgs_privadas` com
      `data_timestamp` preenchido, em milissegundos, batendo com o `sent_at` do mesmo evento)
- [ ] Sem regressão no restante do workflow (envio continua funcionando, outros campos intactos)

## Riscos e cuidados
Mudança pequena e isolada, mas é workflow em produção ativo — testar num evento real antes de
considerar concluído, não só validar a configuração do nó.

## Referências
Demanda 235 (achado original, `pm/demandas/235-data-timestamp-milissegundos-nao-segundos.md`,
seção "Achados fora do escopo"). Workflow `01 - LOG MSG RECEBIDAS` (referência do mapeamento
certo). Tabela `jsgrafica_log_msgs_privadas`.

## Relato de execução

**Status final: concluída**

### O que foi feito
1. Backup do workflow `02 - JSGRAFICA | LOG MSG ENVIADAS` (id `e0hz8JrWRM4XTLEM`) antes de mexer:
   `pm/backups/02-jsgrafica-log-msg-enviadas_pre-demanda236_2026-07-29.json`.
2. Confirmado o achado da 235 lendo o node "Processar Evento" ao vivo: calcula
   `data_timestamp: raw.momment ?? null`, mas os nós Supabase `CREATE MSG` e `UPDATE MSG` não
   tinham esse campo no `fieldsUi.fieldValues` — exatamente como relatado.
3. Adicionado `{ fieldId: "data_timestamp", fieldValue: "={{ $('Processar Evento').item.json.data_timestamp }}" }`
   nos dois nós — mesmo padrão de referência (`$('Processar Evento').item.json.*`) já usado nos
   outros campos desses mesmos nós, sem inventar estilo novo. Nenhum outro campo/nó tocado.
4. Deploy via API REST do n8n (`PUT /workflows/{id}`, ver `reference_n8n_api_escrita.md`) — MCP
   continua só leitura. Workflow confirmado `active: true` depois do deploy (nunca desativado).

### Testes realizados e resultado
1. **Envio real pelo Inbox** (`POST /api/inbox/responder` em produção, pro número do Edvam,
   mensagem identificada como teste): `data_timestamp` saiu preenchido na linha
   (`1785301237037`). **Mas esse teste sozinho não prova o fix** — descobri que a rota do Inbox já
   grava `data_timestamp: Date.now()` direto pelo app (`lib/inboxLog.ts`, achado da própria 235),
   e a lista de execuções do workflow 02 pra esse `message_id` veio vazia — ou seja, esse envio
   específico não chegou a passar pelo `CREATE MSG`/`UPDATE MSG` que eu mudei (a linha e o campo
   `DELIVERED`/`data_timestamp` vieram do app + do workflow `03 - STATUS MSG`, que não toca
   `data_timestamp`, confirmado na 235). Reportando isso com transparência em vez de aceitar um
   teste que parecia passar mas não testava o código certo.
2. **Teste direto no webhook do workflow 02** (mesma técnica das demandas 015/134/135/169 —
   evento sintético reproduzindo o payload real, contra o webhook de produção, não contra o
   roteamento do 01): 2 chamadas com `messageId` de teste novo (`teste236-create-<epoch>`),
   telefone do Edvam:
   - 1ª chamada (`status: SENT`, `momment: 1785332737000`) → **caminho `CREATE MSG`** (linha nova):
     `tipo_evento: ENVIADA`, `direction: OUTBOUND`, `status: SENT`, **`data_timestamp:
     1785332737000`** (bate exato com o `momment` enviado) — confirma o fix no `CREATE MSG`.
   - 2ª chamada (mesmo `messageId`, `status: DELIVERED`, `momment: 1785332795000`) → **caminho
     `UPDATE MSG`**: `status: DELIVERED`, `delivered_at` preenchido, **`data_timestamp`
     atualizado pra `1785332795000`** (o novo valor, não ficou preso no antigo) — confirma o fix
     no `UPDATE MSG` também.
   - Linha de teste apagada depois (`DELETE ... where message_id = 'teste236-create-1785332737000'`,
     confirmado 1 linha afetada).
3. **Sem regressão**: nos dois testes acima, todos os outros campos que já funcionavam antes
   (`tipo_evento`, `direction`, `status`, `sent_at`/`delivered_at`, `phone`, `instance_id`)
   continuaram corretos — a única mudança de comportamento foi `data_timestamp` passar a ser
   gravado.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
- **`sent_at` fica `null` depois que a mensagem recebe um evento de status posterior** (ex.
  `DELIVERED`): confirmado no teste 2 acima — depois do evento `DELIVERED`, `sent_at` voltou pra
  `null` (era o valor do evento anterior). Causa: `Processar Evento` recalcula
  `sent_at: status === 'SENT' ? eventAt : null` a cada execução, e o `UPDATE MSG` sobrescreve o
  campo com esse valor recalculado — perde o `sent_at` original a cada atualização de status
  seguinte. Não é meu escopo (a demanda 236 é só sobre `data_timestamp`) e não é o mesmo bug —
  mas é uma perda de dado real, do mesmo tipo (silenciosa). Registrando pro PM decidir se abre
  demanda separada.
- Confirmação adicional do achado da 235 (não recontestado, só reforçado com teste ao vivo): o
  workflow `03 - STATUS MSG` realmente não toca `data_timestamp` — o envio real via Inbox testado
  no item 1 acima teve seu `status` avançado pra `DELIVERED` sem nenhuma mudança em
  `data_timestamp` vinda desse workflow (o valor que apareceu ali veio do app, não do 03).

### Critérios de aceite
- [x] `data_timestamp` mapeado corretamente nos nós `CREATE MSG`/`UPDATE MSG` do workflow 02
- [x] Testado com evento real de criação e atualização (o teste "envio real pelo Inbox" pedido no
      escopo não isolava o workflow 02 de fato — documentado acima — por isso complementei com
      teste direto no webhook de produção, que prova o fix nos dois caminhos)
- [x] Sem regressão no restante do workflow (envio continua funcionando, outros campos intactos)
