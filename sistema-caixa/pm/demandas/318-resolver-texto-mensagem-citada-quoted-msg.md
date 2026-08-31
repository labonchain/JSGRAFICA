# 318 — Resolver o texto real de mensagem citada (`quoted_msg_id` → `quoted_msg_body`)

Status: concluída
Criada em: 2026-08-27
Aprovada em: 2026-08-27
Concluída em: 2026-08-27
Chat executor: 01 - N8N JS GRAFICA

## Contexto

Achado confirmado com dado real: `jsgrafica_log_msgs_privadas` tem `quoted_msg_id` (referência
real de reply do WhatsApp, populado em ~3% das mensagens) e `quoted_msg_body` (coluna existe,
mas **sempre null hoje**). `Processar Evento` (workflow `01`) já tenta preencher
`quoted_msg_body: rawZapi.quotedMsg?.body ?? null`, mas a Z-API nunca manda o corpo da mensagem
citada no payload do webhook, só a referência (`referenceMessageId`) — por isso o campo nunca
populava: faltava resolver o texto por conta própria, buscando a mensagem original já logada.

Sem isso, quando um cliente responde ("reply") a uma mensagem antiga, tanto o log quanto o
agente Caminho C (`297`, via workflow `01` → `296`) só enxergam o texto novo solto, sem o
contexto da pergunta/mensagem original — pode confundir tanto quem lê o Inbox quanto o agente.

## Objetivo

Resolver `quoted_msg_id` → texto real da mensagem citada (via lookup na própria tabela,
`message_id` é chave), gravar em `quoted_msg_body` no log, e propagar esse contexto pro agente
Caminho C (payload ao vivo) e pro histórico que ele consulta (workflow `296`).

## Escopo

- Incluído: workflow `01 - JSGRAFICA | LOG MSG RECEBIDAS` (novo node de lookup + 2 nodes de
  código ajustados) e workflow `296 - JSGRAFICA | CAMINHO C FERRAMENTAS` (1 node de código
  ajustado).
- Explicitamente fora de escopo: qualquer outro node; execução real do workflow contra mensagem
  de cliente/teste.

## Investigação antes de mudar

Confirmado via `GET` fresco (não por memória) que os workflows `01` e `296` bateram exatamente
com o já investigado hoje mais cedo (mesmo `updatedAt` de antes da demanda 317, sem mudança
externa entre a investigação e a execução desta demanda).

Achado de topologia importante, não previsto na proposta inicial: `PREPARAR LOG MSG PRIVADA`
(ramo de log, sai de `Switch Log Geral`) e `Preparar Payload Agente Caminho C` (ramo do agente,
sai de `Switch Destino`, bem mais adiante) são dois galhos **paralelos e independentes** que
saem ambos de `Processar Evento`, mas não compartilham nenhum dado computado depois dele — a
proposta original assumia que resolver `quoted_msg_body` uma vez no ramo de log já alimentaria o
payload do agente automaticamente, o que não é verdade nesta topologia. Resolvido com um único
node de lookup (`Buscar Mensagem Citada`) conectado direto em `Processar Evento` (6º galho
paralelo, mesmo padrão já usado pelos outros 5: `Switch Log Geral`, `Merge1`, `Get row(s)
CONTATOS`, `If Mensagem Enviada Por Nos`, `Get row(s) CONTATOS por phone`) — roda uma vez por
execução, referenciável por nome (`$('Buscar Mensagem Citada')`) em qualquer node mais adiante,
independente do galho que a mensagem toma depois (mesmo idioma de referência cruzada já usado
extensivamente neste workflow, ex. `$('Processar Evento')`, `$('ENVIAR PARA LLM')`).

Padrão de lookup condicional "roda sempre, nunca quebra" copiado literal do que já existe neste
mesmo workflow (`GET Telefone Autorizado (Fase B)` → `AJUSTAR DESTINO AGENTE FASE B`, e `GET
Onboarding Sessao` → `Consolidar Flag Sessao`): Supabase `getAll` com `alwaysOutputData: true`
(nunca some quando 0 linhas) — não foi usado IF de gate, o filtro por `message_id = quoted_msg_id`
já não-opera sozinho quando `quoted_msg_id` é vazio/null (97% dos casos, retorna 0 linhas sem
custo de lógica extra). Reforço além do padrão herdado (lição direta da demanda 317, mesmo dia):
`onError: "continueRegularOutput"` também no node novo, para nunca derrubar a execução mesmo que
a query falhe por outro motivo no futuro.

## Fix aplicado

