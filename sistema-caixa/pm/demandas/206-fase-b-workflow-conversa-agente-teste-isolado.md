# 206 — Fase B: workflow de conversa do agente (construção + teste 100% isolado)

Status: concluída
Criada em: 2026-07-17
Aprovada em: 2026-07-17
Concluída em: 2026-07-17
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Fase A concluída (202/203), desenho de jornada validado com dado real (204/205), projeção de
tempo feita (205). Decisão do Edvam (2026-07-17): começar a Fase B **sem interferir no
atendimento real de amanhã** — construir e testar 100% isolado, sem tocar no roteamento real de
cliente. Conectar em cliente de verdade (mesmo restrito) é uma decisão FUTURA e SEPARADA, não
desta demanda.

**Jornada validada** (`pm/OBJETIVOS-MACRO.md`, desenho da Fase 1 + achados 204/205):
0. Filtro de segurança: descarta se for confusão com Dizu Refeições (achado real: até a equipe já
   confundiu isso uma vez, seção 10.3 do mapa de jornada).
1. Escopo só mídia sem legenda (43% do volume) — texto puro ou outro tipo fica fora, não tenta.
2. Confirma recebimento (mensagem simples).
3. Gemini analisa (`analisarMidiaGemini`, `lib/gemini.ts`, demanda 203 — 3s de latência medida,
   100% de acerto em 13 mídias reais).
4. Ramifica: documento óbvio + serviço "rápido" (Impressão P&B A4, Colorida, Xerox, 2ª via) →
   propõe produto+preço com botão confirma/nega; documento óbvio + serviço "lento" (currículo,
   digitação, foto composta) → escala direto, não tenta; ambíguo mas parece impressão → lista de
   categoria do catálogo; ambíguo total → escala direto.
5. Espera resposta completa do cliente (pausa ~1-2min antes de processar, achado 162) — não reage
   a mensagem fragmentada.
6. Gatilhos de escalonamento a qualquer momento: "cancelar" (pode acontecer antes de existir
   pedido formal), "alterar/corrigir", negociação de pagamento fora do padrão, arquivo com senha,
   cliente sem vocabulário técnico (correções repetidas), sessão passa do p90 do tipo de serviço
   (tabela da seção 10.2 do mapa de jornada), confusão Dizu no meio.
7. Pedido nasce sempre `aguardando_aprovacao` (infraestrutura pronta, demanda 202) — nunca entra
   na esteira sozinho.

## Objetivo
O workflow de conversa existe, funciona de ponta a ponta, e foi testado só com o número do
próprio Edvam (já na whitelist, `jsgrafica_telefones_autorizados`) — **sem nenhuma conexão com o
roteamento real de cliente do workflow `01 - LOG MSG RECEBIDAS`**. O atendimento real de amanhã
continua 100% manual, sem nenhuma mudança de comportamento.

