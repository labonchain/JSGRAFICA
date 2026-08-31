# 297 - Caminho C, passo 3: construir o workflow novo do agente

Status: concluída
Criada em: 2026-08-16
Aprovada em: 2026-08-18
Concluída em: 2026-08-18
Chat executor: 01 - N8N JS GRAFICA

## Contexto
Item 3 da sequência da demanda 292 (seção 7.7): construir o workflow novo do agente, usando
`@n8n/n8n-nodes-langchain.agent` (mesmo tipo de node que o `JSGRAFICA_ATENDIMENTO_AI` já usa,
prova de que funciona nesta conta n8n), prompt de sistema usando a régua de tom e o mecanismo de
contexto da demanda 291, ferramentas construídas na demanda 296 conectadas, MAIS o guardrail de
validação de saída (demanda 292, seção 7.4c) implementado desde o primeiro teste, não como reforço
depois de já estar rodando.

## Objetivo
Um workflow novo, completo, isolado (sem conectar no roteamento real do `01` ainda), que recebe
mensagem + contexto, decide por raciocínio o que fazer, chama as ferramentas certas, e nunca deixa
sair uma mensagem com valor sem a chamada de ferramenta correspondente ter acontecido no mesmo
turno.

## Escopo
- Incluído: prompt de sistema completo, reaproveitando a régua de correção de tom da demanda 291
  (mantém registro informal real, corrige só erro básico) e a fronteira definida na demanda 293
  (seções 2, 3 e 4: até onde a IA vai sozinha, quando aciona cada ferramenta, régua de escalação em
  2 camadas).
- Incluído: conectar as 9 ferramentas + trava Dizu construídas na demanda 296.
- Incluído: implementar o guardrail de validação de saída (demanda 292, seção 7.4c) - passo
  determinístico, código puro, que varre o texto de saída procurando padrão de valor (`R$` +
  dígitos) e confere se bate com alguma chamada de ferramenta do mesmo turno; se não bater, a
  mensagem é bloqueada e a conversa escala pro humano em vez de sair.
- Incluído: implementar o mecanismo de "a IA sabe onde a conversa está" (demanda 293, seção 6) - o
  workflow novo registra, na própria sessão dele, cada mensagem que ele mesmo mandou, desde o
  primeiro dia (a 293 já avisou: sem essa disciplina desde o início, o mecanismo de diferenciar
  IA de equipe simplesmente não funciona depois).
- Incluído: gating pela mesma tabela de whitelist (`jsgrafica_telefones_autorizados`) que o `206`
  já usa, mas SEM conectar no roteamento real do `01` nesta demanda - fica isolado, testável só sob
  chamada direta ao webhook, mesmo padrão cauteloso usado pro `206` original antes da demanda 274.
- Explicitamente fora de escopo: teste adversarial formal (é a demanda 298), conectar no `01`/
  roteamento de produção real, desligar ou alterar o `206` (continua congelado, rodando do jeito
  que está).

## Critérios de aceite
- [ ] Workflow novo existe, roda ponta a ponta pra pelo menos 1 caso de cada categoria da
      fronteira: IA sozinha (seção 2 da 293), IA aciona ferramenta (seção 3), IA escala (seção 4),
      retomada pós-escalação (seção 5, pelo menos 1 dos 3 cenários)
- [ ] Guardrail de validação de saída implementado e comprovado bloqueando de propósito 1 caso de
      teste onde o valor não bate com nenhuma chamada de ferramenta (prova negativa, não só teste
      de fluxo feliz)
- [ ] Mecanismo de registro do próprio envio implementado desde este workflow, não deixado pra
      depois
- [ ] `jsgrafica_contatos` e o `206` conferidos intactos ao final

## Riscos e cuidados
O guardrail de validação de saída não é opcional nem um reforço posterior, é critério de aceite
desta própria demanda. É o mecanismo que fecha o Risco 1 da demanda 292 (seção 7.4) - sem ele
comprovadamente funcionando, esta demanda não está concluída, mesmo que o resto do fluxo funcione
bem.

## Referências
Demanda 296 (ferramentas construídas, pré-requisito direto). Demanda 292 (seção 7.2, como o
padrão agente+ferramentas funciona; seção 7.4, riscos e mitigação, principalmente 7.4a-d). Demanda
293 (fronteira completa, insumo direto do prompt). Demanda 291 (régua de tom). `JSGRAFICA_ATENDIMENTO_AI`
(mesmo tipo de node, referência técnica de como configurar `@n8n/n8n-nodes-langchain.agent` nesta
conta).

## Relato de execução

- Pré-requisito descoberto e corrigido antes de começar: as ferramentas da demanda 296 estavam
  quebradas pela ponte de segurança da demanda 304 (header `X-App-Secret` obrigatório em toda
  rota `/api/*`) - os 3 nodes que chamam o app (`calcular-valor`, `mercadopago/cobranca`,
  cancelamento) voltaram a funcionar depois de configurar uma credencial nativa do n8n
  (`httpHeaderAuth`, nunca o valor do segredo solto num arquivo ou comando) e apontar os 3 nodes
  pra ela. Testado ponta a ponta (consulta, Pix real, cancelamento) antes de seguir pro resto da
  demanda.
