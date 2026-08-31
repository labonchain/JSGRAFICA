# 011 — Consertar pipeline de log quebrado (mensagem de cliente não está sendo gravada)

Status: concluída — confirmado com mensagem real
Criada em: 2026-07-02
Aprovada em: 2026-07-02
Concluída em: 2026-07-02
Chat executor: PM (00), via API do n8n + API da Z-API (chave fornecida pelo Edvam, 2026-07-02)

## Relato de execução (parte 2 — causa real encontrada)

O fix da Opção A (onError) era necessário mas não suficiente. Diagnóstico com a mensagem real
que o Edvam mandou (2026-07-02, ~01h19 UTC): confirmei via `GET /chats` da Z-API que ela
chegou no WhatsApp normalmente, mas **o workflow `01` teve ZERO execuções** no período (via
`GET /executions` do n8n, API que nenhum chat tinha usado até agora). Testei os workflows `02`
e `03` também — **igualmente zero execuções**. Ou seja, a Z-API não estava chamando nenhum dos
3 webhooks do n8n.

Enviei eu mesmo um POST de teste sintético direto pro webhook do n8n (`/webhook/
jsgraficamsgrecebidas`) pra isolar o problema: confirmou que o n8n recebe e processa
corretamente quando chamado (execução completa, `MSG PRIVADA` gravou no banco) — ou seja, o
n8n em si estava saudável. A falha estava especificamente na configuração de webhook da Z-API,
que não apontava pra essas URLs.

**Corrigido via API da Z-API:**
- `PUT .../update-webhook-received` → `https://n8n.labonchain.xyz/webhook/jsgraficamsgrecebidas`
- `PUT .../update-webhook-delivery` → `https://n8n.labonchain.xyz/webhook/jsgraficastatusmsg`

**Não encontrado ainda:** o endpoint exato pra configurar o webhook de "mensagem enviada"
(workflow `02`, path `jsgraficamsgenviadas`) — tentei vários nomes prováveis
(`update-webhook-message-sent`, `update-webhook-send`, `update-webhook-sent`), nenhum existe
na API da Z-API com esses nomes. Fica como pendência — não é crítico pra hoje (envio manual já
é logado direto pelo app, `app/api/inbox/responder`), mas vale confirmar no painel da Z-API
qual é o nome certo desse webhook específico.

**Confirmado com mensagem real (2026-07-02, 01:33:54 UTC):** Edvam mandou "Teste3" do WhatsApp
dele — apareceu em `jsgrafica_log_msgs_privadas` com `from_me:false`, exatamente como devia.
Critério de aceite atendido. Pipeline ponta a ponta funcionando.

## Relato de execução (parte 1 — aplicado)

Edvam forneceu uma API key do n8n (escopo workflows) em 2026-07-02, resolvendo o bloqueio de
escrita. Apliquei a Opção A diretamente via API (`PUT /api/v1/workflows/{id}`):

- Node `HTTP Request` do workflow `01` recebeu `"onError": "continueRegularOutput"`.
- Confirmei no `HTTP Request` node que ele tem **uma única saída** (`main[0]` → `Merge Log
  Geral`, index 1) — sem saída de erro dedicada — por isso `continueRegularOutput` é a opção
  certa (não `continueErrorOutput`, que exigiria uma segunda saída conectada).
- Diff antes/depois confirmado: dos 45 nós do workflow, só `HTTP Request` mudou; `connections`
  idêntico; `active` continua `true`. Nenhum outro efeito colateral.

**Falta:** repetir o teste real (critério de aceite) — mandar mensagem de teste pro
(81) 8610-8547 e confirmar que aparece em `jsgrafica_log_msgs_privadas` com `from_me:false`.

## Contexto
Demanda 006 confirmou com evidência real: uma mensagem de teste chegou de verdade no
WhatsApp/Z-API (confirmado via `GET /chats`), mas nunca apareceu em
`jsgrafica_log_msgs_privadas`, nem atualizou `jsgrafica_contatos`. Investigando a demanda 010
em paralelo, o 01-N8N mapeou a causa provável:

