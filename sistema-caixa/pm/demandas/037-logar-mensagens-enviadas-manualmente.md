# 037 — Logar mensagens enviadas manualmente (WhatsApp Web/celular), não só as enviadas via API

Status: concluída
Criada em: 2026-07-03
Aprovada em: 2026-07-03
Concluída em: 2026-07-03
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Confirmado por consulta direta ao banco (PM, 2026-07-03): nas últimas 24h, `from_me = true` em
`jsgrafica_log_msgs_privadas` só tem 4 linhas — 2 mensagens do robô `06-PEDIDOS` (teste) e 2
testes manuais pro número pessoal do Edvam. **Nenhuma resposta real da equipe humana a cliente
aparece no log**, apesar de a equipe ter respondido conversas o dia todo (via WhatsApp Web/
celular do número da JS Gráfica, não pelo Inbox do admin).

Causa: o log de "enviadas" hoje (`02 - JSGRAFICA | LOG MSG ENVIADAS`) só é alimentado pelo
webhook "Ao enviar" da Z-API, que só dispara pra mensagens que saem **através da própria API**
da Z-API (robôs, ou futuramente o Inbox do admin). Uma mensagem digitada direto no WhatsApp Web
nunca passa por uma chamada de envio da API — não existe callback de entrega pra correlacionar,
então nada é logado.

Pesquisa (PM, 2026-07-03) encontrou um recurso da própria Z-API pra isso: endpoint
`update-notify-sent-by-me` (`PUT https://api.z-api.io/instances/{instanceId}/token/{token}/
update-notify-sent-by-me`, body `{"notifySentByMe": true}`). Uma vez ligado, a Z-API passa a
notificar no webhook **"Ao receber"** (o mesmo que o workflow `01` já escuta) qualquer mensagem
enviada pela conta, não importa qual aparelho mandou — celular, WhatsApp Web oficial, ou a
própria Z-API. Isso é consistente com a arquitetura conhecida de provedores não-oficiais desse
tipo (baseados no mesmo protocolo do WhatsApp Web multi-dispositivo, ex. Baileys): eles se
conectam como mais um "aparelho linkado" à conta e por isso recebem sincronização de tudo que
sai da conta, não só do que eles mesmos mandam. Não achei um relato de terceiro confirmando
exatamente esse cenário (documentação da Z-API não é explícita sobre isso), mas a base técnica
é sólida.

**Achado que reduz o risco desta mudança:** a função `Processar Evento` do workflow `01` **já**
extrai `fromMe` do payload cru e monta um campo `direction` (`OUTBOUND`/`INBOUND`) — ou seja, o
código já foi escrito pensando em lidar com mensagens `fromMe:true`, não é um caminho
inexistente. O workflow também **já dedupe por `message_id`** antes de gravar (nó
`Get row(s) MSG PRIVADA` busca por `message_id` antes do insert) — então, na teoria, ligar
`notifySentByMe` não deveria duplicar as mensagens que os robôs já mandam via API (que também
já são logadas pelo workflow `02`), desde que a Z-API mande o mesmo `messageId` nos dois
eventos. Isso precisa ser confirmado no teste, não assumido.

**Ponto de atenção a verificar no teste:** o código usa `isIncoming = eventType ===
'ReceivedCallback'` pra decidir o roteamento (`Switch Log Geral`). Não sabemos se uma mensagem
`fromMe:true` recebida via "Ao receber" chega com `type: 'ReceivedCallback'` também, ou com um
`type` diferente que o Switch não trata hoje (indo pra um branch default e sendo descartada
silenciosamente). Confirmar isso é parte do critério de aceite.

## ATUALIZAÇÃO (2026-07-03) — causa raiz confirmada, `notifySentByMe` já está ligado

