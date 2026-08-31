# 031 — Investigar caso atípico no fluxo de pedidos + confirmar se 06-PEDIDOS entrega/loga envio

Status: concluída
Criada em: 2026-07-03
Aprovada em: 2026-07-03
Concluída em: 2026-07-03
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Investigação do PM (2026-07-03): o telefone `558181990533` entrou no fluxo `06-PEDIDOS`
(`fase_jornada` progrediu até `aguardando_confirmacao_pedido`), mas o conteúdo real das
mensagens dele é uma conversa sobre troca de medicamento com uma farmacêutica da Drogasil —
sem nenhuma palavra-chave de serviço de gráfica. Não achado nenhum `from_me:true` em
`jsgrafica_log_msgs_privadas` pra esse telefone nem pros outros 3 que entraram no fluxo hoje
(`558188081062`, `558197711758`, `558199664657`) — não dá pra confirmar se o bot chegou a
enviar alguma coisa de volta pra eles.

**Atualização 2026-07-03:** o Edvam desativou manualmente, direto na UI do n8n, todos os nós
de envio deste workflow (`ENVIAR PERGUNTA Z-API`, `ENVIAR PERGUNTA PAGAMENTO`,
`ENVIAR CONFIRMACAO BOTAO`, `ENVIAR PIX CLIENTE`, `AVISAR CORRECAO`, `ENVIAR MSG GRUPO`,
`AVISAR CLIENTE PEDIDO CRIADO`, `ENVIAR NOTIF COMPROVANTE GRUPO`, `AVISAR CLIENTE
COMPROVANTE`). Isso já para o problema imediato (nada mais é enviado) — esta investigação
continua valendo pra entender a causa raiz antes de qualquer decisão de religar os envios.

## Objetivo
1. Entender por que `558181990533` entrou no fluxo de pedidos sem palavra-chave óbvia.
2. Confirmar se `06-PEDIDOS` está de fato entregando mensagem via Z-API e se esse envio está
   sendo logado em `jsgrafica_log_msgs_privadas` (achado: não achei nenhum `from_me:true` pra
   nenhum dos 4 telefones que interagiram com o fluxo hoje).

## Escopo
- Incluído: revisar o histórico de mensagens de `558181990533` que antecederam a entrada no
  fluxo (pode ter uma mensagem anterior com palavra-chave que não apareceu na amostra do PM);
  checar execuções recentes do workflow `06-PEDIDOS` via `GET /executions` pra ver se ele
  chamou os nós de envio (`ENVIAR PERGUNTA Z-API`, `ENVIAR CONFIRMACAO BOTAO`) pra esses 4
  telefones, e se essas chamadas tiveram sucesso; confirmar se o envio real do `06-PEDIDOS`
  passa pelo workflow `02 - LOG MSG ENVIADAS` (pra aparecer em `jsgrafica_log_msgs_privadas`)
  ou se é uma lacuna de log separada.
- Fora de escopo: mudar a lista de palavras-chave da demanda 021 sem antes reportar o achado.

## Critérios de aceite
- [ ] Causa da entrada de `558181990533` no fluxo identificada (ou "não determinável")
- [ ] Confirmação clara: `06-PEDIDOS` está entregando mensagem de verdade via Z-API pros 4
      telefones de hoje, sim ou não — e se está, por que não aparece logado
- [ ] Se identificar risco real (bot respondendo gente sem relação com a gráfica), reportar
      como urgente

## Referências
Workflow `06 - JSGRAFICA | PEDIDOS`. Telefones: `558181990533`, `558188081062`,
`558197711758`, `558199664657`. Ver achado do PM em 2026-07-03.

## Relato de execução

**Status final: concluída — causa identificada, é um bug da minha própria implementação (021)**

### 1. Causa de `558181990533` (e também `558197711758`) entrarem no fluxo sem palavra-chave óbvia

**Encontrei via execução exata do workflow `01`** (id `855356` para `558181990533`, `855826`
para `558197711758`, confirmadas via `GET /executions/{id}?includeData=true`):

- `558181990533`: mensagem "**Me informe seu CPF**" (da farmacêutica/golpe da Drogasil) →
  `_origem_pedido: "palavra_chave_021"`, `servico_detectado: "consulta"`.
- `558197711758`: mensagem contendo um recibo com "**CPF:811.147.024-04**" (de outro negócio
  completamente — reforma de piso/pintura, não é cliente da gráfica) →
  `_origem_pedido: "palavra_chave_021"`, `servico_detectado: "consulta"`.