- O que foi feito: workflow novo `297 - JSGRAFICA | CAMINHO C AGENTE (TESTE ISOLADO)` (34 nodes),
  isolado, webhook próprio (`caminho-c-agente`), sem nenhuma ligação com o roteamento real do `01`.
  Fluxo: valida entrada, checa whitelist (mesma tabela do `206`), gate de pré-turno Dizu (chama a
  ferramenta da 296), pré-passo `carregar_contexto_atendimento` (idem), monta o prompt de sistema
  combinando a régua de tom da demanda 291 (o que manter vs. o que corrigir) e a fronteira da
  demanda 293 (até onde a IA vai sozinha, quando aciona cada ferramenta, régua de escalação),
  aciona o node `@n8n/n8n-nodes-langchain.agent` (mesmo tipo do `JSGRAFICA_ATENDIMENTO_AI`,
  reaproveitando a mesma credencial Gemini já testada) com as 5 ferramentas de function-calling da
  296 conectadas (`consultar_preco_produto`, `criar_pedido_aguardando_aprovacao`,
  `gerar_cobranca_pix`, `processar_cancelamento`, `escalar_para_humano`), roda o guardrail de
  validação de saída, envia via Z-API só se passar, e grava o log com `enviado_por='ia'` (mesmo
  padrão da demanda 294) pra qualquer mensagem que sair, inclusive as bloqueadas pelo guardrail.
  Decisão deliberada: sem node de memória (`ai_memory`) - o contexto de conversa recente inteiro
  vem da `carregar_contexto_atendimento` e é injetado direto no prompt como texto estático, exatamente
  a janela fixa e pequena que a demanda 291 desenhou (nunca RAG), evitando também a dependência de
  conexão Postgres direta que já causou queda intermitente no `JSGRAFICA_ATENDIMENTO_AI`
  (achado da demanda 279).
- **Guardrail de validação de saída, funcionando de verdade**: código puro depois do agente, varre
  o texto de saída procurando padrão `R$` e, se achar, só deixa passar se o valor bater com o que
  alguma das 3 ferramentas de valor (`consultar_preco_produto`, `criar_pedido_aguardando_aprovacao`,
  `gerar_cobranca_pix`) realmente devolveu NESTA execução; se não bater, bloqueia e chama
  `escalar_para_humano` de verdade em vez de deixar a mensagem arriscada sair. Achado técnico real
  no caminho até funcionar: o node do agente (`ai_tool`) não fica acessível por `$('Nome').all()`
  a partir de um node comum depois dele (erro real: "No data found from `main` input", porque o
  dado da ferramenta vive na conexão `ai_tool`, não `main`) - corrigido ligando
  `returnIntermediateSteps: true` nas opções do agente, que passa a devolver o histórico de
  chamadas de ferramenta (`action.tool` + `observation`) dentro do próprio output principal do
  agente, aí sim acessível normalmente.
- **2ª extensão do guardrail, achado ao vivo durante o teste**: em mais de 1 teste real, a IA
  decidiu escalar mas só NARROU isso em texto ("vou te passar pra equipe") sem de fato chamar
  `escalar_para_humano` - a sessão nunca ficava marcada `escalada` de verdade. Corrigido com o
  mesmo princípio do guardrail de valor: se o texto soa como promessa de escalar sem a chamada real
  ter acontecido nesta execução, bloqueia e chama a ferramenta de verdade antes de responder.
- **Achado de conteúdo, corrigido**: o 1º teste institucional (pergunta de horário) mostrou a IA
  respondendo hora de funcionamento inventada, porque o prompt nunca tinha os dados reais fixos da
  gráfica. Corrigido com um bloco de fatos institucionais reais e confirmados (horário real de
  segunda a sexta, endereço, WhatsApp), com instrução explícita de nunca inventar o que não está
  nessa lista (ex. sábado), escalando pra equipe em vez disso.
- Testes realizados e resultado, cobrindo as 4 categorias pedidas nos critérios de aceite, todos
  reais via webhook (telefone/nome reais do Edvam, nunca fake, disciplina 283/291): **IA sozinha**
  (saudação, pergunta de horário respondida certo com os fatos fixos, pergunta de sábado escalada
  em vez de inventada). **IA aciona ferramenta** (preço real da XEROX COLORIDA A4, R$ 1,20,
  confirmado batendo com o catálogo, ferramenta chamada de verdade no `intermediateSteps`).
  **IA escala** (pedido de currículo chamou `escalar_para_humano` com `motivo: alto_toque` de
  verdade, telefone correto, nunca inventado). **Retomada pós-escalação** (cenário a da fronteira
  293): sessão marcada escalada por um teste, mensagem nova enviada logo em seguida,
  `carregar_contexto_atendimento` confirmado devolvendo `ultima_interacao_foi_escalada: true` e a
  IA respondendo normalmente (preço real cotado de novo), não travando nem repetindo a escalação
  por conta própria. **Guardrail bloqueando de propósito (prova negativa)**: testado com uma lane
  temporária isolada, alimentando a mesma lógica do guardrail direto (sem depender do LLM
  cooperar), 3 casos: valor no texto sem nenhuma ferramenta chamada (bloqueou), valor no texto
  DIVERGENTE do que a ferramenta realmente devolveu mesmo com a ferramenta tendo rodado (bloqueou,
  prova que o guardrail compara valor, não só "alguma ferramenta rodou"), valor batendo com a
  ferramenta (passou, controle positivo). Lane de teste removida antes do deploy final, workflow
  redeployado limpo e reconferido depois.
