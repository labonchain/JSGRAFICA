# 004 — Auditar e decidir o roteamento do atendimento automático por IA

Status: parcial — auditoria concluída (nenhum vazamento), decisão aguarda o Edvam
Criada em: 2026-07-02
Aprovada em: — (despachada direto pelo Edvam)
Concluída em: — (parte 1 concluída em 2026-07-02; parte 2 aberta)
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Achado técnico verificado nó a nó em `pm/investigacoes/2026-07-02-*.md`: o workflow
`01 - LOG MSG RECEBIDAS` roteia por padrão qualquer mensagem privada normal de cliente para o
webhook de `JSGRAFICA_ATENDIMENTO_AI` (que está `active:true` no n8n), sem checar telefone
nesse caminho — o allowlist hardcoded (`AUTORIZADOS = ['5521965185667']`) só protege os ramos
de comando de produto e pedido em grupo, não esse.

Isso é fato verificado no código. O que **não** está confirmado é se isso já causou impacto
real: o Z-API reconectou hoje (2026-07-02) no número real da gráfica.

## Objetivo
Duas partes, nessa ordem:
1. **Auditoria (prioritária):** confirmar se alguma mensagem foi enviada automaticamente pelo
   fluxo do `JSGRAFICA_ATENDIMENTO_AI` para um cliente real desde a reconexão de hoje.
2. **Decisão (aguarda o Edvam):** depois da auditoria, levar ao Edvam a decisão explícita de
   manter esse roteamento travado (ex.: mudar `CHECK SESSAO PEDIDO`/`Switch Destino` para
   `_destino:'ignorar'` por padrão, ou desativar `JSGRAFICA_ATENDIMENTO_AI`) ou deixar como
   está.

## Escopo
- Incluído: auditar execuções do workflow `01` e `JSGRAFICA_ATENDIMENTO_AI` desde a última
  reconexão de hoje (via histórico de execuções do n8n); identificar se houve resposta
  automática a cliente real; reportar isso imediatamente ao PM, não esperar fechar sprint.
- Fora de escopo: mudar o roteamento ou desativar o workflow por conta própria — essa é uma
  decisão de produto do Edvam, não uma correção técnica automática.

## Critérios de aceite
- [ ] Relatório de auditoria: houve ou não resposta automática a cliente real desde a
      reconexão de hoje (com evidência — execução do n8n, mensagem enviada, etc.)
- [ ] Se houve: reportar como urgente, fora do ciclo normal de sprint
- [ ] Pergunta explícita registrada para o Edvam decidir: travar agora / manter como está /
      travar só parcialmente (ex.: allowlist também no caminho do atendimento)

## Riscos e cuidados
Se a auditoria confirmar resposta automática a cliente real, **isso é urgente** — o chat
executor deve reportar assim que encontrar, sem esperar terminar o resto da demanda.

## Referências
Workflow `01 - LOG MSG RECEBIDAS` (nós `Switch Redirect`, `If enviar llm`,
`CHECK SESSAO PEDIDO`, `Switch Destino`), workflow `JSGRAFICA_ATENDIMENTO_AI`. Ver
`pm/investigacoes/2026-07-02-*.md`.

## Relato de execução

**Status final: parcial** — auditoria (parte 1) concluída; decisão (parte 2) aguarda o Edvam,
como previsto no próprio objetivo da demanda.

### Auditoria — resultado: NÃO houve resposta automática da IA a cliente real

Verificado por evidência cruzada de 3 fontes independentes no Supabase (projeto `arqkdnexpederquztegn`),
todas com filtro `>= 2026-07-02 21:52:00 UTC` (janela desde a última reconexão):

- `jsgrafica_send_queue` — **0 linhas** desde a reconexão (e 0 linhas no total, nunca foi populada).
- `jsgrafica_memoria_conversas` — **0 linhas** desde a reconexão.
- `jsgrafica_n8n_chat_histories_` (memória do `AI Agent1`) — **0 linhas** desde a reconexão.

Essas 3 tabelas só recebem registro se o nó `AI Agent1` do workflow `JSGRAFICA_ATENDIMENTO_AI`
chegar a executar. Estarem todas vazias é evidência forte de que o agente **nunca rodou** desde
21:52 UTC de hoje.

Reforçando isso: não há nenhuma mensagem **recebida** de cliente (`from_me:false`) registrada em
`jsgrafica_log_msgs_privadas` desde 21:47 UTC — ou seja, nem chegou mensagem nova de cliente para
o fluxo processar. As únicas 3 mensagens **enviadas** (`from_me:true`) desde a reconexão foram:

| Telefone | Hora (UTC) | Conteúdo | Interpretação |
|---|---|---|---|
| 5511981889981 | 21:59:01 | "Pedido confirmado ✅ FOTO 10X15" | Template do workflow `06 - PEDIDOS`, não da IA |
| 5511981889981 | 21:59:33 | "Pedido confirmado ✅ ENCADERNAÇÃO..." (com texto solto "nasdnasda" no meio — parece digitação de teste) | Idem — template de pedido, não resposta livre da IA |
| 5521965185667 | 22:27:02 | "oi" | Mensagem manual/teste (não tem o formato de abertura da Dizu, que sempre começa com "Olá! 😊 Eu sou a Dizu...") |

Nenhuma das 3 bate com o formato de saída do agente (`AI Agent1` sempre produz texto + bloco
`[ESTADO_NOVO]...[/ESTADO_NOVO]`, removido só depois pelo nó `EXTRAIR E LIMPAR ESTADO` — mas o
log de envio real seria o texto limpo, não teria como coincidir com "oi" isolado nem com o
template fixo de pedido). **Conclusão: nenhuma resposta automática da IA foi enviada a ninguém
— real ou de teste — desde a reconexão de hoje.**

### Achados fora do escopo original da investigação de 02/07 (relevantes para a decisão)

1. **`JSGRAFICA_ATENDIMENTO_AI` já tem um segundo gate por telefone, não documentado antes.**
   A investigação de 02/07 só tinha lido o roteamento do workflow `01` (que de fato manda tudo
   pro webhook de atendimento sem checar telefone). O que não tinha sido lido é que o próprio
   workflow `JSGRAFICA_ATENDIMENTO_AI` tem um nó `FILTRAR TELEFONES AUTORIZADOS` logo na entrada
   (antes de chamar o LLM) com uma whitelist hardcoded de 5 números:
   `5521965185667, 5581982574944, 558196674923, 5581984956007, 5511992980671`.
   Qualquer telefone fora dessa lista mata o fluxo silenciosamente (`return []`) — nenhum log,
   nenhuma resposta, nenhuma chamada ao LLM. **Na prática, hoje, nenhum cliente real recebe
   resposta automática da IA, porque nenhum cliente real está nessa lista.** O "buraco" de
   roteamento do workflow `01` é real no código, mas está neutralizado por esse segundo gate.
2. **Mesmo para os 5 números autorizados, o envio final parece quebrado.** O último passo do
   fluxo (nó `08 – Preparar envio cliente` → `09 - INSERT FILA JSGRAFICA`) grava a resposta em
   uma tabela `jsgrafica_send_queue` (`status: 'pending'`) e não segue para nenhum outro nó.
   Não encontrei, entre os 8 workflows do projeto nem no código do `caixa-js-grafica` (busquei
   por `send_queue`), nenhum processo que leia essa fila e efetivamente chame o Z-API para
   entregar a mensagem. A tabela está com **0 linhas no total** (nunca foi populada) — ou seja,
   esse caminho nunca disparou de fato, nem em testes anteriores. Não investiguei se existe algo
   fora do n8n (infra externa) que drena essa fila — isso está fora do que consigo confirmar
   com as ferramentas que tenho.

### Resposta à pergunta de decisão (para o Edvam)

Não é urgente agora — não houve vazamento. Mas a proteção que existe hoje (`FILTRAR TELEFONES
AUTORIZADOS`) é a **única** barreira ativa, está hardcoded em código (não em configuração/tabela
editável), e ninguém tinha registrado sua existência antes desta auditoria. Perguntas em aberto
para o Edvam decidir:
- Formalizar essa whitelist como a política oficial (documentá-la, mover para uma tabela de
  config em vez de código-fonte), ou substituir por outro mecanismo?
- Vale investigar e consertar o caminho de envio quebrado (achado 2) antes de sequer cogitar
  liberar o atendimento pra clientes reais — hoje, mesmo destravando a whitelist, nada seria
  entregue de fato ao cliente por esse caminho.
- Quer que eu (01 - N8N) abra demandas formais separadas para os dois achados acima?

### Testes feitos
Somente leitura: consultas SQL diretas (`execute_sql`) nas tabelas `jsgrafica_send_queue`,
`jsgrafica_memoria_conversas`, `jsgrafica_n8n_chat_histories_`, `jsgrafica_log_msgs_privadas`;
leitura completa dos nós do workflow `JSGRAFICA_ATENDIMENTO_AI` via `get_workflow_details`.
Nenhuma alteração feita em nenhum workflow, credential ou configuração.