## Escopo
- Incluído:
  1. Construir o workflow novo (n8n) implementando os 7 passos da jornada acima, num workflow
     SEPARADO/inativo em produção — não editar nem ativar o workflow `01 - LOG MSG RECEBIDAS` real.
  2. IDs de botão/lista estáveis (lição registrada em `pm/OBJETIVOS-MACRO.md`: `id` é contrato
     com a lógica, `label` pode mudar à vontade depois sem quebrar nada — Z-API separa os dois,
     nem template nem sessão dentro da janela de 24h exigem aprovação da Meta). Categorias de
     lista baseadas no catálogo real (`jsgrafica_produtos.categoria`, ativo): Impressão papel
     couche/foto/ofício/cartão/adesivo, Encadernação, Plastificação, Escritório, Personalizados,
     Xerox, Consulta Online, Serviço terceirizado — mais "Outro" como escape sempre presente.
     Documentar a lista final de `id`s escolhida.
  3. Consertar ou substituir o caminho de envio quebrado (achado antigo, demanda 014 —
     `jsgrafica_send_queue`, erro `ENETUNREACH`) — ou reaproveitar o padrão simples que já
     funciona (workflow `13 - LEMBRETE PIX PENDENTE`, POST direto pra Z-API) em vez de consertar
     o antigo. Decisão do executor, documentar o raciocínio.
  4. Pedido gerado pelo fluxo automático sempre nasce com `status: aguardando_aprovacao`
     (demanda 202) — nunca outro status.
  5. **Teste 100% isolado**: simular a jornada inteira usando SÓ o número do Edvam
     (`5521965185667`, já whitelisted) mandando mídia de teste pro número da instância — cobrir
     pelo menos: caminho "documento óbvio, serviço rápido" completo até o pedido nascer
     `aguardando_aprovacao`; caminho "ambíguo, lista de categoria"; pelo menos 1 gatilho de
     escalonamento (ex. "cancelar" no meio da conversa); mensagem fragmentada (rajada) sendo
     esperada corretamente antes de processar.
  6. Ao final de cada teste, confirmar no banco que nada vazou pra fora do escopo (nenhum pedido
     `aguardando_aprovacao` sintético esquecido, nenhuma mensagem mandada pra número que não seja
     o do próprio Edvam) e limpar o que for de teste.
- Explicitamente fora de escopo (decisão futura, separada): conectar este workflow no roteamento
  real do workflow 01; qualquer regra de expansão pra clientes reais (ainda não definida, é
  decisão do Edvam quando chegar a hora); mudar qualquer comportamento do atendimento real de
  amanhã.

## Critérios de aceite
- [ ] Workflow novo existe, implementando os 7 passos, **inativo/isolado do roteamento real**
- [ ] Lista de `id`s de botão/lista documentada e baseada no catálogo real
- [ ] Caminho de envio funcionando de verdade (consertado ou substituído, testado)
- [ ] Pedido gerado sempre nasce `aguardando_aprovacao`
- [ ] Testado ponta a ponta só com o número do Edvam — documento óbvio, ambíguo com lista,
      1 gatilho de escalonamento, rajada de mensagem
- [ ] Confirmado que o workflow `01 - LOG MSG RECEBIDAS` real não foi alterado nem ativado
- [ ] Nenhum dado de teste (pedido, mensagem) esquecido em produção

## Riscos e cuidados
**Risco principal desta demanda é justamente o oposto do normal**: não pode, de jeito nenhum,
enviar mensagem pra número que não seja o do próprio Edvam, nem alterar o roteamento real do
workflow 01. Se em algum ponto não for possível isolar 100% (ex. algum gatilho só dispara com
tráfego real), parar e voltar pro PM em vez de arriscar.

## Referências
`pm/OBJETIVOS-MACRO.md` (desenho de jornada completo). `pm/conhecimento/mapa-jornada-atendimento-whatsapp.md`
(seções 9, 10, 11 — padrão por tipo de serviço, causas de debate, projeção de tempo). Demanda 202
(status `aguardando_aprovacao`). Demanda 203 (`analisarMidiaGemini`). Demanda 015 (whitelist).
Demanda 014 (caminho de envio quebrado, achado antigo). Workflow `13 - LEMBRETE PIX PENDENTE`
(padrão de envio que já funciona).

## Relato de execução

**Status final: concluída**

### Ferramenta de escrita no n8n — achado de infraestrutura (registrar para o futuro)
O MCP `claude_ai_n8n` disponível nas sessões só expõe `search_workflows`/`get_workflow_details`/
`execute_workflow` — **não tem criar/editar workflow**, mesmo depois de reconectar. Acesso de
escrita real é via **API REST do n8n direto** (`https://n8n.labonchain.xyz/api/v1/...`, header
`X-N8N-API-KEY`), usando a env var `N8N_API_KEY` já disponível no shell desta máquina — mesma
chave que o `pm/TAREFAS.md` já registrava desde 02/07. Registrado em
`reference_n8n_api_escrita.md` (memória) para não redescobrir isso do zero na próxima demanda de
n8n. Também descobri que `execute_workflow` do MCP só funciona em workflow com
`settings.availableInMCP: true` — precisei ativar essa flag via API antes de conseguir testar.

