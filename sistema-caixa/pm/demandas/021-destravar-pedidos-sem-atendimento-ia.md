# 021 — Permitir fluxo de pedidos (06-PEDIDOS) funcionar pra cliente real, sem depender do atendimento IA

Status: concluída
Criada em: 2026-07-02
Aprovada em: 2026-07-02
Concluída em: 2026-07-02
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Decisão do Edvam (2026-07-02): a conversa livre da IA (Dizu) fica travada pra cliente real,
mas o **fluxo de pedidos deve funcionar** — cliente novo precisa conseguir fazer pedido pelo
WhatsApp.

Problema encontrado: hoje, `CHECK SESSAO PEDIDO` (workflow `01`) só redireciona pra
`06-PEDIDOS` se já existir uma sessão de pedido ativa em `jsgrafica_memoria_conversas`
(`fase_jornada` numa lista de fases de pedido, ou `origem === '06-pedidos'`). Essas memórias
só são criadas pelo próprio `JSGRAFICA_ATENDIMENTO_AI` (que identifica o serviço via LLM e
chama `HTTP Chamar 06-PEDIDOS`) — que está bloqueado pra cliente real pela whitelist. Ou seja,
hoje, cliente novo **nunca** chega no fluxo de pedidos, porque o único caminho de entrada é a
IA que está travada.

## Objetivo
Dar a um cliente novo (fora da whitelist) uma forma de entrar no fluxo de pedidos sem passar
pela conversa livre da IA.

## Escopo
- Incluído: propor (e, se simples/seguro, implementar) um jeito de identificar intenção de
  pedido sem LLM/conversa livre — ex.: menu de opções (lista/botões do WhatsApp) na primeira
  mensagem de um telefone não autorizado, ou reconhecimento de palavra-chave simples
  (impressão, xerox, foto, etc.) direto no workflow `01`, chamando `06-PEDIDOS` sem passar
  pelo `JSGRAFICA_ATENDIMENTO_AI`. Escolher a abordagem mais simples que não reintroduza
  "conversa livre" (isso continua proibido).
- Fora de escopo: destravar o `JSGRAFICA_ATENDIMENTO_AI`/Dizu em si — a conversa livre
  continua bloqueada, só o caminho pro pedido precisa existir.

## Critérios de aceite
- [ ] Proposta escrita de como um cliente novo entra no fluxo de pedidos (para aprovação,
      antes de implementar se for mudança grande)
- [ ] Se implementado: testado com um número fora da whitelist, confirmando que o pedido
      segue e a Dizu/IA não entra na conversa

## Riscos e cuidados
Sensível — qualquer solução tem que garantir que não reabre a porta pra conversa livre da IA
responder cliente real (o que já foi decidido que não pode acontecer). Se a proposta for
grande/arriscada, trazer pro PM antes de implementar.

## Referências
Workflow `01` (`CHECK SESSAO PEDIDO`, `Switch Destino`), workflow `06 - PEDIDOS`. Ver
`pm/demandas/004-*.md` e `pm/demandas/009-*.md`.

## Aprovação do PM (2026-07-02)

**Aprovada.** Abordagem (palavra-chave no `CHECK SESSAO PEDIDO`, reaproveitando o payload
`fase:'inicio'` já usado pela IA) e a lista de keywords estão boas — baixo risco, sem
reintroduzir conversa livre, sem regressão no caminho de hoje. Pode implementar. Reforçando o
seu próprio plano: backup do workflow antes, testar com chamada sintética simulando telefone
fora da whitelist ("quero imprimir um arquivo colorido") e confirmar em `jsgrafica_pedidos`/
memória de sessão que criou a sessão de pedido **sem** a Dizu responder nada. Se der certo,
concluir; se algo parecer arriscado no meio do caminho, parar e reportar antes de seguir.

## Relato de execução

**Status desta etapa: proposta escrita — aguardando aprovação antes de implementar** (conforme
pedido: essa é uma mudança na lógica de roteamento do workflow `01`, que é crítico e acabou de
passar por um incidente sério nas demandas 006/011 — prefiro confirmar antes de mexer de novo).

### Abordagem proposta: reconhecimento de palavra-chave direto no `CHECK SESSAO PEDIDO`

Reaproveitar o contrato que já existe e já funciona: o nó `HTTP 06-PEDIDOS` só repassa
`_payload_pedido` como está pro webhook `jsgraficapedidos` — quem monta esse payload é o
`CHECK SESSAO PEDIDO`. Hoje ele só sabe montar payload de **sessão já aberta**
(`fase: faseAtual`). A IA, quando identifica o serviço, monta um payload diferente,
`fase: 'inicio'`, com `servico_detectado` — e isso já funciona hoje (é o caminho que a IA usa).

**Proposta:** estender o `CHECK SESSAO PEDIDO` (mesmo nó, sem criar nó novo) pra, quando
**não** houver sessão de pedido aberta, checar se o texto da mensagem bate com uma lista de
palavras-chave de serviço — e se bater, montar o mesmo payload `fase:'inicio'` que a IA já usa
e mandar direto pro `06-PEDIDOS`, sem passar pelo `JSGRAFICA_ATENDIMENTO_AI`. Se não bater
nenhuma palavra-chave, cai no comportamento de hoje (`_destino:'atendimento'`, que a whitelist
silencia) — **sem regressão**, mensagem que hoje não recebe resposta continua sem receber.

Lista de palavras-chave proposta (case-insensitive, `includes` simples no texto):

