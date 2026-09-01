# 363 - Investigar: Status agendado tem menos view que manual, e contador do painel parece errado

Status: aprovada
Criada em: 2026-08-31
Aprovada em: 2026-08-31
Concluída em: (vazio até conclusão)
Chat executor: 07 - MARKETING JS GRAFICA (propor sub-tarefa ao 01-N8N ou 02-DADOS se precisar
mexer em workflow ou schema durante a investigação)

## Contexto
Relato real do Admin (Edvam, 31/08), 2 observações juntas:
1. Status postado via agendamento (Marketing → Conteúdo, fila do LabOnchain) recebe menos
   visualização do que Status postado manualmente pelo celular.
2. O contador de visualizações no painel (demanda 345, coluna "👁️ Viram") parece incorreto —
   não bate com a média real de visualização que a gráfica tem, mesmo considerando a diferença
   do item 1.

**Pesquisa preliminar do PM (documentação pública)**: não encontrei nenhuma evidência de que a
Meta/WhatsApp reduza deliberadamente o alcance de Status postado via API/automação comparado a
postado manualmente pelo app. Não é algo documentado nem confirmado por terceiros. Não descartar,
mas não tratar como causa provável sem dado real.

**Achado ao reler o histórico técnico do contador (demanda 345)**: o teste de aceite da própria
345 já registrou um post com **213 visualizações reais** no momento do teste — número alto pra
base de cliente da gráfica, mas não é prova de bug sozinho (JS Gráfica tem 1.500+ pedidos
históricos, muitos contatos podem ter o número salvo e ver o Status passivamente, sem
engajamento ativo). A lógica de contagem (`jsgrafica_contar_visualizacoes_status`,
`count(distinct participant)` batendo `ids` via jsonb contra o `messageId` do post) foi desenhada
com cuidado pra deduplicar reenvio de callback, mas nunca foi validada contra um número de
referência independente (ex.: o próprio WhatsApp mostrando quantos visualizaram nativamente).

## Objetivo
Confirmar ou descartar, com dado real, se: (a) existe diferença real e sistemática (não ruído)
entre visualização de Status agendado vs. manual, e por quê; (b) o contador do painel está
calculando certo.

## Escopo
Incluído:
- Levantar dado real: comparar visualizações registradas (via `jsgrafica_status_visualizacoes`)
  entre posts feitos via agendamento (têm `messageId` em `labon_status_queue`) vs. qualquer sinal
  disponível de post manual (pode não existir dado direto — documentar essa limitação se for o
  caso, não inventar comparação sem dado).
- Validar a lógica de correlação/deduplicação da função `jsgrafica_contar_visualizacoes_status`
  contra um caso real conhecido (ex.: pedir pro Edvam checar quantas pessoas visualizaram um
  Status específico direto no WhatsApp dele — o app mostra isso nativamente — e comparar com o
  número do painel pro mesmo post).
- Investigar se há duplicação/inflação na gravação (`jsgrafica_status_visualizacoes`), incluindo
  se o mesmo evento pode gerar mais de uma linha com `participant` ligeiramente diferente (ex.
  formato de LID variando) que escaparia do `count(distinct participant)`.
- Se a causa for técnica (bug de contagem, ou diferença real de horário/alcance), propor
  correção. Se não houver explicação técnica encontrada, reportar como achado sem causa
  confirmada, não inventar explicação.

Explicitamente fora de escopo: mudar a estratégia de quando/como postar Status (isso é decisão de
conteúdo, não desta investigação).

## Critérios de aceite
- [ ] Comparação de visualização agendado vs. manual documentada com dado real (ou limitação
      documentada, se não houver dado direto disponível).
- [ ] Contador do painel validado contra pelo menos 1 caso real de referência independente.
- [ ] Causa raiz encontrada e corrigida, OU achado sem causa confirmada reportado com honestidade.

## Referências
`pm/demandas/340-*.md` (investigação original de picos), `pm/demandas/342-*.md` (tabela),
`pm/demandas/344-*.md` (workflow gravando o log), `pm/demandas/345-*.md` (contador no painel,
achado dos 213 views).

## 🔴 Achado urgente, escalado em 2026-08-31 (prioridade máxima, à frente da 361)