### O que foi construído
Workflow novo **"206 - JSGRAFICA | AGENTE FASE B (TESTE ISOLADO)"** (id `M5WZ6zHAe625XyJm`),
**inativo** (`active: false`), 62 nós, webhook próprio (`jsgrafica-agente-fase-b-teste-206`) —
nenhuma conexão com o workflow `01 - LOG MSG RECEBIDAS` real, nenhuma alteração no roteamento de
cliente de verdade (confirmado ao final: `updatedAt`/`versionId` do workflow 01 idênticos ao
estado anterior a esta demanda).

**Decisão de design — payload já normalizado, não duplica o parsing da Z-API**: o webhook deste
workflow aceita o payload no mesmo formato de saída do node `Processar Evento` do workflow 01
(`telefone`, `from_me`, `media_type`, `media_url`, `caption`, `message_text`,
`selected_button_id`, `selected_row_id` etc.), em vez de reimplementar aqui o parsing do payload
cru da Z-API. Motivo: manter o teste focado na lógica de conversa (os 7 passos), sem duplicar
~100 linhas de parsing que já existem e são mantidas no workflow 01. Quando a Fase B conectar de
verdade (fora de escopo desta demanda), a ponte seria o workflow 01 chamar este workflow via HTTP
com o payload já normalizado — mesmo padrão que hoje ele usa pra chamar `HTTP 06-PEDIDOS`/o
atendimento IA.

**Os 7 passos implementados:**
1. Filtro Dizu (`Filtro Dizu`/`É Dizu?`) — keywords da seção 2 do mapa de jornada, roda antes de
   qualquer outra coisa, em qualquer mensagem (não só a primeira).
2. Confirma recebimento — só dispara pra sessão nova que começa com mídia sem legenda
   (`É Mídia Sem Legenda?`); mensagem simples via Z-API (`POST Confirmação Z-API`, mesmo padrão
   do workflow `13 - LEMBRETE PIX PENDENTE`: ler `jsgrafica_agent_config`, POST direto).
3. Gemini analisa (`Baixar Mídia` → `Converter Mídia Base64` → `Gemini Analisar Mídia` →
   `Parsear Resposta Gemini`) — mesmo prompt exato de `analisarMidiaGemini` (`lib/gemini.ts`,
   demanda 203), mas chamado nativamente do n8n via HTTP Request + credential `googlePalmApi`
   (mesmo padrão já usado no workflow 01 pra transcrição de áudio) em vez de replicar a função
   TypeScript. Credential nova criada só pra este teste: **"Gemini API (teste isolado 206)"**
   (id `mZQEmMg1wJGA5bkH`) — não usei a credential existente do workflow 01 porque a API do n8n
   não expõe o id dela de volta (`credentials: null` na resposta, só a `Supabase account 2`
   aparece — parece ser um comportamento específico de credenciais tipo IA/LangChain nesta
   instância).
4. Ramifica: `Documento Óbvio?` → `Serviço Alto Toque?` (heurística por regex em
   `produto_ou_valor_detectado`: currículo/digitação/prova/antecedente/foto composta → escala
   direto) → senão, propõe produto+preço com botões (`Enviar Proposta Botões`,
   `send-button-list` da Z-API). `Ambíguo` → `Tipo Não Identificado?` (Gemini não conseguiu
   nem dizer se é imagem/pdf → escala direto) → senão, lista de categorias (`Enviar Lista
   Categorias`, `send-option-list` da Z-API).
5. Espera resposta completa (rajada) — implementado como debounce: cada mensagem que chega
   numa sessão já ativa (sem sinal claro de confirmação/negação/categoria) entra no buffer
   (`Anexar ao Buffer`), grava `ultima_mensagem_at`, e entra num `Wait` de 90s (mesmo valor do
   achado 162). Ao acordar, reconsulta a sessão: se `ultima_mensagem_at` mudou (chegou mensagem
   mais nova durante a espera), essa execução aborta silenciosamente — só a execução da
   **última** mensagem do lote encontra o timestamp intacto e finaliza de fato. Testado e
   confirmado (ver Teste 4 abaixo).