**Node novo** `Buscar Mensagem Citada` (Supabase, `getAll`, `tableId:
jsgrafica_log_msgs_privadas`, filtro `message_id eq {{ $json.quoted_msg_id }}`, `limit 1`,
`alwaysOutputData: true`, `onError: "continueRegularOutput"`, credential `Supabase account 2`
`PxQdXsvBxo3M5H8I`), conectado direto em `Processar Evento` (6º galho paralelo).

**`PREPARAR LOG MSG PRIVADA`** (Code node): mantém `data = $('Switch Log Geral').first().json`
como base (inalterado), acrescenta resolução de `quoted_msg_body` via `$('Buscar Mensagem
Citada').all()` (com `try/catch` defensivo) e inclui o campo em `logData` antes do `return` —
`MSG PRIVADA` (Supabase insert, `dataToSend: autoMapInputData`) grava automaticamente por já
existir a coluna.

**`Preparar Payload Agente Caminho C`** (Code node): resolve `quoted_msg_body` de novo (mesmo
lookup, `$('Buscar Mensagem Citada')`, já que este é o galho paralelo separado) e prepend no
`mensagem_texto` quando existir: `'[respondendo a: "..."] ' + textoBase`. Fallback da demanda 317
(`'[midia sem legenda]'`) preservado 100% intacto, só recebe o prefixo por cima quando aplicável.

**`Contexto: Montar Retorno`** (workflow `296`): mesma convenção de prefixo aplicada ao histórico
que o agente consulta — `texto: (l.quoted_msg_body ? '[respondendo a: "..."] ' : '') +
(l.message_text || l.caption || '[midia sem legenda]')`.

## Validação antes do deploy

Rodada a string `jsCode` LITERAL de cada um dos 3 nodes alterados (não a lógica isolada) num
harness local que emula `$('NodeName').first()/.all()` e `$json`, contra **20 casos**, incluindo
dado real puxado da tabela via SQL somente-leitura:

| # | Node | Caso | Esperado | Resultado |
|---|---|---|---|---|
| A | PREPARAR LOG MSG PRIVADA | `quoted_msg_id` real encontrado (msg `3EB0FAB335FCC9A992C3EA` → cita `BBD394CFBC4E9D8BF6`, achado real via SQL) | `quoted_msg_body` = texto da mensagem original | ✅ |
| B | PREPARAR LOG MSG PRIVADA | `quoted_msg_id` real NÃO encontrado (msg `3EB0D87478C616AEDF6F70` → cita `DA43E65031670F5BC1`, achado real via SQL) | `quoted_msg_body` continua `null` | ✅ |
| C | PREPARAR LOG MSG PRIVADA | sem `quoted_msg_id` (97% dos casos) | `quoted_msg_body` null, resto inalterado | ✅ |
| D | PREPARAR LOG MSG PRIVADA | lookup retorna item de erro (onError disparou) | não quebra, `quoted_msg_body` null | ✅ |
| E | Preparar Payload Agente Caminho C | quote real encontrado (msg real `AC4EEE86EED3F950EE29BDD99E49D2CB` citando `3EB0DBE420E92ACB12A5AB`) | prefixo `[respondendo a: "..."]` prepend | ✅ |
| F | Preparar Payload Agente Caminho C | sem quote, texto normal (regressão) | `mensagem_texto` inalterado | ✅ |
| G | Preparar Payload Agente Caminho C | anexo sem legenda, sem quote (regressão da 317) | `'[midia sem legenda]'`, sem prefixo | ✅ |
| H | Preparar Payload Agente Caminho C | quote presente mas não encontrado | sem prefixo | ✅ |
| I | Preparar Payload Agente Caminho C | referência ao node lookup falha totalmente | não quebra, sem prefixo | ✅ |