**A causa é a palavra-chave "cpf" que eu adicionei na demanda 021**, na categoria `consulta`
(pensada pra reconhecer pedidos de "consulta CPF/Serasa" — um serviço real da gráfica). O
problema: "cpf" é uma palavra comum demais — aparece em qualquer contexto onde alguém pede ou
menciona um CPF, sem relação nenhuma com o serviço da gráfica. Isso puxou pro fluxo de pedidos
duas conversas de pessoas reais que não têm nada a ver com a JS Gráfica.

**Os outros dois telefones (`558188081062`, `558199664657`) entraram corretamente** — mensagens
reais de clientes da gráfica ("Gostaria de imprimir esse texto... é um convite", "Com xerox"),
bateram nas palavras-chave certas (`impressao`, `xerox`) pro serviço certo. Não são parte do
problema.

### 2. Confirmação: `06-PEDIDOS` estava mandando mensagem real via Z-API, sim

Nas linhas de `jsgrafica_memoria_conversas` dos 4 telefones aparecem `zaapId`/`messageId` reais
dentro do `estado_consolidado` (ex.: `"zaapId":"019F27925B78783E82AFE1FC398E712D"`) — esses IDs
só existem quando o Z-API responde com sucesso a um envio de verdade. **Confirmado: pessoas
reais sem nenhuma relação com a gráfica receberam mensagens automáticas do bot perguntando
sobre pagamento/confirmação de pedido de gráfica**, por causa do bug da palavra-chave "cpf".
Isso já parou porque o Edvam desativou manualmente os nós de envio direto na UI do n8n (ver
atualização no contexto desta demanda) — não é mais um problema ativo, mas aconteceu de verdade
antes disso.

### 3. Por que não aparece logado em `jsgrafica_log_msgs_privadas`

**Não é uma lacuna nova — é a mesma pendência já registrada na demanda 011** e nunca fechada:
o webhook do Z-API pra "mensagem enviada" nunca foi configurado apontando pro workflow `02 -
LOG MSG ENVIADAS` (na 011, tentei vários nomes de endpoint na API do Z-API e nenhum funcionou —
ficou como pendência aberta). Confirmei agora: workflow `02 - LOG MSG ENVIADAS`
(`e0hz8JrWRM4XTLEM`) tem **zero execuções** no período todo — ou seja, o Z-API nunca chamou
esse webhook pra nenhuma mensagem enviada, nem pelo `06-PEDIDOS`, nem por nenhum outro
workflow. Confirmei também que o `zaapId` de um envio real não aparece em nenhum lugar de
`jsgrafica_log_msgs_privadas`. **Isso significa: hoje, NENHUMA mensagem enviada pelo sistema
(qualquer workflow) é logada** — não é um problema específico do `06-PEDIDOS`.

### Resposta às perguntas da demanda
1. Causa identificada: **bug meu**, palavra-chave "cpf" (demanda 021) genérica demais.
2. `06-PEDIDOS` confirmado entregando via Z-API (zaapId real) — não aparece logado porque o
   webhook de "mensagem enviada" do Z-API nunca foi configurado (pendência da demanda 011,
   ainda aberta, afeta todos os workflows, não só o `06-PEDIDOS`).
3. **Risco real confirmado**: bot respondeu gente sem relação com a gráfica. Reportando como
   urgente, conforme pedido — mas o impacto imediato já foi contido pelo Edvam ao desativar os
   nós de envio manualmente.

### Recomendação (não implementei — fora do escopo desta demanda por instrução explícita)
Antes de religar qualquer nó de envio do `06-PEDIDOS`: tirar "cpf" e "serasa" isolados da lista
de palavras-chave da demanda 021, trocando por frases compostas tipo "consulta cpf" / "consulta
serasa" / "2ª via" — que são bem mais específicas e não aparecem por acaso em conversas sobre
outro assunto. Recomendo isso virar ajuste imediato na 021 assim que aprovado, já que é a causa
raiz confirmada.

### Testes feitos
Somente leitura/investigação: `GET /executions` (paginado, workflow `01`) pra achar as
execuções exatas de cada telefone; `GET /executions/{id}?includeData=true` pra ver o payload
processado nó a nó; consultas SQL em `jsgrafica_log_msgs_privadas` e `jsgrafica_memoria_conversas`;
`GET /executions` do workflow `02` pra confirmar a lacuna de log de envio. Nenhuma alteração em
workflow, credential, dado ou configuração.