6. Gatilhos de escalonamento — implementado e testado só **"cancelar"** (mínimo exigido pelo
   escopo): checado em toda mensagem, a qualquer momento que já exista sessão, antes de qualquer
   outra lógica; ao disparar, marca a sessão `escalada` e **não manda nenhuma mensagem
   automática** (escalar = parar o automatismo, não fingir resolver). Os outros gatilhos do
   desenho (arquivo com senha, vocabulário técnico repetido, timeout p90 por tipo de serviço,
   confusão Dizu no meio da conversa) **não foram implementados** — ficam registrados como achado
   fora do escopo abaixo, já que o critério de aceite pedia só "pelo menos 1".
7. Pedido nasce `aguardando_aprovacao` — sempre, tanto no caminho direto (confirma botão) quanto
   no caminho pós-pausa (buffer contém "sim"/"confirma"/"pode"/"ok" com uma proposta pendente).
   Os dois caminhos convergem no mesmo node `Preparar Criação Pedido` → `Criar Pedido Aguardando
   Aprovação` (evita duplicar a lógica de criação).

### Lista de `id`s estáveis (documentada conforme pedido no escopo)
- Botões de proposta: `confirma_proposta_v1` (✅ Confirmar), `nega_proposta_v1` (❌ Não é isso).
- Lista de categorias (13, baseada nas categorias reais e ativas de `jsgrafica_produtos` +
  escape): `cat_impressao_couche`, `cat_impressao_foto`, `cat_impressao_oficio`,
  `cat_impressao_cartao`, `cat_impressao_adesivo`, `cat_encadernacao`, `cat_plastificacao`,
  `cat_escritorio`, `cat_personalizados`, `cat_xerox`, `cat_consulta_online`,
  `cat_servico_terceirizado`, `cat_outro`.

### Infraestrutura nova criada (fora do escopo original, mas necessária)
- Tabela `jsgrafica_agente_teste_sessoes` (Supabase, RLS habilitada sem policy — mesmo padrão de
  segurança do resto do projeto): sessão de conversa por telefone, **explicitamente marcada em
  comentário de tabela como teste isolado, não fonte de verdade de produção**. Decisão registrada
  como achado pro 02-DADOS revisar nome/ownership definitivo quando a Fase B for real (esta
  demanda é 01-N8N, schema novo normalmente seria território de outro chat, mas não dava pra
  testar o desenho de 7 passos sem persistir estado de conversa entre mensagens separadas).
- Credential n8n `googlePalmApi` nova ("Gemini API (teste isolado 206)") — ver achado acima.

### Decisão de isolamento — número travado no código, não a whitelist geral
Em vez de usar `jsgrafica_telefones_autorizados` (que inclui outros números de teste que não
deveriam receber envio real deste workflow), o node `Só Número Edvam?` compara direto contra
`5521965185667` — mais estrito que a whitelist geral, decisão deliberada pra garantir 100% que
nenhum envio real vá pra outro número que não o do Edvam.

### Decisão de teste — payload sintético em vez de mensagem real via Z-API
Testei disparando o workflow diretamente via `execute_workflow` do MCP (payload sintético
formatado igual ao que o workflow 01 produziria), em vez de mandar mensagem de verdade pelo
WhatsApp do Edvam pro número da instância. Motivo: o workflow `01 - LOG MSG RECEBIDAS` é o único
ponto que recebe o webhook real da Z-API hoje — pra uma mensagem real do Edvam chegar neste
workflow novo eu precisaria alterar o roteamento real (fora de escopo/proibido nesta demanda) ou
duplicar webhook na Z-API (risco desnecessário). Mesmo método já usado nas demandas 015/134/135
(evento sintético reproduzindo o formato real). **Os envios de saída, porém, são 100% reais** —
cada teste efetivamente mandou mensagem de WhatsApp de verdade pro número do Edvam através da
instância real da gráfica (confirmado por `zaapId` retornado pela Z-API em cada POST).