Achado muito mais grave do que "contador errado". O Edvam confirmou com evidência visual direta
(print do celular de um cliente real): **Status postado via API não chega pra todos os
contatos**. Nesse caso específico, o cliente só vê 3 Status (todos postados manualmente do
aparelho da gráfica), nenhum dos postados via API aparece pra ele. No celular do próprio Edvam,
todos aparecem (via API e manual).

**Pesquisa do PM**: a documentação da Z-API pro envio de Status (`send-text-status`/
`send-image-status`) não tem nenhum parâmetro de audiência/privacidade/lista de contato — só
aceita a mensagem. Ou seja, a visibilidade deveria depender só da configuração de Privacidade >
Status da conta (WhatsApp Settings), igual pra qualquer Status, API ou manual.

**Hipótese mais provável (não confirmada, precisa validar)**: ferramentas de automação de
WhatsApp não-oficiais (como a Z-API) operam via "dispositivo vinculado" (mesmo mecanismo do
WhatsApp Web). A lista de contatos sincronizada nesse dispositivo vinculado pode estar
desatualizada/incompleta em relação à lista real do aparelho principal, fazendo o Status
distribuído via essa sessão não alcançar contato que foi salvo ou mudou depois da última
sincronização daquele dispositivo vinculado. Isso explicaria alcançar uns contatos e não outros
de forma consistente, mesmo com a mesma configuração de privacidade.

