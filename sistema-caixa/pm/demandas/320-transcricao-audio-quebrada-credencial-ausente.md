# 320 — Transcrição de áudio 100% quebrada desde 01/08 (credencial ausente no node)

Status: concluída
Criada em: 2026-08-27
Aprovada em: 2026-08-27
Concluída em: 2026-08-27
Chat executor: 01 - N8N JS GRAFICA

## Contexto

Achado confirmado com dado real: `HTTP Transcrição audio` (workflow `01`) tem
`nodeCredentialType: googlePalmApi` configurado, mas **sem nenhum objeto `credentials`
anexado** — confirmado por `GET` direto da API, não por suposição. Confirmado também com dado
real que a falha é 100% efetiva: 516 de 520 mensagens de áudio desde 2026-08-01 têm
`transcription_text` vazio (os 4 restantes são de antes da quebra ou outro motivo isolado, não
investigado aqui — fora de escopo).

## Objetivo

Anexar uma credencial `googlePalmApi` real e válida ao node, sem alterar mais nada nele.

## Investigação antes de mudar

Mesma decisão de credencial da demanda 319 (mesmo levantamento, feito uma vez só pra cobrir as
duas): `HuMb1WcX1o0FTeLu` ("Google Gemini(PaLM) Api account") escolhida em vez da credencial
isolada `mZQEmMg1wJGA5bkH`, por ser a que está em uso real e validada ao vivo (execução real
recente e bem-sucedida do `297 - JSGRAFICA | CAMINHO C AGENTE`, o próprio agente ativo da JS
Gráfica hoje) — ver detalhe completo da investigação de credencial na demanda 319.

Reuso da MESMA credencial pra transcrição de áudio E análise de mídia visual (319), em vez de
credenciais separadas: decisão deliberada de simplicidade — a própria conta n8n já reusa essa
credencial pra esse exato caso de uso (transcrição de áudio) em workflows `HTTP Transcrição
audio` de outros clientes LabOnchain (confirmado na varredura da 319), então não há motivo de
isolamento de rate-limit que justifique uma credencial dedicada só pra JS Gráfica aqui.

Confirmado que o resto do node (`url`, `jsonBody`, `alwaysOutputData: true`, `onError:
"continueErrorOutput"`) já estava correto e não precisa de nenhuma outra mudança — a falha era
exclusivamente a ausência da credencial.

## Fix aplicado

Único campo alterado no node `HTTP Transcrição audio`: adicionado
`credentials: { googlePalmApi: { id: "HuMb1WcX1o0FTeLu", name: "Google Gemini(PaLM) Api
account" } }`. Nenhum outro campo do node tocado.

## Validação antes do deploy

Credencial confirmada existente e válida por prova ao vivo (não por suposição): consultado o
histórico de execuções do workflow `297 - JSGRAFICA | CAMINHO C AGENTE` via API — 5 execuções
`success` nos ~15 minutos anteriores a esta demanda, a mais recente (`1567992`) com detalhe aberto
confirmando que o node `Google Gemini Chat Model`, que usa a MESMA credencial `HuMb1WcX1o0FTeLu`,
rodou sem erro (chamada Gemini real, usada numa resposta que chegou a ser enviada por WhatsApp de
verdade e logada). Prova mais forte que qualquer checagem estática de "a credencial existe" — é
uma chamada Gemini real acontecendo com essa credencial minutos antes desta mudança.

Não foi possível fazer um "test step" isolado deste node específico (`HTTP Transcrição audio`) via
API pública do n8n (recurso não exposto pela API REST, só pela UI) — nem foi necessário, dado que
o formato da chamada (mesmo `jsonBody`, mesmo modelo Gemini, mesmo tipo de credencial) é idêntico
ao que já roda com sucesso agora mesmo no `297` e ao que já rodava com sucesso nesta mesma conta
n8n para outros clientes (workflows `HTTP Transcrição audio` de Kuidu, Dizu, GrupoPrima, Labon,
Conecta — todos usando a mesma credencial, confirmado na varredura da demanda 319).

## Deploy

Mesmo backup/`PUT`/`GET` das demandas 318/319 (mesmo workflow `01`, mesmo `PUT`). Diff pós-deploy
confirma que `HTTP Transcrição audio` teve **exclusivamente** o campo `credentials` alterado —
`parameters`, `onError`, `alwaysOutputData`, `id`, `type`, `typeVersion`, `position` idênticos ao
backup. Ver detalhe completo do `PUT`/`GET`/diff na demanda 318.

Nenhuma execução real do workflow disparada — a transcrição só vai processar a próxima mensagem
de áudio real que chegar organicamente pela whitelist; efeito será visível olhando
`transcription_text` das próximas mensagens de áudio reais (fora do escopo desta demanda
confirmar isso, é validação orgânica pós-deploy, não um teste forçado).

## Critérios de aceite

- [x] Credencial `googlePalmApi` anexada ao node
- [x] Credencial confirmada válida/em uso real ao vivo (execução recente do `297`)
- [x] Nenhum outro campo do node alterado
- [x] Fix persistido de verdade no n8n (GET pós-PUT conferido)
- [x] Diff confirma que só `credentials` mudou neste node
- [x] Backup salvo antes de qualquer edição
- [x] Nenhuma execução real forçada disparada

## Riscos e cuidados

Efeito só será visível organicamente na próxima mensagem de áudio real recebida (mensagem de
áudio é rara na whitelist de teste atual) — se quiser confirmação mais rápida, verificar
`transcription_text` de mensagens de áudio novas em `jsgrafica_log_msgs_privadas` nos próximos
dias. Não foi feita nenhuma tentativa de forçar uma mensagem de áudio de teste (fora do escopo e
das instruções desta demanda).

## Referências

Demanda 319 (mesma investigação de credencial, mesmo backup/deploy). Demanda 297/299 (origem da
credencial `HuMb1WcX1o0FTeLu` como a de uso real da JS Gráfica hoje).

## Relato de execução

Executado em 2026-08-27, workflow `01` (produção real). Único campo alterado: `credentials` do
node `HTTP Transcrição audio`. Credencial validada por prova ao vivo (execução real recente e
bem-sucedida usando a mesma credencial em outro node/workflow), não apenas por existir
referenciada em código. Aplicado via `PUT` (mesmo das demandas 318/319), confirmado com `GET`
fresco separado: diff confirma exatamente o campo pretendido alterado, nada mais. Nenhuma
execução real forçada.