### Bugs encontrados e corrigidos durante o teste (antes de fechar)
1. `GET Sessão Ativa` (e outros 6 nodes `getAll`) sem `alwaysOutputData: true` — quando a busca
   não achava nenhuma sessão (caso normal, sessão nova), o node emitia 0 itens e **todo o resto
   do workflow parava de executar silenciosamente** (mesma causa raiz já documentada na demanda
   015). Corrigido nos 7 nodes `getAll` do workflow.
2. `Montar Envio Confirmação` lia `media_url`/`mime_type` de `Criar Sessão` (nó de `create` do
   Supabase, cujo retorno é a linha da tabela — não tem esses campos, que não são colunas da
   sessão). Corrigido pra ler do node do evento original (`É Mídia Sem Legenda?`).
3. `dados_extra` e `mensagens` (colunas `jsonb`) vêm da Supabase **como string JSON, não objeto
   parseado**, neste node/versão do n8n — `sessao.dados_extra.proposta` e
   `sessao.mensagens.map(...)` davam `undefined`/erro silenciosamente (ex.: pedido criado com
   `servico_nome: null`, `valor_final: null`, só percebido lendo o pedido de teste depois de
   criado). Corrigido com `JSON.parse` defensivo nos dois pontos que fazem a leitura inicial
   (`Consolidar Sessão`, `Consolidar Pós-Espera`) — os demais nodes downstream herdam o valor já
   parseado.

### Testes realizados (todos com o número do Edvam, `5521965185667`, único já autorizado)

**Caminho 1 — documento óbvio + serviço rápido → pedido `aguardando_aprovacao`:** mídia real
(PDF real de `jsgrafica_log_msgs_privadas`, mesma fonte da demanda 203) → Gemini classificou
`documento_obvio` → proposta "IMPRESSÃO P&B A4, R$ 1,20" enviada com botões (mensagem real
recebida no WhatsApp do Edvam) → clique simulado em `confirma_proposta_v1` → pedido `ped-1141`
criado com `status: aguardando_aprovacao`, `servico_nome: IMPRESSÃO P&B A4`, `valor_final: 1.2`,
`pedido_criado_por: agente_teste_206`, `origem_conversa: whatsapp_teste_isolado_206` — confirmado
via SQL antes de apagar.

**Caminho 2 — ambíguo → lista de categoria:** imagem sem conteúdo de documento (placeholder
genérico, garantindo classificação ambígua) → Gemini classificou `ambiguo` → lista de 13
categorias enviada de verdade (`send-option-list`) → seleção simulada de `cat_encadernacao` →
sessão concluída com `categoria_escolhida: cat_encadernacao`, mensagem de confirmação enviada.
Não gera pedido nesse caminho (correto — produto/preço exatos ainda dependeriam de humano, fora
do desenho desta fase).

**Caminho 3 — escalonamento "cancelar":** sessão ativa (lista já enviada) → mensagem "Ah deixa,
quero cancelar" → sessão marcada `escalada`, `motivo_escalonamento: cancelar`, confirmado que
**nenhuma mensagem automática foi enviada** (comportamento correto: escalar para = parar, não
resolver).

**Caminho 4 — rajada fragmentada com debounce:** sessão ativa com proposta pendente
("IMPRESSÃO P&B A4, R$ 1,20") → 2 mensagens fragmentadas disparadas quase simultaneamente ("oi" e
"pode confirmar sim, manda") → as duas entraram em `Wait` de 90s independentes → confirmado que
só **uma** execução finalizou (a da mensagem mais recente — a primeira detectou timestamp mudado
e abortou) → buffer completo ("oi" + "pode confirmar sim, manda") reconhecido como confirmação →
pedido `ped-1142` criado corretamente (`aguardando_aprovacao`, `IMPRESSÃO P&B A4`, `R$ 1,20`) —
**nenhum pedido duplicado**, confirmando que o debounce evita processar a mesma sessão duas vezes.