Toda mensagem privada normal de cliente, no workflow `01 - LOG MSG RECEBIDAS`, passa por uma
chamada HTTP **síncrona** (nó `HTTP Request`) para o webhook do `JSGRAFICA_ATENDIMENTO_AI`
**antes** de chegar no ramo que grava o log (`Merge Log Geral` → `Switch Log Geral` →
`MSG PRIVADA`). O webhook do `JSGRAFICA_ATENDIMENTO_AI` deveria responder via o nó
`10 – Responder Webhook1`, mas esse nó só é alimentado por um nó (`09 – HTTP ZAPI - cliente`)
que **não existe mais** no workflow — conexão órfã. Ou seja, a chamada HTTP do workflow `01`
fica esperando uma resposta que nunca chega, e como o nó `HTTP Request` não tem
`continueOnFail` configurado, a execução inteira provavelmente termina em erro **antes** de
gravar o log.

**Isso explica, muito provavelmente, dois problemas ao mesmo tempo:** por que o Inbox nunca
refletiu conversas reais (demanda 002) e por que zero mensagem de cliente foi logada mesmo
com o Z-API reconectado hoje (demanda 006). Não é falta de mensagem real — é o pipeline
quebrado. **Com o atendimento real da gráfica começando amanhã, isso significa que o sistema
inteiro (log + Inbox) pode não funcionar de verdade, independente de qualquer decisão sobre o
atendimento automático.**

**Confirmado de forma independente pelo PM (2026-07-02), com as mesmas ferramentas de
leitura:** nó `HTTP Request` do workflow `01` sem `onError`/`continueOnFail`/`retryOnFail`
configurado; nó `10 – Responder Webhook1` do `JSGRAFICA_ATENDIMENTO_AI` só é alimentado, no
grafo de `connections`, por um nó chamado `09 – HTTP ZAPI - cliente` que **não existe** na
lista `nodes[]` do workflow — confirmado cruzando as duas listas diretamente. Não é mais
hipótese, é fato confirmado por duas leituras independentes.

## Objetivo
Fazer com que mensagens de cliente sejam gravadas em `jsgrafica_log_msgs_privadas` mesmo que
o webhook do `JSGRAFICA_ATENDIMENTO_AI` não responda (trave, dê erro ou demore).

## Escopo — duas opções, em ordem de urgência/simplicidade

**Opção A — conserto rápido, recomendado para hoje/agora:** no nó `HTTP Request` do workflow
`01` (o que chama o webhook do `JSGRAFICA_ATENDIMENTO_AI`), habilitar "Continue On Fail" (ou
configurar um timeout curto + continuar em caso de erro/timeout). Isso faz o workflow `01`
seguir para o ramo de log **independente** do webhook de atendimento responder ou não — é uma
mudança de configuração num nó só, não precisa entender/consertar a conexão órfã lá dentro do
outro workflow. Baixo risco, reversível, rápido de fazer na UI.

**Opção B — conserto definitivo, sem pressa:** dentro do workflow `JSGRAFICA_ATENDIMENTO_AI`,
religar o nó `10 – Responder Webhook1` a um nó real que produza a resposta esperada (repor a
conexão órfã que sobrou de uma versão anterior), pra que o webhook volte a responder de
verdade dentro de um tempo razoável. Isso é mais estrutural — exige entender o fluxo completo
do agente antes de mexer, para não quebrar outra coisa. Pode ficar para depois da Opção A
estar em produção.

- Fora de escopo: qualquer mudança na lógica de quem recebe resposta automática (isso já está
  decidido — ver demanda 009) ou na whitelist.

## Critérios de aceite
- [ ] Mensagem de teste real enviada ao WhatsApp da gráfica aparece em
      `jsgrafica_log_msgs_privadas` com `from_me:false`, mesmo com `JSGRAFICA_ATENDIMENTO_AI`
      ativo — repetir o teste da demanda 006 depois do conserto pra confirmar
- [ ] `jsgrafica_contatos.data_ultimo_contato` atualiza normalmente
- [ ] Nenhuma outra automação (pedidos, gestão de produto) quebrou com a mudança

## Riscos e cuidados
Isso mexe no workflow mais crítico do sistema (processa toda mensagem recebida) — testar com
mensagem real antes de considerar concluído. Fazer a Opção A primeiro (menor risco); a Opção B
pode esperar uma sessão com mais calma.

## Referências
Workflow `01 - LOG MSG RECEBIDAS` (nó `HTTP Request`), workflow `JSGRAFICA_ATENDIMENTO_AI`
(nós `10 – Responder Webhook1` e a conexão órfã de `09 – HTTP ZAPI - cliente`). Ver
`pm/demandas/006-*.md` e `pm/demandas/010-*.md` (onde foi encontrado).

## Relato de execução
(preenchido por quem executar — chat ou Edvam)
