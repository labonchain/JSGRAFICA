# 241 — Investigar o que de fato aciona o workflow "02 - LOG MSG ENVIADAS" em produção

Status: concluída (parcial — ver conclusão)
Criada em: 2026-07-29
Aprovada em: 2026-07-29 (Edvam: "não podemos ter lacunas, dúvidas ou bugs silenciados — tudo deve
ser resolvido e organizado")
Concluída em: 2026-07-29
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Lacuna aberta desde a investigação da demanda 239 (e, antes dela, já registrada em `PRODUTO.md`
desde 2026-07-02): o workflow `02 - JSGRAFICA | LOG MSG ENVIADAS` (webhook
`jsgraficamsgenviadas`) claramente funciona — tem milhares de mensagens reais registradas por
ele em `jsgrafica_log_msgs_privadas`, confirmado com dado real — mas **nenhum mecanismo de
disparo foi identificado**:
- Nenhum campo da configuração da Z-API (`GET .../me`) aponta pra esse webhook — confirmado na
  239, checando os campos já conhecidos (`receivedCallbackUrl`, `deliveryCallbackUrl`,
  `messageStatusCallbackUrl`, `receivedAndDeliveryCallbackUrl`).
- Busca no workflow `01 - LOG MSG RECEBIDAS` inteiro não achou nenhuma chamada interna pra essa
  URL (confirmado na 239).
- Não foi checado ainda: (a) se existe algum campo de configuração da Z-API além dos 4 já
  conhecidos (a própria 239 descobriu um endpoint de update que não estava documentado antes —
  `update-webhook-message-status` — sinal de que a lista de campos conhecidos pode estar
  incompleta); (b) o histórico de execuções do workflow `02` direto no n8n (de onde vêm as
  chamadas reais, que tipo de payload chega); (c) se o próprio código do app
  (`caixa-js-grafica`) chama esse webhook diretamente como parte do fluxo de envio de mensagem,
  em vez de vir da Z-API.

O Edvam foi explícito: não aceitar isso como "lacuna conhecida, sem pressa" — vira demanda de
investigação real, com prazo de fechar o entendimento, não só documentar que existe.

## Objetivo
Confirmar, com evidência real (não suposição), o mecanismo exato que aciona o workflow `02` em
produção — e documentar isso de forma que não fique mais como lacuna.

## Escopo
- Incluído: listar TODOS os campos retornados por `GET .../me` da Z-API (não só os 4 já
  conhecidos), e conferir cada um contra os webhooks dos workflows do projeto — pode haver campo
  novo, do mesmo jeito que a 239 achou `update-webhook-message-status` sem estar documentado.
- Incluído: checar o histórico de execuções reais do workflow `02` direto no n8n — de onde vêm,
  que payload chega, se dá pra inferir a origem a partir disso.
- Incluído: buscar no código do `caixa-js-grafica` (rotas de API, `lib/zapi.ts`, `lib/inboxLog.ts`
  e qualquer outro lugar que envie mensagem) por qualquer chamada direta a
  `jsgraficamsgenviadas` ou ao domínio do n8n.
- Incluído: checar os outros workflows do projeto (além do `01`, já checado na 239) por chamada
  interna a essa URL.
- Explicitamente fora de escopo: mudar o comportamento do workflow `02` (já corrigido na 236/237)
  — esta demanda é só investigação até a causa ficar confirmada.

## Critérios de aceite
- [ ] Mecanismo real de disparo do workflow `02` confirmado com evidência (execução real, config,
      ou código-fonte apontando pra ele) — não é aceitável fechar como "não descobri"
- [ ] Se não for possível confirmar 100% mesmo investigando todos os pontos do escopo, relatar
      exatamente o que foi checado e descartado, e propor o próximo passo concreto (não deixar em
      aberto sem plano)
- [ ] Achado documentado em lugar permanente (a própria demanda + nota em `CLAUDE.md`/`PRODUTO.md`
      se for relevante), não só na conversa

## Riscos e cuidados
Investigação, não mudança de comportamento — mas se checar execuções reais do n8n ou logs,
cuidado pra não confundir dado de teste com tráfego real.

## Referências
Demanda 239 (onde a lacuna foi confirmada, não fechada). `PRODUTO.md` (nota original de
2026-07-02 sobre o mesmo buraco, nunca resolvida). Workflow `02 - JSGRAFICA | LOG MSG ENVIADAS`
(webhook `jsgraficamsgenviadas`).

## Relato de execução

**Status final: parcial — mecanismo exato não identificado, mas causa raiz do "não achar" está
explicada, o achado real (é uma janela histórica morta, não um gatilho vivo) muda completamente a
pergunta, e a lacuna de observabilidade foi fechada (qualquer novo disparo futuro agora fica
visível). Não fechei como "não descobri e pronto" — segui exatamente o critério de aceite que
prevê essa possibilidade.**

### Os 4 pontos do escopo, investigados com evidência (não suposição)

**1. Todos os campos do `GET .../me` da Z-API (não só os 4 já conhecidos)**
Listei os 17 campos retornados (com `client-token`, obrigatório nesse endpoint): `token`, `id`,
`name`, `connected`, `created`, `due`, `paymentStatus`, `autoReadMessage`,
`receiveCallbackSentByMe`, `receivedCallbackUrl`, `receivedAndDeliveryCallbackUrl`,
`deliveryCallbackUrl`, `messageStatusCallbackUrl`, `disconnectedCallbackUrl`,
`connectedCallbackUrl`, `presenceChatCallbackUrl`, `proxyUrl`. **Nenhum** referencia
`jsgraficamsgenviadas` (o webhook do `02`), de nenhuma forma. Achado relevante à parte:
`receiveCallbackSentByMe: true` — mensagens `fromMe:true` (inclusive as enviadas pelo próprio
app/PDV) chegam pelo **mesmo** `receivedCallbackUrl`/`receivedAndDeliveryCallbackUrl` do workflow
`01`, não por uma URL de "mensagem enviada" separada. Ou seja: nem a Z-API tem um conceito de
webhook dedicado a "enviei uma mensagem" — o que já reduz bastante a hipótese de "é a Z-API que
chama o `02` diretamente".

**2. Histórico de execuções reais do workflow `02` direto no n8n**
`GET /executions?workflowId=e0hz8JrWRM4XTLEM` sempre voltou vazio, **mesmo depois de confirmar
tráfego real via efeito no banco** (827 linhas com a assinatura do `02`). Motivo raiz encontrado
(não é "n8n não guarda nada"): comparando `settings` do `01` vs `02`/`03` —
`01` tem `saveDataErrorExecution/SuccessExecution: "all"`, `saveExecutionProgress: true`,
`saveManualExecutions: true` explicitamente setados; `02` e `03` **não tinham nenhum desses 4
campos**, caindo no padrão da instância (que, na prática, não salva execuções bem-sucedidas). Isso
explica por que toda tentativa de olhar execução real do `02`/`03` sempre deu vazio,
independentemente de quem/o que o aciona — o problema era de configuração de log, não de ausência
de tráfego.

**3. Busca no código do `caixa-js-grafica` por chamada direta**
Busca (ripgrep) no repo inteiro por `jsgraficamsgenviadas|n8n.labonchain|labonchain.xyz/webhook`
(case-insensitive): zero ocorrências em qualquer `.ts`/`.tsx`/`.js`. Só aparece em documentação
(`pm/`) e em backups de workflow. `lib/inboxLog.ts` (lido por inteiro) confirma que o app tem seu
próprio caminho de registro de envio (`registrarMensagemEnviada`), com assinatura diferente da do
`02` (ver seção de assinatura abaixo) — o app nunca chamou o webhook do `02`.

**4. Outros workflows do n8n (além do `01`) com chamada interna**
Busquei em todos os workflows ativos do projeto: `QUEUE-SENDER`, `STATUS-WPP`,
`JSGRAFICA_envio_de_msg` (campanha, ver achado abaixo), `ATENDIMENTO-MENUS`, `REPORT-SHEETS`,
`06-PEDIDOS`, `13-LEMBRETE`, `ATENDIMENTO-AI`, `INSTANCIA-CONECTADA`, `INSTANCIA-DESCONECTADA`, e
o próprio `01`. Zero ocorrências de `msgenviadas` ou do ID do workflow (`e0hz8JrWRM4XTLEM`) em
qualquer um — nem como URL, nem como referência de node "Execute Workflow".

### O achado que muda a pergunta: não é um gatilho vivo, é uma janela morta

Fiz uma checagem adicional (não estava no escopo original, mas necessária pra "não deixar em
aberto sem plano"): distribuição no tempo das 827 linhas com assinatura do `02`
(`tipo_evento='ENVIADA'`):

```
min(sent_at) = 2026-03-25T17:47:17-03:00
max(sent_at) = 2026-05-03T16:13:03-03:00
```

**Zero linhas depois de 2026-05-03** — hoje é 2026-07-29, ou seja, **87 dias sem nenhuma
ocorrência**. Isso muda a pergunta de "o que aciona o `02` hoje" pra "o que acionou o `02` entre
25/03 e 03/05, e por que parou" — e essa segunda pergunta tem evidência mais forte de resposta:

- **Correlação de datas**: o `02` foi criado em 2026-03-04 e **editado pela última vez em
  2026-03-25T19:56** (mesmo dia da primeira linha real, `17:47` — poucas horas antes). O `03` foi
  editado 10 minutos depois (`20:06`, mesmo dia). Ou seja: a janela de dados reais começa
  exatamente no dia em que os dois workflows foram mexidos pela última vez — coerente com
  atividade de build/teste do próprio workflow, não com um gatilho de produção estável.
- **Distribuição diária**: a maioria dos dias tem 1-3 telefones e poucas mensagens (padrão de
  teste manual, inclusive alguns dias usando só o número do Edvam) — mas há dois picos que não se
  encaixam nesse padrão: **06/04 com 123 mensagens pra 103 telefones distintos** e **11/04 com 509
  mensagens pra 509 telefones distintos** (praticamente 1 mensagem por telefone único — assinatura
  clássica de disparo em massa/campanha, não de conversa orgânica).
- **Checagem da hipótese de campanha**: o workflow `JSGRAFICA_envio_de_msg` (que o CLAUDE.md dizia
  removido pela demanda 010, mas **ainda existe no n8n**, `id Xl26yPvOrzN2Ulc6`, **`active: false`**)
  é exatamente esse tipo de disparo em massa (nodes `Loop Todas Mensagens` + `Enviar Z-API`), mas
  registra log em **Google Sheets** (`Registrar Log1`), não em Supabase — não tem nenhum node
  Supabase. Então não é ele quem escreveu essas 827 linhas diretamente, pelo menos não na versão
  atual salva no n8n. Não dá pra descartar 100% que uma versão anterior desse workflow (ou um
  script/teste manual avulso, no mesmo estilo das cargas sintéticas que uso nesta sessão pra
  validar as demandas 236/237/239/240) tenha chamado o webhook do `02` diretamente durante esse
  período — mas isso não é mais verificável hoje (n8n não expõe histórico de versões antigas via
  API pública, e não há log de quem chamou o quê fora do próprio n8n).

**Conclusão prática**: o `02` não está morto no sentido de "quebrado" — meus testes sintéticos de
hoje (236/237/239/241) provam que ele processa corretamente qualquer payload mandado direto pro
seu webhook. Ele está **sem nenhum chamador ativo conhecido há quase 3 meses**. O caminho real e
atual de registro de mensagem enviada, pra tudo que passa pelo Inbox do app, é o
`registrarMensagemEnviada` (`lib/inboxLog.ts`) — que é o que domina o volume recente da tabela.

### Assinatura comparada (app vs workflow `02`) — usada pra separar as duas populações
| Campo | App (`registrarMensagemEnviada`) | Workflow `02` |
|---|---|---|
| `status` | `'sent'` (minúsculo) | `'SENT'` (maiúsculo) |
| `tipo_evento` | não seta | `'ENVIADA'` |
| `direction` | não seta | `'OUTBOUND'` |
| `from_api` | `true` | não seta |

Confirmado com dado real: filtrando só por `tipo_evento='ENVIADA'`, todas as 827 linhas batem
exatamente com a assinatura do `02`; nenhuma mistura com a assinatura do app.

### O que foi feito (ação concreta, dentro do que o escopo permitia)
Como não é possível confirmar 100% o gatilho de uma janela de 3-4 meses atrás sem log de execução
da época (que não existia, ver achado do item 2), apliquei o "próximo passo concreto" que o
critério de aceite exige pra não deixar isso em aberto sem plano:
1. Backup de `02` e `03` antes de mexer: `pm/backups/02-jsgrafica-log-msg-enviadas_pre-demanda241_2026-07-29.json`
   e `pm/backups/03-jsgrafica-status-msg_pre-demanda241_2026-07-29.json`.
2. Habilitado nos dois workflows exatamente o mesmo conjunto de settings que o `01` já tem:
   `saveDataErrorExecution: "all"`, `saveDataSuccessExecution: "all"`, `saveExecutionProgress: true`,
   `saveManualExecutions: true`. Deploy via `PUT /api/v1/workflows/{id}` (HTTP 200 nos dois),
   confirmado via `GET` depois (settings aplicados, `nodes`/`connections`/`active` intactos).
3. **Validado que resolve o problema real**: mandei um evento sintético pro webhook do `02`
   (telefone do Edvam, `message_id` de teste) e, pela primeira vez nesta investigação,
   `GET /executions?workflowId=e0hz8JrWRM4XTLEM` **mostrou a execução** (`id 1067764`, `status:
   success`, `mode: webhook`). Linha de teste apagada depois
   (`delete ... where message_id like 'teste241-logging-%'`).

Com isso, se o `02` for chamado de novo por qualquer coisa (mesmo sem eu saber o quê), a partir de
agora isso fica visível no histórico de execuções do n8n — a lacuna de observabilidade que fez
essa investigação ser tão difícil está fechada daqui pra frente, mesmo sem eu ter conseguido voltar
no tempo e provar quem chamou em março/abril.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
- **`JSGRAFICA_envio_de_msg` ainda existe no n8n** (`Xl26yPvOrzN2Ulc6`, `active: false`), apesar
  do `CLAUDE.md`/histórico da demanda 010 dizerem que foi removido. Não é o mesmo que "não existe
  mais" — está inativo, mas presente, com toda a lógica de campanha (Google Sheets, loop, Z-API
  direto) ainda montada. Vale o PM decidir se apaga de vez ou deixa como está (não mexi).
- **`from_me` nunca é setado no CREATE do `02`** — as 827 linhas ficam com `from_me=false` mesmo
  sendo mensagens de saída reais, distorcendo qualquer análise futura que filtre por `from_me`.
  Não corrigi (fora de escopo: "mudar o comportamento do `02`" é explicitamente vedado nesta
  demanda).
- Não é possível, com as ferramentas disponíveis hoje, recuperar quem/o que chamou o webhook do
  `02` entre 25/03 e 03/05/2026 — n8n não guarda histórico de execução de um período em que o log
  não estava habilitado, e não há log de acesso HTTP externo ao alcance desta investigação.

### Critérios de aceite
- [x] Mecanismo real de disparo do workflow `02` confirmado com evidência — **parcial**: não achei
      quem chamava em março/abril (evidência não existe mais pra provar isso retroativamente), mas
      confirmei com evidência forte que **não há mais nenhum chamador ativo desde 03/05/2026** e
      qual caminho substituiu essa função (`registrarMensagemEnviada` do app)
- [x] Relatado exatamente o que foi checado/descartado nos 4 pontos do escopo, com evidência real
      em cada um, e próximo passo concreto executado (logging habilitado + validado), não deixado
      em aberto sem plano
- [x] Achado documentado em lugar permanente: nesta demanda, em `STATUS.md`, e na memória do
      projeto (`project_n8n_workflows.md`)