- Achados fora do escopo (relatados, não resolvidos por conta própria):
  1. A fronteira da demanda 293 (seção 4) pede "Alto Toque" como camada 1 determinística (gate de
     código, antes da IA processar), mas a demanda 296 só construiu esse gate pro Dizu, nunca pro
     Alto Toque. Nesta demanda, dado pessoal/currículo é reconhecido por julgamento da IA (camada 2,
     via prompt), não por um gate de código dedicado - funcionou nos testes reais, mas não é a
     garantia determinística que a 293 pedia. Candidato a demanda própria (construir o gate de
     Alto Toque na 296, mesmo padrão do Dizu).
  2. Desvio de design forçado por limitação real de plataforma: o plano original era o `telefone`
     de cada ferramenta vir sempre injetado pelo sistema (nunca da IA), pra garantir que a IA nunca
     pudesse errar o telefone de um pedido/escalonamento. Depois de várias tentativas reais (ver
     achado 3), o mecanismo que funcionou (`placeholderDefinitions` do node
     `toolHttpRequest`) só suporta campos preenchidos pela IA, não mistura com dado real do sistema
     no mesmo corpo. Mitigado com instrução explícita e repetida no prompt ("use SEMPRE o telefone
     real desta conversa, nunca invente outro") e reforçado pelo fato de as ferramentas da 296 já
     validarem posse/whitelist com o telefone recebido - mas não é mais a garantia estrutural
     original. Testado e confirmado que o telefone saiu certo em todos os testes reais desta
     demanda, sem nenhum caso de erro observado.
  3. Achado de plataforma n8n, não documentado em nenhum lugar interno antes: `@n8n/n8n-nodes-
     langchain.toolHttpRequest` não aceita `$fromAI(...)` dentro de uma expressão n8n normal
     (`={{ }}`) no corpo da requisição - tentativas com `jsonBody` como expressão única, com
     `bodyParameters` (modo keypair) e com `$fromAI` embutido deram 3 erros diferentes
     ("key cannot be empty" / "[object Object] não é JSON válido" / "Expected property name").
     O que funcionou de verdade: `placeholderDefinitions` (lista separada de nome/descrição/tipo)
     mais placeholders simples `{nome}` (sem chaves duplas, sem `$fromAI`) direto no `jsonBody`.
     Também tentado e abandonado: `@n8n/n8n-nodes-langchain.toolWorkflow` (mesmo padrão comprovado
     funcionando em outro workflow desta conta n8n, `OrganizAI ATENDIMENTO_AI`, replicado campo a
     campo) - sub-workflows criados via API sempre devolveram `"Workflow does not exist"` na hora
     de o agente chamar, mesmo existindo e sendo alcançável via `GET` direto; achado que
     `activeVersionId` desses sub-workflows fica `null` mesmo depois de salvar de novo via `PUT`
     (workflows só com `executeWorkflowTrigger` não têm como "ativar" pra ganhar esse campo pela
     API) - candidato a investigação própria se o Caminho C algum dia precisar desse tipo de
     sub-workflow.
  4. Confirmado, não resolvido: a IA às vezes precisa de mais de 1 turno pra decidir chamar
     `consultar_preco_produto` (às vezes faz uma pergunta de esclarecimento a mais antes, mesmo
     quando o produto já parecia claro o suficiente) - não é bug, é julgamento conversacional
     razoável, mas vale considerar na demanda 298 (teste adversarial) se isso atrapalha alguma
     jornada real.
- `jsgrafica_contatos` conferido intacto (Ninho, sem alteração) e `206` conferido intacto
  (`versionId` idêntico ao de sempre nesta sessão, 91 nodes, ativo) ao final. Toda sessão de teste
  apagada, nenhum pedido de teste ficou pendente (o único criado, `ped-3148`, foi durante a
  verificação do pré-requisito, já cancelado).
- Status final: concluída. Os 4 critérios de aceite da fronteira testados com evidência real,
  guardrail de valor comprovado bloqueando de propósito (prova negativa isolada do LLM) e
  funcionando no fluxo real, guardrail estendido pra também cobrir promessa de escalar sem chamada
  real (achado ao vivo, não estava no escopo original mas é o mesmo princípio), mecanismo de
  registro do próprio envio (`enviado_por='ia'`) implementado desde este workflow. `206` e
  `jsgrafica_contatos` intactos. Nenhum agente conectado ao roteamento real, fora de escopo
  mantido. 4 achados fora do escopo relatados acima, nenhum bloqueia a 298 seguir em frente.
