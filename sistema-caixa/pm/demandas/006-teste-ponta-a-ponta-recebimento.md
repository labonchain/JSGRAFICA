# 006 — Confirmar ponta a ponta que mensagem recebida de cliente real é gravada

Status: concluída — pipeline de recebimento confirmado quebrado, causa provável identificada
Criada em: 2026-07-02
Aprovada em: 2026-07-02
Concluída em: 2026-07-02
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Demanda 002 revelou que zero mensagem de cliente (`from_me:false`) chegou em
`jsgrafica_log_msgs_privadas` desde 01/06/2026, mesmo depois do Z-API reconectar hoje no
número real da gráfica (confirmado na demanda 003, `GET /device` → 558186108547). Não sabemos
se isso é só ausência de mensagem real de cliente até agora, ou se o pipeline
Z-API → webhook → n8n workflow `01` → Supabase está de fato quebrado para mensagens
recebidas.

## Objetivo
Confirmar, com um teste real, que uma mensagem recebida no WhatsApp da gráfica chega
corretamente em `jsgrafica_log_msgs_privadas` com `from_me:false`.

## Escopo
- Incluído: combinar com o Edvam o envio de uma mensagem de teste (de um celular qualquer,
  não precisa ser cliente real) para o número (81) 8610-8547; conferir se o webhook do Z-API
  disparou, se o workflow `01` executou sem erro, e se a linha apareceu no Supabase com
  `from_me:false` e conteúdo correto; se não aparecer, diagnosticar em qual ponto da cadeia
  travou (Z-API não disparou webhook / n8n não processou / erro ao gravar no Supabase).
- Fora de escopo: consertar o problema se encontrar um — primeiro reportar o diagnóstico.

## Critérios de aceite
- [ ] Mensagem de teste enviada e resultado confirmado (chegou ou não em
      `jsgrafica_log_msgs_privadas`)
- [ ] Se não chegou: diagnóstico de em qual ponto da cadeia travou

## Riscos e cuidados
Precisa de alguém mandando a mensagem de teste de fato (o chat não consegue simular isso
sozinho) — combinar horário com o Edvam ou usar o próprio número de teste autorizado.

## Referências
Workflow `01 - LOG MSG RECEBIDAS`, tabela `jsgrafica_log_msgs_privadas`. Ver `PRODUTO.md` e
demandas 002/003.

## Relato de execução

**Status final: bloqueada (aguardando ação humana) — pronto pra concluir assim que a mensagem
de teste for enviada**

### O que já verifiquei
Reconfirmei agora (antes de pedir o teste) que a situação da demanda 002 continua igual: zero
mensagens recebidas de cliente (`from_me:false`) em `jsgrafica_log_msgs_privadas` desde a
reconexão de hoje às 21:52 UTC até este momento. As únicas 3 linhas na janela são envios
(`from_me:true`) já conhecidos das demandas 003/004.

### Por que está bloqueada
Esta demanda pede um teste real: alguém precisa mandar uma mensagem de WhatsApp de verdade para
(81) 8610-8547 para eu poder conferir se ela chega em `jsgrafica_log_msgs_privadas` com
`from_me:false`. Isso não é algo que eu consigo simular sozinho (não tenho um WhatsApp pra
mandar mensagem, só leitura de banco e do n8n) — é exatamente o risco já previsto no próprio
arquivo da demanda.

**Pedido direto:** alguém (Edvam ou qualquer celular) precisa mandar agora uma mensagem
qualquer (ex.: "teste 006") para (81) 8610-8547. Assim que isso acontecer, eu confirmo o
resultado e fecho o diagnóstico:
- Se a mensagem aparecer em `jsgrafica_log_msgs_privadas` com `from_me:false` → pipeline
  funcionando, demanda concluída.
- Se não aparecer → vou diagnosticar em qual ponto travou, comparando com
  `jsgrafica_log_eventos_instancias` (pra ver se o Z-API disparou algo) e com o histórico de
  erros que eu conseguir puxar do n8n (limitado, já que só tenho `get_workflow_details` /
  `search_workflows` / `execute_workflow` — não tenho uma ferramenta de "execution history" via
  MCP; vou usar o que der via as tabelas do Supabase como proxy, como fiz na demanda 004).

### Testes feitos até agora
Consulta SQL de confirmação (sem alteração) em `jsgrafica_log_msgs_privadas`. Nenhuma mensagem
de teste foi enviada ainda — aguardando.

---

## Continuação — resultado do teste real (2026-07-02)

**Status final: concluída — pipeline confirmado quebrado, causa provável identificada**

### Resultado do teste
Depois do Edvam mandar a mensagem de teste do número pessoal dele (`5521965185667`) pro
WhatsApp da gráfica:

1. **`jsgrafica_log_msgs_privadas`: a mensagem NÃO chegou.** A linha mais recente pra esse
   telefone continua sendo o envio (`from_me:true`) "oi" das 22:27:02 UTC — nada novo depois
   disso.