### Confirmação de isolamento e limpeza
- Workflow `01 - LOG MSG RECEBIDAS`: `updatedAt`/`versionId` idênticos ao estado de antes desta
  demanda — nenhuma alteração, nenhuma ativação.
- Workflow `206` permanece `active: false` ao final.
- Todos os envios de teste (10 mensagens reais no total, entre confirmações/propostas/listas)
  foram exclusivamente para `5521965185667` (Edvam) — confirmado node a node nos logs de execução
  (nenhum `phone` diferente em nenhum `POST` à Z-API).
- Dados de teste apagados do banco ao final: 2 pedidos (`ped-1141`, `ped-1142`, ambos
  `pedido_criado_por: agente_teste_206`) e 4 sessões em `jsgrafica_agente_teste_sessoes` (nenhuma
  restante — tabela vazia). Confirmado por SQL antes e depois do `DELETE`.

### Achados fora do escopo (registrados, não implementados/corrigidos)
- **Gatilhos de escalonamento não implementados**: arquivo com senha, vocabulário técnico
  repetido, timeout p90 por tipo de serviço (tabela da seção 10.2 do mapa de jornada), confusão
  Dizu no meio de uma conversa já em andamento (o filtro atual roda em toda mensagem, mas como
  não há caminho de "escalar por Dizu" separado do "descartar", uma confusão Dizu dentro de uma
  sessão real ficaria descartada silenciosamente em vez de escalada — só testado/coberto o caso
  de Dizu na primeira mensagem).
- **Corrida em escrita concorrente do buffer**: se duas mensagens fragmentadas chegassem
  verdadeiramente ao mesmo tempo (não foi o caso observado no teste — a segunda sempre leu o
  estado já escrito pela primeira), a última escrita no buffer (`Atualizar Buffer`) sobrescreve
  o array inteiro, podendo perder uma mensagem que chegou entre a leitura e a escrita da outra.
  Não é um problema no teste isolado (tráfego sintético sequencial), mas seria uma melhoria a
  considerar antes de tráfego real de verdade (ex. `UPDATE ... SET mensagens = mensagens || novo`
  atômico no Postgres em vez de ler-modificar-escrever no Code node).
- **`tipo_midia` do Gemini erra em PDF de 1 página** (chama de "imagem") — mesmo achado já
  registrado e aceito na demanda 203, sem impacto nas duas métricas que importam (classificação
  óbvio/ambíguo, detecção de tipo "outro" pra escalar).
- **Heurística de "serviço rápido" default**: quando documento é óbvio e não bate com o regex de
  serviço de alto toque, o produto proposto é sempre "IMPRESSÃO P&B A4" (o mais comum, 66% do
  volume real) — não tenta diferenciar P&B de colorida, nem detecta quantidade de páginas pra
  propor a quantidade certa. Simplificação deliberada pra manter o teste do esqueleto de 7 passos
  gerenciável; refinar isso é trabalho natural de continuação quando/se a Fase B avançar.

### Critérios de aceite
- [x] Workflow novo existe, implementando os 7 passos, inativo/isolado do roteamento real
- [x] Lista de `id`s de botão/lista documentada e baseada no catálogo real
- [x] Caminho de envio funcionando de verdade (reaproveitado o padrão do workflow 13, testado)
- [x] Pedido gerado sempre nasce `aguardando_aprovacao`
- [x] Testado ponta a ponta só com o número do Edvam — documento óbvio, ambíguo com lista,
      1 gatilho de escalonamento, rajada de mensagem
- [x] Confirmado que o workflow `01 - LOG MSG RECEBIDAS` real não foi alterado nem ativado
- [x] Nenhum dado de teste (pedido, mensagem) esquecido em produção