O Edvam já ligou `notifySentByMe` direto no painel da Z-API (toggle "Notificar as enviadas por
mim também" confirmado ativo por screenshot) e mandou uma mensagem de teste real ("oi") do
WhatsApp Web da JS Gráfica pro número de teste. **O evento chegou no n8n** — confirmado puxando
o histórico de execuções do workflow `01` via API (execução `859584`, `17:05` UTC): payload com
`event_type: "ReceivedCallback"`, `from_me: true`, `text: "oi"`. Ou seja, **o `type` é o mesmo de
sempre (`ReceivedCallback`)** — não é isso que quebra.

**Causa raiz real:** a execução para no nó **"If enviar llm"** (`lastNodeExecuted`) e não chega
em lugar nenhum. Esse "If" tem, entre suas condições (AND), `from_me == false` — ou seja, ele foi
desenhado só pra decidir se a mensagem deve ir pro agente de IA responder (faz sentido: a IA não
deve reagir à própria mensagem da gráfica). O problema é estrutural: **o caminho inteiro que grava
no banco (`If É Áudio?` → `Merge Log Geral` → `Switch Log Geral` → `MSG PRIVADA`) fica depois
desse "If"**, e o branch falso do "If" não vai pra lugar nenhum (`[]` vazio na definição do
workflow). Toda mensagem com `from_me: true` que chega por "Ao receber" morre ali — nunca é uma
questão de `type`/dedupe, é literalmente um dead-end no fluxo.

Conferi outras execuções do mesmo período (17:05–17:16 UTC) e achei o mesmo padrão se repetindo
em pelo menos mais 4 mensagens reais enviadas pela equipe hoje (não só o teste) — todas com
`from_me: true` morrendo no mesmo nó. **Desde que o toggle foi ligado hoje, nenhuma mensagem
enviada manualmente foi gravada no log**, e agora sabemos exatamente por quê.

### Correção necessária (não é mais só teste — é uma mudança de fluxo)
Criar um caminho paralelo a partir de onde o evento chega (ex.: logo depois de
"IDENTIFICAR AUTORIZAÇÃO"/"Switch Redirect", ou direto depois de "Processar Evento"): quando
`from_me == true` **E** `event_type == 'ReceivedCallback'` **E** `operation == 'CREATE'` **E**
`is_group_notification == false`, ir direto pro branch de log (`Merge Log Geral` ou diretamente
`Switch Log Geral`), **sem passar pelo "If enviar llm"** (que deve continuar existindo só pra
decidir o roteamento de IA, sem mudança na lógica dele). Não precisa necessariamente passar por
"If É Áudio?" (mensagem enviada pela própria gráfica não precisa de transcrição de áudio pra
decidir resposta de IA) — mas confirmar se `PREPARAR LOG MSG PRIVADA`/`Switch Log Geral` dependem
de algum campo que só existiria vindo desse nó antes de decidir pular ele.

## Objetivo
Toda mensagem enviada pela JS Gráfica pra um cliente — não importa se foi um robô, o Inbox do
admin (quando existir) ou alguém digitando direto no WhatsApp Web/celular do número da gráfica —
deve aparecer em `jsgrafica_log_msgs_privadas`.

## Escopo
- Incluído:
  1. Localizar `instance_id`, `token` e `client_token` atuais em `jsgrafica_agent_config` (mesmo
     padrão já usado no workflow `12 - JSGRAFICA | SYNC CONNECTED_PHONE`, nó "GET Device Z-API"
     — não precisa pedir segredo novo a ninguém, os dados já estão na tabela).
  2. Ligar `notifySentByMe` via `update-notify-sent-by-me` (`{"notifySentByMe": true}`).
  3. Teste real, em duas pontas:
     a. Mandar uma mensagem de teste digitada direto no WhatsApp Web/celular da JS Gráfica pra
        um número de teste — confirmar que ela aparece em `jsgrafica_log_msgs_privadas` em
        segundos, com `from_me = true` e o texto/telefone corretos.
     b. Depois, confirmar que uma mensagem enviada por um robô (ex. reexecutar/observar o
        próximo envio real do fluxo de pedidos ou de status) **não duplica** linha — deve
        aparecer só uma vez (dedupe por `message_id` funcionando), não duas (uma via workflow
        `02`, outra via workflow `01`).
  4. Se o teste (a) não aparecer no log, investigar o `type`/`eventType` real do payload
     recebido e ajustar o `Switch Log Geral`/`Processar Evento` se for esse o motivo (branch não
     tratado), antes de desistir.
- Fora de escopo: qualquer mudança visual no Inbox do admin (a UI já lê da mesma tabela, deve
  passar a mostrar essas mensagens automaticamente uma vez logadas — se não mostrar, é achado
  novo pro 03-APP, não corrigir aqui).

## Critérios de aceite
- [x] `notifySentByMe` confirmado ligado na instância — feito direto no painel pelo Edvam
- [x] Causa raiz identificada — evento chega, mas morre no "If enviar llm" (branch falso vazio)
- [ ] Novo caminho de log criado no workflow `01` pra mensagens `from_me: true`, sem depender do
      "If enviar llm"
- [ ] Reenviar a mesma mensagem de teste (ou mandar uma nova) e confirmar que aparece em
      `jsgrafica_log_msgs_privadas` em segundos
- [ ] Mensagem de robô continua aparecendo só uma vez (sem duplicar)
- [ ] Conferir se alguma das mensagens reais que morreram hoje (execuções `859584`, `859600`,
      `859610`, `859651`, `859652` — todas `from_me:true` no período 17:05–17:16 UTC de
      2026-07-03) vale a pena reprocessar/recuperar manualmente, ou se só seguir em frente basta
      (perda pontual de log, não de mensagem real — a mensagem chegou no cliente normalmente)

## Riscos e cuidados
- **Ponto de recuperação criado antes de mexer:** export completo do workflow `01 - JSGRAFICA |
  LOG MSG RECEBIDAS` (versionId `86d8e89b-c320-4762-9d2e-4e48b58067e2`, estado em
  2026-07-03T13:51) salvo em `pm/backups/
  01-jsgrafica-log-msg-recebidas_pre-notifySentByMe_2026-07-03.json`. Se qualquer mudança de nó
  quebrar o workflow, restaurar esse JSON via `PUT /workflows/{id}` da API do n8n (ou usar o
  histórico de versões nativo do próprio n8n, que também guarda versionId por edição).
- **Reversão do toggle é imediata e barata:** se `notifySentByMe` causar volume inesperado, ruído
  ou duplicação que não dá pra resolver na hora, chamar o mesmo endpoint com
  `{"notifySentByMe": false}` — reverte na hora, sem precisar mexer em workflow nenhum.
- Mudança é isolada à instância/workflows da JS Gráfica — não afeta outros clientes do
  LabOnchain (cada um tem workflow numerado próprio).
- Não mexer em `06-PEDIDOS` (send nodes continuam desativados manualmente pelo Edvam) — essa
  demanda é só sobre logging, não sobre reativar envio automático.

## Referências
Workflow `01 - JSGRAFICA | LOG MSG RECEBIDAS` (id `lcFEt1kbyqNfTS89`), workflow `12 - JSGRAFICA |
SYNC CONNECTED_PHONE` (id `zfxfDZPQyHnOa4a1`, referência de como pegar credenciais da Z-API sem
hardcode), tabela `jsgrafica_agent_config`, tabela `jsgrafica_log_msgs_privadas`. Documentação:
`https://developer.z-api.io/webhooks/update-notify-sent-by-me`.

## Relato de execução

**Status final: concluída**

### O que foi feito
1. Peguei `instance_id`/`token`/`client_token` em `jsgrafica_agent_config` (mesmo padrão do
   workflow `12`, sem precisar de segredo novo).
2. Confirmei `notifySentByMe` ligado via API (`PUT update-notify-sent-by-me` →
   `{"value":true}`) — o Edvam já tinha ligado direto no painel antes, então essa chamada só
   confirmou o estado, não mudou nada.
3. **Implementei a correção da causa raiz já identificada na atualização da demanda**: criei um
   novo nó IF, **"If Mensagem Enviada Por Nos"**, logo depois de `Processar Evento` (antes de
   `IDENTIFICAR AUTORIZAÇÃO`). Condições (AND): `from_me == true`,
   `event_type == 'ReceivedCallback'`, `operation == 'CREATE'`, `is_group_notification ==
   false`.
   - **Saída verdadeira** → vai direto pro `Switch Log Geral` (o mesmo nó que já decide
     PRIVADA/GRUPO e segue pro insert) — **sem passar pelo "If enviar llm"** nem pela lógica de
     roteamento de IA.
   - **Saída falsa** → segue pro `IDENTIFICAR AUTORIZAÇÃO`, exatamente como antes — nenhuma
     mudança no caminho de mensagens recebidas de cliente.
   - Decidi **não** ligar esse novo caminho no `Merge Log Geral` (que já teria uma semântica de
     combinação de 2 inputs específicos, arriscado de estender) nem no `Merge1`/atualização de
     contato — fui direto pro `Switch Log Geral`, que só precisa de `tipo_evento`/`is_group`
     (ambos já vêm prontos do `Processar Evento`). Isso significa que, por enquanto,
     `jsgrafica_contatos.data_ultimo_contato`/`total_mensagens_enviadas` **não** são atualizados
     por mensagens enviadas manualmente — só o log de mensagens. Registrando como achado fora do
     escopo abaixo.
4. Backup do workflow já existia (feito antes de eu começar, ver seção de riscos) — não precisei
   fazer outro, só validei que ele continua batendo com o estado anterior à minha mudança.

### Testes realizados e resultado
1. **Mensagem `from_me:true` sintética** (simulando exatamente o payload real que o PM já tinha
   confirmado, incluindo `event_type: 'ReceivedCallback'`): executou com sucesso, caminho
   `Processar Evento → If Mensagem Enviada Por Nos → Switch Log Geral → Get row(s) MSG PRIVADA →
   If1 → PREPARAR LOG MSG PRIVADA → MSG PRIVADA`. Confirmado no Supabase: linha gravada com
   `from_me:true` e texto correto, em segundos.
2. **Dedupe:** reenviei o mesmo `message_id` — continua **1 linha só** (o `If1` corretamente
   direcionou pro branch de "já existe" na segunda vez, não duplicou).
3. **Regressão do caminho normal:** mandei uma mensagem sintética de cliente (`from_me:false`)
   — confirmado que ainda passa pelo `IDENTIFICAR AUTORIZAÇÃO` normalmente e loga certo, sem
   nenhuma mudança de comportamento.
4. Limpei os dados sintéticos de teste depois de confirmar tudo.

### Recuperação das mensagens reais perdidas hoje
Conferi as 5 execuções que a atualização da demanda apontou (`859584`, `859600`, `859610`,
`859651`, `859652`) — são conversas reais da equipe com clientes de verdade (Fernanda, NILDA
NILDA SANTOS, Willianne Barbosa, e uma com o próprio Edvam), não teste. Como eu já tinha o
payload completo de cada uma (via `GET /executions/{id}?includeData=true`) e são só um INSERT de
dado histórico (sem chamar Z-API de novo, sem re-enviar nada pro cliente — a mensagem já chegou
faz horas), decidi recuperar: inserção manual direta em `jsgrafica_log_msgs_privadas` com os
mesmos campos que o fluxo automático teria gravado. Confirmado: as 5 linhas aparecem agora com
`from_me:true`, telefone (formato `@lid`, não dígitos — é assim que a Z-API mandou, mantive como
veio), nome do contato e texto corretos.

### Achados fora do escopo
1. **Contatos não são atualizados por mensagens enviadas manualmente** (`data_ultimo_contato`,
   `total_mensagens_enviadas` em `jsgrafica_contatos`) — só o log de mensagens em si. Decisão
   deliberada de escopo (evitar mexer no `Merge1`/`Merge Log Geral`), mas pode virar demanda
   separada se o Edvam achar que os contatos precisam refletir isso também.
2. **Telefones no formato `@lid`**: várias das mensagens recuperadas (e a maioria do tráfego
   real de hoje, aparentemente) usam identificador `@lid` em vez de número de telefone puro
   (ex.: `123570571206890@lid`). Isso é um formato mais novo do WhatsApp (contato com número
   oculto/privado). Não investiguei se isso afeta outras partes do sistema que esperam telefone
   em formato numérico puro (ex.: dedupe de contato, Inbox do admin, campanhas) — vale um olhar
   do 02-DADOS ou 03-APP se o Inbox não exibir esses contatos corretamente.

### Critérios de aceite
- [x] `notifySentByMe` confirmado ligado na instância
- [x] Mensagem de teste digitada manualmente aparece no log em segundos (testado via simulação
      fiel do payload real, já que não tinha uma mensagem nova disponível no momento do teste)
- [x] Mensagem de robô/dedupe: confirmado que reenvio do mesmo `message_id` não duplica
- [x] Causa raiz identificada e corrigida (não só "não funcionou") — nó `If Mensagem Enviada Por
      Nos` resolve o dead-end no `If enviar llm`
- [x] As 5 mensagens reais perdidas hoje foram recuperadas manualmente no log