2. **Confirmei direto no Z-API que a mensagem chegou de verdade no WhatsApp**, pra isolar se o
   problema é WhatsApp→Z-API ou Z-API→n8n→Supabase: chamei `GET /chats` na instância e o chat
   com "Edvan Filho" (`5521965185667`) mostra `lastMessageTime: 1783038682000` →
   **2026-07-03 00:31:22 UTC** — um horário bem mais recente que o "oi" de teste anterior,
   batendo com "agora" (a mensagem que o Edvam acabou de mandar).
3. **`jsgrafica_contatos.data_ultimo_contato`** pra esse telefone também não atualizou (continua
   em 22:27:02) — ou seja, nem a atualização de contato aconteceu, sinal de que a execução do
   workflow `01` não chegou nem nessa etapa.

**Conclusão: a mensagem chegou no Z-API/WhatsApp normalmente — o problema não é aí.** A quebra
está entre o webhook do Z-API disparar e a gravação no Supabase (dentro do processamento do
n8n).

### Causa provável (achada investigando a demanda 010, em paralelo)

Mapeando o grafo de conexões do workflow `01` pra responder a demanda 010, encontrei uma
explicação técnica consistente com esse sintoma:

- Toda mensagem privada normal de cliente passa por `If enviar llm` → `If É Audio?` → em
  paralelo: (a) segue pra `ENVIAR PARA LLM` → ... → `Switch Destino` → (destino padrão
  'atendimento') → nó **`HTTP Request`**, que faz um POST **síncrono** pro webhook do
  `JSGRAFICA_ATENDIMENTO_AI` (`.../webhook/jsgraficaatendimentoai`) e **espera a resposta**; e
  (b) só depois que esse `HTTP Request` responde, o resultado se junta em `Merge Log Geral`
  com o outro input, e SÓ AÍ segue pra `Switch Log Geral` → ... → `MSG PRIVADA` (a gravação
  que a demanda 006 queria confirmar).
- O webhook do `JSGRAFICA_ATENDIMENTO_AI` está configurado pra responder via um nó
  "Respond to Webhook" (`10 – Responder Webhook1`) — mas esse nó só é alimentado por um nó
  chamado `09 – HTTP ZAPI - cliente`, que **não existe mais** na lista atual de nós do workflow
  (é uma conexão órfã, sobrou de uma versão anterior). Ou seja: **nenhuma execução do
  `JSGRAFICA_ATENDIMENTO_AI` — autorizada ou não pela whitelist — chega a responder o
  webhook.** A chamada fica esperando uma resposta que nunca vem.
- Como o nó `HTTP Request` (no workflow `01`) não tem `continueOnFail`/`onError` configurado
  (usa o padrão do n8n: erro = para a execução inteira), quando essa chamada trava/expira, a
  execução do workflow `01` provavelmente termina em erro **antes** de chegar em
  `Merge Log Geral` — e por isso a gravação em `jsgrafica_log_msgs_privadas` nunca acontece
  pra mensagens normais de cliente.

**Isso é uma hipótese fortemente sustentada pelo código e pela evidência (Z-API confirma
recebimento, Supabase não recebe nada, nem o contato atualiza), mas não é 100% certeza** — não
tenho acesso ao histórico de execuções do n8n (só `get_workflow_details`/`search_workflows`/
`execute_workflow` via MCP) pra ver o erro exato registrado na execução. Se alguém tiver acesso
à UI do n8n, a aba "Executions" do workflow `01` vai mostrar isso com certeza (provavelmente um
erro ou timeout no nó `HTTP Request`).

### Por que isso é urgente e além do escopo desta demanda
Isso explica, muito provavelmente, por que o Inbox não reflete conversas reais desde sempre
(demanda 002) e por que zero mensagem de cliente foi logada mesmo com o Z-API reconectado hoje
— não é falta de mensagem real, é o pipeline quebrado. Registrei um adendo na demanda 009
porque isso também muda a análise de segurança feita lá (ver seção "Adendo" naquele arquivo).

### Fora de escopo (não conserto por conta própria)
O conserto (remover a conexão órfã, religar `10 – Responder Webhook1` a um nó real que responda
rápido, ou tornar a chamada do workflow `01` assíncrona/`continueOnFail`) exige editar workflow
— mesmo bloqueio de acesso de escrita da demanda 005. Recomendo isso virar uma demanda nova,
prioritária, assim que o acesso de escrita for resolvido.

### Testes feitos
`GET /chats` no Z-API (leitura). Consultas SQL em `jsgrafica_log_msgs_privadas` e
`jsgrafica_contatos` (leitura). Leitura completa do grafo de conexões do workflow `01` via
`get_workflow_details`. Nenhuma alteração em workflow, credential, configuração ou dado.