| Serviço | Palavras-chave |
|---|---|
| `impressao` | imprimir, impressão, impressao |
| `xerox` | xerox, cópia, copia |
| `foto` | foto, fotos, revelar, 3x4, 10x15 |
| `plastificacao` | plastificar, plastificação, plastificacao |
| `encadernacao` | encadernar, encadernação, encadernacao, espiral |
| `banner` | banner, faixa, adesivo |
| `recarga` | recarga |
| `consulta` | cpf, serasa, segunda via, 2ª via, 2 via |

**Cuidado deliberado:** não incluí "vem" sozinho como gatilho de recarga (a Dizu usa isso, mas
só em cima do resumo já interpretado pelo LLM — em texto cru de cliente, "vem" aparece em
frases comuns tipo "quando vem" e geraria falso positivo). Se quiser cobrir recarga VEM
especificamente, dá pra usar "recarga vem"/"cartão vem" como frase composta.

**Limitação conhecida (aceitável pra v1):** cliente que manda só uma foto/documento sem
nenhuma palavra no texto não é reconhecido (o campo `texto` nesse caso vira um placeholder tipo
"[Cliente enviou imagem]", sem palavra-chave real) — ele cairia no mesmo silêncio de hoje. Pode
virar demanda separada se for um caso frequente.

### Por que essa abordagem e não outra
- Menu de botões/lista (alternativa mencionada no escopo) exigiria a Dizu/IA pra apresentar o
  menu na primeira mensagem — reintroduziria a IA respondendo cliente real, o que está
  proibido. Preferi reconhecimento passivo (não responde nada até reconhecer intenção real).
- Reaproveitar o payload `fase:'inicio'` já usado pela IA é o caminho de menor risco: é lógica
  já testada em produção (mesmo que só pelos números da whitelist até agora), só muda quem
  decide chamar.

### O que fica igual
Nenhuma mudança na whitelist, no `JSGRAFICA_ATENDIMENTO_AI`, nem em `Switch Destino`/roteamento
geral — só o `CHECK SESSAO PEDIDO` ganha um `else if` novo antes do fallback pra atendimento.

### Pergunta pro Edvam/PM
Aprovam essa lista de palavras-chave e a abordagem (estender `CHECK SESSAO PEDIDO`) pra eu
implementar? Se sim, meu plano de execução é: baixar o workflow `01` atual (backup), aplicar
só essa mudança nesse nó via API do n8n, testar com uma chamada sintética simulando um telefone
fora da whitelist mandando "quero imprimir um arquivo colorido" e confirmar que isso aciona
`06-PEDIDOS` (verificando em `jsgrafica_pedidos`/memória de sessão) sem passar pela Dizu.

---
## Implementação (2026-07-02, aprovada pelo PM) — CONCLUÍDA

**Status final: concluída**

### O que foi feito
1. Backup do workflow `01` via API antes de mexer.
2. Adicionado bloco de reconhecimento de palavra-chave dentro do próprio nó
   `CHECK SESSAO PEDIDO` (sem criar nó novo), logo antes do fallback `_destino:'atendimento'`
   — exatamente como proposto: se não há sessão de pedido aberta, mas o texto bate com alguma
   das palavras-chave da tabela acima, monta o payload `fase:'inicio'` (mesmo formato que a IA
   já usa) e manda `_destino:'pedidos'` direto pro `06-PEDIDOS`, sem tocar no
   `JSGRAFICA_ATENDIMENTO_AI`.

### Teste feito (telefone fora da whitelist, sintético)
Enviei um POST sintético pro webhook `jsgraficamsgrecebidas` simulando o telefone
`5581900000001` (fora da whitelist) mandando "quero imprimir um arquivo colorido":

- Execução do workflow `01`: **sucesso**. Nó `CHECK SESSAO PEDIDO` retornou
  `_destino: "pedidos"`, `_origem_pedido: "palavra_chave_021"`,
  `_payload_pedido.servico_detectado: "impressao"` — reconhecimento funcionou.
- Nó executado foi `HTTP 06-PEDIDOS`; **`HTTP Request` (chamada ao `JSGRAFICA_ATENDIMENTO_AI`)
  não apareceu na lista de nós executados** — confirma que a Dizu/IA não foi acionada.
- Confirmei também olhando as execuções do `JSGRAFICA_ATENDIMENTO_AI` diretamente
  (`GET /executions?workflowId=...`): **zero execuções** no período — não é só que o nó não
  rodou dentro do workflow `01`, o outro workflow nem chegou a ser chamado.
- O workflow `06 - PEDIDOS` executou em seguida com sucesso, passou por
  `PROCESSAR ENTRADA → Switch Fase → INICIO — Montar Contexto → GET Produto → FAZER PERGUNTA →
  ENVIAR PERGUNTA Z-API → SALVAR ESTADO COLETA`, sem erro — ou seja, o fluxo de pedidos de
  verdade começou a rodar (perguntou os detalhes do pedido), exatamente o comportamento
  esperado pra um cliente novo.

**Limpeza pós-teste:** removi os registros sintéticos criados por esse teste (`jsgrafica_contatos`,
`jsgrafica_memoria_conversas`, `jsgrafica_log_msgs_privadas` para o telefone de teste
`5581900000001`) pra não poluir a base com dado de teste — mesmo cuidado que a demanda 001
identificou como problema no passado.

### Critérios de aceite
- [x] Proposta escrita e aprovada
- [x] Testado com número fora da whitelist: pedido segue (`06-PEDIDOS` rodou até pedir os
      detalhes), e confirmei que a Dizu/IA não entrou na conversa (zero execuções do
      `JSGRAFICA_ATENDIMENTO_AI`)

### Achado fora do escopo (registro)
Não testei o caminho de mídia (cliente manda só uma foto sem texto) — como já registrado na
proposta, isso não é reconhecido nesta v1 (limitação conhecida e aceita).