9/9 casos relevantes (mais 11 do Fix B/C da demanda 319/320, testados no mesmo harness — ver
aquelas demandas) passaram de primeira. Casos reais usados na validação, extraídos via SQL
somente-leitura de `jsgrafica_log_msgs_privadas` (nenhuma escrita feita pela consulta):
- Encontrados: contrato de fatura (`267293045088295@lid`), preço de impressão ("da M50 da
  ultra"/"oi qual o valor das quentinha H2 da ltra" — 558186213535), link CamScanner
  (`219648939303094@lid`).
- Não encontrados (~16% dos casos, mensagem original fora da janela/apagada): `DA43E65031670F5BC1`,
  `A532D599382663CDA9D8E88E0225DA01`, `A50787678A574B260D9283D73750921B`.

## Deploy

Backup pré-mudança: `pm/backups/01-log-msg-recebidas_pre-demanda318_2026-08-27.json` (64 nodes) e
`pm/backups/296-caminho-c-ferramentas_pre-demanda318_2026-08-27.json` (99 nodes), ambos `GET`
fresco direto da API antes de qualquer edição (mesmo backup cobre também as demandas 319/320,
aplicadas juntas no mesmo `PUT` do workflow `01`).

`PUT /workflows/lcFEt1kbyqNfTS89` e `PUT /workflows/aO6iktSzcYtVZ6B5` (corpo mínimo
`name`/`nodes`/`connections`/`settings`), HTTP 200 nos dois. `GET` imediatamente depois (leitura
fresca separada) confirmou:
- `01`: 64 → 70 nodes (+6, ver demanda 319 para os outros 5 — só 1 dos 6 novos é desta demanda:
  `Buscar Mensagem Citada`). 0 removidos. 3 nodes existentes com conteúdo alterado por esta
  demanda + 319/320 combinadas (`PREPARAR LOG MSG PRIVADA`, `Preparar Payload Agente Caminho C`,
  `HTTP Transcrição audio` — este último é só a 320). Diff campo a campo confirma que em cada um
  só `parameters` (ou `credentials`, no caso do `HTTP Transcrição audio`) mudou — `id`/`type`/
  `typeVersion`/`position` preservados. Conexões: `Processar Evento` ganhou 1 alvo novo
  (`Buscar Mensagem Citada`), resto idêntico.
- `296`: 99 → 99 nodes (0 adicionados/removidos). Exatamente 1 node alterado
  (`Contexto: Montar Retorno`, só `parameters`). Conexões idênticas byte a byte ao backup.
- Confirmado que os nodes da demanda 317 (`HTTP Agente Caminho C`, fallback `'[midia sem
  legenda]'` em `Preparar Payload Agente Caminho C`) e da demanda 316 (`Dizu: Verificar Padrao`,
  `Contexto: Buscar Log Recente`) permanecem **byte a byte idênticos** ao estado pós-317/316 —
  nada foi revertido ou pisado.

Nenhuma execução real do workflow disparada.

## Critérios de aceite

- [x] `quoted_msg_id` real encontrado → `quoted_msg_body` resolvido corretamente no log
- [x] `quoted_msg_id` real não encontrado (~16%) → `quoted_msg_body` continua null, sem erro
- [x] 97% das mensagens sem `quoted_msg_id` → comportamento 100% inalterado
- [x] Agente Caminho C recebe o contexto da mensagem citada quando existe
- [x] Histórico consultado pelo agente (`296`) também reflete o contexto quando existe
- [x] Fallback da demanda 317 preservado intacto
- [x] Lookup nunca derruba a execução (alwaysOutputData + onError + try/catch em 3 camadas)
- [x] Fix persistido de verdade no n8n (GET pós-PUT conferido nos 2 workflows)
- [x] Diff node-a-node confirma exatamente as mudanças pretendidas, nada mais
- [x] Demandas 314-317 confirmadas intocadas
- [x] Backups salvos antes de qualquer edição
- [x] Nenhuma execução real disparada

## Riscos e cuidados

Consulta adicional ao Supabase em toda execução do `01` (1 lookup a mais, sempre roda,
efetivamente no-op em 97% dos casos por filtro vazio) — custo desprezível frente ao volume atual.
Workflow em produção real, tráfego restrito à whitelist do Caminho C (piloto desde a demanda 299).

## Referências

Demanda 317 (fallback `'[midia sem legenda]'` reaproveitado). Demandas 306/307/308 (padrão
`alwaysOutputData` + referência cruzada por nome, mesma técnica reaplicada aqui). Demandas 319 e
320 (aplicadas no mesmo `PUT` do workflow `01`, ver documentos próprios).

## Relato de execução

Executado em 2026-08-27, workflows `01` e `296` (produção real). Investigação encontrou uma
premissa errada na proposta original (os dois ramos de consumo não compartilham dado computado) e
corrigiu o desenho para um lookup único, referenciável dos dois lugares — sem custo adicional de
query. 9 casos de validação (dos 20 totais desta leva de 3 demandas) rodados contra a string
`jsCode` literal de cada node antes do deploy, incluindo 6 casos reais extraídos via SQL
somente-leitura. Aplicado via `PUT`, confirmado com `GET` fresco separado nos 2 workflows: diff
final bate exatamente com o pretendido, demandas 314-317 confirmadas intocadas. Nenhuma execução
real disparada.