**Investigação necessária, com prioridade sobre o resto da 363**:
1. Confirmar a configuração de Privacidade > Status da conta da gráfica (deveria ser "Meus
   contatos" ou lista explícita incluindo a base real de clientes).
2. Perguntar direto ao suporte da Z-API se existe limitação conhecida de sincronização de
   contatos pra distribuição de Status via dispositivo vinculado (mesmo padrão de pergunta que
   resolveu a dúvida do Canal, ver `guia-canal-whatsapp-automacao.md`).
3. Verificar se existe algum endpoint/ação pra forçar resync de contatos na instância Z-API.
4. Cruzar: o contato do print (que não recebe via API) é um contato recente, ou teve o número
   trocado/reimportado recentemente? Comparar com um contato antigo que recebe normalmente.
5. Se confirmado que é sincronização de contato do dispositivo vinculado, propor mitigação (forçar
   resync periódico, reconectar a instância, ou limitação documentada como conhecida se não tiver
   solução).

Isso é uma questão de alcance real de negócio (cliente que deveria ver divulgação e não vê),
mais urgente que a qualidade visual das peças (361). Investigar isso primeiro.

## Investigação em andamento (31/08/2026, achado urgente)

Achado real e forte, ainda não 100% conclusivo (falta 2 dados do Edvam pra fechar):

1. Endpoint real da Z-API `/contacts` (paginado, não documentado antes) devolve a lista de
   contatos "sincronizados" pelo dispositivo vinculado. Total na instância ativa hoje: **1.717**.
2. Contra amostra de 1.000 contatos individuais reais da mesma instância ativa
   (`jsgrafica_contatos`): **658 (65,8%) NÃO aparecem** na lista sincronizada da Z-API. Mediana de
   `data_primeiro_contato` quase igual entre quem tem sync e quem não tem (não é só contato
   novíssimo) — sugere teto persistente de sincronização, não atraso temporário.
3. Achado colateral: `jsgrafica_contatos` tem 2 `instance_id` diferentes (686 de instância antiga,
   jan-mar/2026; 2.332 da instância ativa), confirma troca de instância no passado, mas não
   explica sozinho o gap de 65,8% dentro da instância ativa.
4. Hipótese mais consistente com o dado (NÃO confirmada de forma direta, sem documentação pública
   nem contato com suporte Z-API ainda): a lista de `/contacts` provavelmente reflete o catálogo
   de contatos salvos, não a lista de conversas, e a maioria dos clientes da gráfica nunca foi
   salva formalmente como contato no telefone, só troca mensagem.
5. Achado secundário sem relação direta investigada ainda: pelo menos 1 registro em
   `jsgrafica_contatos` tem `phone` guardando um LID (`211532055101588@lid`) em vez de telefone
   real, mesma família de bug de resolução LID já vista antes neste projeto (ex. demanda 266).

**Bloqueado, precisa de 2 dados do Edvam pra fechar com certeza**:
- Configuração real de Privacidade > Status no WhatsApp dele (Meus contatos / lista customizada /
  Todos).
- Telefone real do cliente do print (pra cruzar direto contra os 1.717 sincronizados, sem
  depender de amostra).

Scripts usados (mantidos no repo, só leitura): `scripts/probe-363-contatos-privacidade-status.ts`,
`scripts/probe-363-contagem-contatos.ts`, `scripts/probe-363-paginacao-contatos.ts`,
`scripts/probe-363-contatos-completo.ts`, `scripts/probe-363-schema-contatos.ts`,
`scripts/probe-363-instance-id-distribuicao.ts`, `scripts/probe-363-cruzamento-sync.ts`.

## ✅ Causa raiz CONFIRMADA com caso real (31/08/2026)

Telefone real do cliente do print recebido do PM: `+55 81 9849-5607` (contato "Zuzeide" em
`jsgrafica_contatos`, 72 interações reais, primeiro contato 28/02/2026, última interação
26/08/2026, cliente recorrente atendida por Edvam/Zu/Gabi várias vezes).

Cruzamento direto (`scripts/probe-363-cruzar-cliente-real.ts`): esse telefone **NÃO está** entre
os 1.717 contatos sincronizados pela Z-API. Bate exatamente com o relato do Edvam: cliente real e
ativa que a gráfica reconhece, mas que o dispositivo vinculado nunca sincronizou como contato.

**Causa raiz confirmada**: Status postado via API só alcança quem está na lista de contatos
sincronizada pelo dispositivo vinculado da Z-API (1.717), não todo cliente que já trocou mensagem
real com a gráfica (3.032 no total, ~2/3 dos contatos ativos ficam de fora dessa sincronização).
Status postado manualmente do celular não depende dessa sincronização, por isso alcança todo
mundo normalmente. Isso explica o relato original do Edvam sem precisar de nenhuma hipótese sobre
a Meta reduzir alcance de post via API (hipótese descartada por falta de evidência, ver início do
documento).

**Mitigação, ainda sem solução confirmada**: testado só GET (nenhuma escrita em produção) contra
candidatos de endpoint de resync. `/contacts/sync`, `/contacts/update`, `/contacts/refresh`
devolvem `200: null` em vez de erro "not found" (diferente dos outros candidatos testados),
sugerindo que existem de verdade e esperam `POST`. Não testado com `POST` porque pode ter efeito
colateral real na sessão WhatsApp conectada em produção (risco de derrubar a conexão real da
gráfica) — decisão repassada ao 01-N8N, que cuida da infraestrutura da instância.

**Ainda em aberto**: configuração de Privacidade > Status do Edvam (pedida, não recebida ainda) —
pode reduzir o problema mas não é mais crítica pra confirmar a causa raiz, que já está confirmada
pelo caso real da Zuzeide.

Script usado: `scripts/probe-363-cruzar-cliente-real.ts`, `scripts/probe-363-endpoints-resync.ts`
(ambos mantidos no repo, só leitura).

## Contribuição do 01-N8N (31/08/2026, à pedido do PM, investigação ainda do 07-Marketing)

Avaliei os 3 candidatos de endpoint de resync que o 07-Marketing achou
(`/contacts/sync`/`/contacts/update`/`/contacts/refresh`, todos `200: null`, sem confirmar
POST): **nenhum tem documentação oficial da Z-API**, o `200: null` é ambíguo, não confiaria sem
confirmação externa.

**Achado melhor**: existe um endpoint DOCUMENTADO que resolve o problema de forma mais direta -
`POST /contacts` ("Adicionar contatos" - "Salva contatos do WhatsApp na lista de contatos do
celular"), aceita lote (array de `{firstName, lastName, phone}`). Em vez de "ressincronizar" o
dispositivo vinculado de forma genérica, dá pra alimentar direto os contatos reais da gráfica
(`jsgrafica_contatos`) que não estão nos 1.717 sincronizados. Ressalva real achada na própria doc:
"o método de adicionar contatos só funciona pra contas que já receberam a atualização
necessária" - pode nem estar disponível nesta conta/plano.

**Não testei nenhum POST** (nem os 3 candidatos, nem o `/contacts` documentado) - o Edvam já
mandou 3 perguntas pro suporte da Z-API (Igor Mendes) antes de qualquer teste real em produção,
aguardando resposta.

**Detalhe técnico passado ao Igor (via PM), sobre como o Status é postado hoje** - endpoint exato
usado pelo node real `Fila: Enviar Status Z-API` do workflow compartilhado `LABON_STATUS`:
`POST {zapi_url instância}/send-text-status` (ou `-image-status`/`-video-status`), headers
`Client-Token`+`Content-Type`, body só com `message`/`image`+`caption`/`video`+`caption` conforme
o tipo - **confirmado que não existe nenhum campo de audiência/privacidade/lista de contato no
payload**, bate com a pesquisa anterior do PM.

## ✅ Parte 2 (contador do painel), causa raiz encontrada (31/08/2026)

Pedido do Edvam: revisar o contador de visualizações do painel (`👁️ Viram`), número diferente do
que aparece no WhatsApp de verdade.

### Investigação real (dado, não suposição)

1. **A função RPC `jsgrafica_contar_visualizacoes_status` calcula `count(distinct participant)`
   corretamente.** Testado isolado: id inventado devolve 0, ids reais devolvem exatamente o mesmo
   número que uma contagem manual de `participant` distintos feita por fora da RPC. Não há bug na
   lógica de deduplicação em si.
2. **A hipótese original da demanda (participant com formato ligeiramente diferente escapando o
   `distinct`) foi testada e NÃO se confirmou**: comparando 2 posts publicados com 1h de
   diferença, 88,7% dos participants do post mais novo já tinham aparecido no post anterior
   (overlap alto e estável), e não achei nenhum par de participants com só 1-2 caracteres de
   diferença que sugerisse variação de formato do mesmo identificador.
3. **Achado real, confirmado com exemplo concreto**: a tabela `jsgrafica_status_visualizacoes`
   grava, por evento de callback, um array `ids` que às vezes contém **múltiplos message_id ao
   mesmo tempo numa linha só** (distribuição real: a maioria das 25.366 linhas tem 1 id, mas 75
   linhas têm 2, e um grupo tem até **13 ids na mesma linha**). Exemplo real inspecionado: 1 linha
   (1 `participant`, 1 `momment` só) com 13 ids que correspondem a 13 posts reais da JS Gráfica
   publicados ao longo de **24 horas inteiras** (28/08 12h05 até 29/08 12h06).
4. **Interpretação mais provável**: isso bate com o comportamento real de recibo de leitura em
   lote do WhatsApp pra Status — quando alguém abre o anel de Status da gráfica depois de um
   tempo sem ver, o WhatsApp mostra e credita como "visto" TODOS os Status pendentes daquele
   contato numa tacada só, e o callback chega como 1 evento com vários `ids` juntos. Como a
   gráfica posta Status com frequência alta (praticamente de hora em hora, não 3x/dia como o
   Canal), qualquer pessoa que "dá uma olhada" no status da gráfica uma vez por dia acaba sendo
   creditada como visualização em cada um dos vários posts publicados desde a última vez que ela
   olhou, não só no post mais recente.
5. Isso explica os ~800-1000 "distintos" por post (estável, não é ruído: bateu com contagem
   manual) e também explica o relato original do Edvam: Status manual, postado raramente, não tem
   esse efeito de "acúmulo" (a pessoa vê 1 post isolado, sem backlog acumulado), enquanto Status
   automatizado de alta frequência infla o número de CADA post individual com o crédito de visitas
   que na prática são "vi o conjunto do dia", não "vi esse post específico".

### Conclusão

Não é bug de contagem/deduplicação (isso está certo). É uma questão de **o que o número
realmente significa**: hoje o painel mostra algo mais parecido com "quantas pessoas tinham este
post na leva de status vistos numa sessão" do que "quantas pessoas viram isoladamente este post",
efeito que só aparece de forma visível por causa da cadência alta de postagem. Não encontrei
evidência de duplicação de dado gravado incorretamente (o dado bruto reflete o que a Z-API/
WhatsApp realmente reportou), então não há "correção" de bug de banco a aplicar aqui.

**Não é decisão minha fechar sozinho**: fica pro Edvam/PM decidir o que fazer com esse
entendimento novo, por exemplo: (a) mostrar o número como está mas com uma nota explicando a
natureza cumulativa, (b) pedir ao 01-N8N pra avaliar se dá pra refinar a correlação (ex.: só
creditar o post mais próximo do momento do evento, não todo o backlog) — mudança de workflow, fora
do meu domínio, ou (c) aceitar que o número é mais um indicador de alcance agregado do que de
engajamento por peça isolada, e não tratar como bug.

Scripts usados (mantidos no repo, só leitura):
`scripts/investigacao-363-contador-views.ts`, `scripts/investigacao-363-schema-queue.ts`,
`scripts/investigacao-363-contador-v2.ts`, `scripts/investigacao-363-verificar-rpc.ts`,
`scripts/investigacao-363-fix-query.ts`, `scripts/investigacao-363-contador-v3.ts`,
`scripts/investigacao-363-overlap-participantes.ts`, `scripts/investigacao-363-fanout.ts`,
`scripts/investigacao-363-linhas-multi-id.ts`.

## ⚠️ Correção da conclusão anterior (31/08/2026, reaberto pelo Edvam com dado real)

A explicação "não é bug, é acúmulo de recibo de leitura em lote do WhatsApp" (seção acima) estava
**errada**. O Edvam mandou os números reais do WhatsApp nativo dele (print de hoje) e o
cruzamento direto por horário/messageId real derruba essa teoria.

### Cruzamento real, 6 posts de hoje (31/08), casados por horário exato

| Horário | Real (WhatsApp) | Painel (RPC) | Proporção |
|---|---:|---:|---:|
| 15:06 | 45 | 892 | 19,8x |
| 14:06 | 58 | 814 | 14,0x |
| 13:06 | 74 | 908 | 12,3x |
| 12:06 | 93 | 955 | 10,3x |
| 11:05 | 107 | 855 | 8,0x |
| 10:05 | 114 | 981 | 8,6x |

**A teoria de "acúmulo de backlog" previa que posts mais antigos (mais tempo pra alguém "catch
up") teriam contagem mais alta que posts recém-publicados. Não é isso que acontece**: o post das
15:06 (publicado minutos antes do print) já mostrava 892 no painel, quase igual ao post das 10:05
(981, 5h mais velho). Se fosse acúmulo real ao longo do tempo, um post de poucos minutos não
teria como já estar em ~900.

### Achado real (isolado com precisão)

Testei separar as linhas de `jsgrafica_status_visualizacoes` em "linha limpa" (array `ids` com
EXATAMENTE 1 elemento, igual ao message_id exato, sem nenhum fan-out) vs "qualquer linha que
contém esse id". Resultado: **quase toda a inflação já vem das linhas limpas, sem fan-out
nenhum** (ex.: post das 15:06, contagem limpa = 891 contra RPC = 892, praticamente igual). Ou
seja, o achado anterior sobre linhas com vários `ids` (até 13 numa linha) **não é a causa
principal** da inflação — existem mesmo ~800-1000 linhas distintas na tabela, cada uma apontando
só pra esse 1 message_id específico, uma por uma, sem fan-out.

### Hipótese real mais forte agora

Isso é muito mais consistente com **contaminação de correlação no workflow compartilhado** (`03 -
STATUS MSG`, que processa callback de visualização de Status pra vários clientes LabOnchain na
mesma fila, achado técnico já documentado antes neste projeto, ver `project_log_dados_
contaminados.md`/`project_contaminacao_dizu_refeicoes.md` da memória do workspace) do que com
comportamento real do WhatsApp: o workflow provavelmente correlaciona um evento de visualização
recebido (que pode nem ser da JS Gráfica) contra "qual é o message_id mais recente/atualmente
monitorado da JS Gráfica" no momento do processamento, em vez de identificar corretamente qual
status especifico o evento realmente é sobre. Como a gráfica troca de "post mais recente" de hora
em hora, cada post novo passa a acumular ~800-1000 eventos por hora inteira que estava "no ar"
como o mais recente, explicando por que todos os 6 posts de hoje mostram magnitude parecida (800
a 980) independente da idade real do post.

**Não é decisão nem execução minha corrigir isso**: o mecanismo real está na lógica de correlação
do workflow `03 - STATUS MSG` (ou workflow relacionado da fila compartilhada), fora do meu
domínio e da minha visibilidade direta (não tenho acesso ao n8n). Repasso ao 01-N8N pra
investigar a lógica de correlação de verdade (não só a query SQL, que já confirmei estar correta)
e considerar se é isolamento por instância/conta que está faltando no `join`/correlação do
workflow.

Peço desculpa pela conclusão anterior errada, publicada antes de ter o número real de referência
pra comparar — reforça a importância de não fechar um achado técnico sem validar contra um dado
de fora do próprio sistema, exatamente o que o critério de aceite original desta demanda já
pedia.

Scripts novos usados nesta correção (mantidos no repo, só leitura):
`scripts/investigacao-363-bater-numero-real.ts`, `scripts/investigacao-363-bater-numero-real-v2.ts`,
`scripts/investigacao-363-bater-numero-real-v3.ts`, `scripts/investigacao-363-isolar-bug-real.ts`.

## Segunda contribuição do 01-N8N (31/08/2026) - inflação de 8-20x no contador

Pedido do PM: confirmar se a Z-API gera `messageId` de verdade nas postagens de Status via fila
(pergunta do suporte, Igor). Confirmado com execução real (`1751621`, 31/08 19:05h): sim, resposta
real `{"zaapId":"...","messageId":"3EB0B6529F699D2E924791",...}`, salvo em
`labon_status_queue.response_zapi` (não é coluna própria), e esse mesmo valor aparece de fato em
`jsgrafica_status_visualizacoes.ids` (983 linhas correlacionadas, `created_at` logo depois da
publicação).

**Investigação da hipótese de cross-atribuição (7 - Marketing achou inflação real de 8x a 20x
comparando painel vs. tela real "Meu status" do WhatsApp)**: pedido do PM pra confirmar/descartar
a hipótese de que o workflow compartilhado atribui evento de visualização de outro cliente
LabOnchain ao `message_id` mais recente da JS Gráfica.

- **Hipótese descartada pelo código**: inspecionei o node real que grava
  (`Gravar Visualização Status`, workflow `03 - JSGRAFICA | STATUS MSG`, `hg12ud3yo5mTu3XI`) - só
  grava `participant`/`ids`/`status`/`momment` direto do `body` do webhook recebido, sem nenhuma
  lógica de "atribuir ao mais recente monitorado". Não existe mecanismo no nosso código que possa
  causar esse tipo de erro de atribuição.
- **Achado real que explica a magnitude**: peguei 1 `participant` (`246226230501536`) presente
  nos 2 posts mais recentes comparados e vi o histórico completo dele - tem 1 linha de
  "visualização" pra praticamente TODO post publicado nas últimas 72h (28/08 a 31/08), quase hora
  a hora, sem falhar. Padrão mecânico, não é comportamento humano real. Confirmado com contagem:
  900 participantes distintos no post de 19h, 894 no de 18h, **802 (89%) aparecem nos dois** -
  praticamente o mesmo conjunto de "IDs fantasma" grudado em cada post novo, explicando por que
  todos os 6 posts convergem pro mesmo patamar (~800-1000) independente da idade.
- **Nova hipótese, mais bem embasada, mas fora do nosso código**: o callback `status@broadcast`/
  `MessageStatusCallback` da Z-API pode não representar "visualização real confirmada" - pode
  estar mais próximo de "contato sincronizado/que deveria receber", reenviado ou reafirmado a cada
  post novo. Reforço: a magnitude (~900) é próxima do total de contatos sincronizados pelo
  dispositivo vinculado que a própria 363 já tinha achado antes (1.717) - possível vazamento da
  lista de sincronização pro callback de visualização, não confirmado sem resposta da Z-API.
- **Recomendação**: perguntar direto ao Igor (mesmo padrão já usado nesta investigação) - "o
  callback de status view reflete visualização real e individual confirmada, ou pode incluir
  contato que só está na lista sincronizada, mesmo sem ter aberto o Status? Existe
  reenvio/repetição do mesmo evento em cada nova postagem?"

## ⚠️ Correção de terminologia, parte 1 reaberta (31/08/2026, correção direta do Edvam)

O Edvam corrigiu: **não existe conceito de "contatos sincronizados" na Z-API**. Minha
interpretação anterior do endpoint `/contacts` ("lista sincronizada por dispositivo vinculado")
era invenção minha em cima do dado, não algo documentado ou real da Z-API. Corrijo com honestidade.

### O que o endpoint `/contacts` realmente é (documentação oficial da Z-API, pesquisada agora)

A doc oficial (`developer.z-api.io/en/contacts/get-contacts`) não detalha a fundo, mas a
distinção que a própria Z-API faz entre `get-chats` e `get-contacts` esclarece: **`get-chats`
traz todo mundo com quem já existe conversa aberta; `get-contacts` traz os contatos que têm
WhatsApp E estão salvos na agenda do telefone, mais quem participa de grupo com o número.** Não
tem nada a ver com "sincronização de dispositivo vinculado desatualizada", é simplesmente o
conceito real de "contato salvo na agenda", que a Z-API só consegue ler porque opera como
WhatsApp Web (limitação documentada: "Z-API só consegue fazer o que o WhatsApp Web consegue com
contatos").

### O que isso muda na causa raiz

O dado empírico continua real e válido: **o telefone da cliente real (Zuzeide, 72 interações)
não aparece nos 1.717 registros de `/contacts`**, e 65,8% de uma amostra de contatos ativos reais
também não aparecem. Isso agora deve ser lido como "não estão salvos na agenda do telefone da
gráfica", não como "sincronização atrasada".

Pesquisei a regra oficial de privacidade "Meus contatos" do Status do WhatsApp: ela é **mútua**,
só mostra o Status pra quem SALVOU seu número E que você também salvou. Isso levanta uma dúvida
real que ainda não resolvi: se essa regra mútua vale igual pra post manual e via API (mesma
conta, mesmo número), o esperado seria a cliente não ver NENHUM dos dois tipos de Status, não só
o via API. Como ela vê os manuais, tem alguma diferença real entre os 2 caminhos de postagem que
ainda não identifiquei o mecanismo exato.

**Não fecho mais isso como causa raiz confirmada.** Fica como achado real (dado verídico) sem
mecanismo causal 100% comprovado ainda, honestamente reportado.

### Próximos passos concretos propostos (nenhum executado ainda, aguardando decisão)

1. Pedir ao Edvam pra checar diretamente no telefone da gráfica se o número da Zuzeide está
   salvo na agenda de contatos do aparelho (não no WhatsApp, na agenda do telefone mesmo) — se
   não estiver salva, bate exatamente com o que `/contacts` mostrou, confirma que o endpoint
   reflete agenda real do telefone.
2. Perguntar direto ao suporte da Z-API (não documentação pública, que já se mostrou incompleta
   nesse ponto) se existe alguma diferença conhecida de audiência de Status entre `send-text-
   status`/`send-image-status` via API e postagem manual pelo app, mesma conta.

Scripts e achados anteriores desta seção continuam válidos como DADO (contagem real de `/contacts`,
gap de 65,8%, caso da Zuzeide), só a interpretação causal foi corrigida.

## Reconfirmação rigorosa do caso Zuzeide (31/08/2026)

Edvam confirmou que a Zuzeide está salva na agenda REAL do telefone da gráfica. Isso quebra
também a interpretação "`/contacts` = WhatsApp + agenda do telefone". Refiz a busca do zero, com
mais rigor:

- Baixei as 18 páginas de novo, do zero (não reaproveitei nada de rodada anterior), total
  confirmado: **1.720 contatos**.
- Busquei o telefone dela em 5 variações de formato diferentes (com/sem 9 extra, com/sem DDI):
  nenhuma bateu.
- Busquei por substring `8495607` em QUALQUER campo (telefone, nome, vname): zero resultado.
- Busquei por nome "Zuzeide" (case insensitive) em qualquer campo de nome: zero resultado.
- Confirmei que não há duplicata mascarando o total (1.720 telefones baixados = 1.720 telefones
  distintos).

**Conclusão honesta**: ela não está em `/contacts` de nenhuma forma que eu consiga detectar de
fora, mesmo estando comprovadamente salva na agenda real do telefone. As 2 interpretações que já
tentei (sincronização de dispositivo vinculado; contato salvo na agenda) foram ambas refutadas
por este caso real. Não vou propor uma 3ª hipótese sem mais dado — isso já passou do que dá pra
resolver só testando o endpoint de fora. **Recomendação: abrir chamado direto com o suporte da
Z-API**, com esse caso real e específico (telefone, confirmação de que está salvo na agenda,
ausência confirmada em `/contacts` mesmo em busca exaustiva), pedindo a eles a explicação real de
por que isso acontece. Isso não é algo que dá pra resolver só por fora com mais teste empírico
meu.

Script desta reconfirmação: `scripts/investigacao-363-reconfirmar-zuzeide.ts` (mantido no repo).

## Mecanismo real do contador achado, e simulação da correção (31/08/2026)

O Edvam pediu pra entender exatamente como o contador é calculado. Ganhei acesso de leitura ao
n8n (MCP disponível nesta sessão) e fui direto no workflow real.

### Como funciona hoje, de verdade

Workflow **"03 - JSGRAFICA | STATUS MSG"**, node **"Gravar Visualização Status"**: grava em
`jsgrafica_status_visualizacoes` exatamente o que a Z-API manda no callback, sem nenhuma
validação:

```
participant = body.participant || body.phone
ids         = body.ids        (copiado direto do payload, sem filtro nenhum)
status      = body.status
momment     = body.momment
```

O painel depois conta, pra cada post, quantos `participant` distintos têm aquele `message_id` em
algum lugar do array `ids` deles.

### Simulação da correção proposta ANTES de mexer em qualquer coisa (pedido do Edvam)

Propus antes: gravar só o 1º id do array em vez do array inteiro. Simulei 2 variações contra os
dados reais já existentes na tabela (nenhuma escrita, nenhuma mudança de workflow):

- **Simulação A**: usa sempre `ids[0]` (primeiro item do array).
- **Simulação B**: usa, dentre os ids do array, o que corresponde ao post publicado mais perto no
  tempo do momento do evento (heurística "provavelmente é esse que a pessoa estava vendo").

**Resultado, 6 posts reais de hoje, comparando com o número real do WhatsApp:**

| Horário | Real | Painel hoje | Sim A (1º id) | Sim B (mais próximo) |
|---|---:|---:|---:|---:|
| 15:06 | 45 | 921 | 921 | 920 |
| 14:06 | 58 | 825 | 823 | 823 |
| 13:06 | 74 | 911 | 910 | 910 |
| 12:06 | 93 | 958 | 957 | 956 |
| 11:05 | 107 | 860 | 860 | 860 |
| 10:05 | 114 | 983 | 983 | 983 |

**A correção proposta NÃO funciona.** As 2 simulações dão resultado praticamente idêntico ao
número atual (bugado). Isso prova que o problema NÃO é "1 evento sendo creditado em vários ids"
(a maioria das linhas já tem só 1 id, confirmado antes na investigação) — existem mesmo ~900
linhas distintas na tabela, cada uma com participant diferente, atribuídas só àquele 1
message_id, e a esmagadora maioria delas não é visualização real do post específico.

### Onde isso deixa a investigação

O problema está mais fundo do que "qual id escolher dentro do array" — está em **por que a
Z-API está mandando ~900 eventos de visualização por hora pra esse webhook**, quando o WhatsApp
nativo mostra 45-114 visualizações reais. Não vou propor mais uma hipótese sem dado novo, dado
meu histórico nesta mesma investigação de já ter errado 2 vezes seguidas. Preciso de acesso ao
CONTEÚDO CRU de um payload real recebido pelo webhook (não só os 4 campos que o workflow já
extrai) pra entender o que está vindo de verdade — isso exigiria uma mudança pequena e aditiva no
workflow (logar o corpo bruto por um tempo, sem mudar o comportamento atual), que cabe ao 01-N8N
avaliar e aplicar com segurança.

Script desta simulação: `scripts/investigacao-363-simular-correcao.ts` (mantido no repo, só
leitura).

## Relato de execução
(preenchido pelo 07-Marketing ao concluir)
