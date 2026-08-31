# Histórico do projeto, Integração WhatsApp / n8n / Supabase / Caixa

Linha do tempo reconstruída em 2026-07-02, combinando o relato do Edvam com evidências
verificadas no código, no Supabase e no n8n. Marcado por fonte:
- 🗣️ = relato direto do Edvam (não verificado tecnicamente, mas assumido como verdadeiro)
- ✅ = verificado tecnicamente (código, DB, ou n8n) nesta sessão
- ❓ = hipótese, ainda não confirmada

## Fase 1, Agente de log (início do ano)

🗣️ Primeiro projeto: um agente de WhatsApp que só fazia **log** de tudo que passava:
sem responder ninguém.

✅ Consistente com o volume de mensagens em `jsgrafica_log_msgs_privadas`: Jan/2026 = 6.542,
Fev/2026 = 10.914, Mar/2026 = 10.992 msgs, volume alto e constante, típico de logging puro.

❓ **Hipótese importante, ainda sem confirmação de origem exata:** olhando o conteúdo de
mensagens de maio/2026 (ver `investigacoes/2026-07-02-integracao-whatsapp-zapi-n8n.md`),
há conversas completamente estranhas ao ramo de gráfica rápida (um bot de controle de gastos
pessoais, uma negociação de produção/logística entre RJ e SP para "dia das mães"). Isso sugere
que a mesma instância Z-API (`3EFA4C62C755F07164E46237BF5854B6`) e/ou as mesmas tabelas
`jsgrafica_*` podem ter recebido tráfego de outro número/outro negócio em algum momento:
não necessariamente por má-fé, pode ser reuso de instância de teste, número emprestado, etc.
**Ainda não sabemos a causa exata**, isso é candidato a investigação, não conclusão.

## Fase 2, Tentativa de atendimento automático (meados do ano)

🗣️ Depois do log, tentaram fazer o agente **responder** os clientes (IA). Deu erro, e o
projeto não avançou nessa frente.

✅ Consistente com o workflow `JSGRAFICA_ATENDIMENTO_AI` existir, estar construído (Gemini +
RAG + memória Postgres) e com a memória antiga registrar risco de banimento, mas os detalhes
exatos dos erros que travaram essa fase não foram relatados ainda; vale perguntar ao Edvam se
lembra do tipo de erro (resposta errada? banimento do número? erro técnico do n8n?).

## Fase 3, Construção do sistema PDV + Caixa + Produtos + Atendimento

🗣️ Decidiram construir tudo junto: PDV, caixa, produtos e atendimento no mesmo sistema
(`caixa-js-grafica`, Next.js).

✅ Confirmado pelo `DEVLOG.md` do próprio projeto: entrada de 2026-05-02 registra a migração
de Google Sheets → Supabase (tabelas `jsgrafica_vendas`, `_saidas`, `_fechamento`), rotas de
API migradas, PDV funcional, deploy feito com sucesso. Essa é a **última entrada do DEVLOG**.

✅ O volume de mensagens no log despenca logo depois: Abr/2026 = 4.901, Mai/2026 = 112
(concentradas em 04/05), **Jun/2026 = 0**, Jul/2026 = 3 (até agora). Isso bate com uma pausa
de projeto por volta de maio, com o Z-API provavelmente desconectado durante esse hiato.

## Fase 4, Pausa

🗣️ O projeto foi pausado.

✅ Sem commits/DEVLOG depois de 2026-05-02. Sem mensagens no log em junho. Memórias antigas
(auto-memory, de ~60 dias atrás) descreviam um estado intermediário (Inbox construído,
Z-API "logado no número de teste") que já estava desatualizado por causa dessa pausa.

## Fase 5, Retomada (agora, 2026-07-02)

🗣️ Estamos retomando agora. O Z-API está conectado no número real de atendimento da
gráfica **neste momento**.

✅ Log de eventos (`jsgrafica_log_eventos_instancias`) mostra, hoje entre 21:47 e 21:52 UTC,
uma sequência de `DISCONNECTED` → pedido de novo código → botão de renovar código enviado.
Mensagens no log mostram, às 21:59 e 22:27 (depois da janela de reconexão), envios reais
(`from_me:true`) incluindo dois "Pedido confirmado" para encadernação e foto 10x15:
condizente com o sistema voltando a operar.

⚠️ **Importante:** o campo `jsgrafica_agent_config.connected_phone` (que hoje mostra um
número de SP, `5511992980671`) **não é atualizado automaticamente a cada reconexão**:
seu `updated_at` está parado em 2026-04-15. Ou seja, esse campo não é fonte confiável para
saber qual número está conectado agora. O relato do Edvam (conectado no número real da
gráfica) deve ser tratado como a informação mais atual, o campo do banco está defasado e
é candidato a correção/sincronização automática (possível demanda futura).

🗣️ **O Inbox do sistema (`admin.jsgrafica.site`) hoje não reflete corretamente o log de
conversas da JS Gráfica**, precisa ser revisto. Ainda não investigado a fundo; ver
`investigacoes/` e a seção de perguntas em aberto abaixo.

## Sessão 2026-07-02 (tarde), resultado das demandas 001-005

Todas as 5 demandas da primeira rodada foram executadas pelo time (relatos completos em
`demandas/00N-*.md`). Resumo do que mudou de entendimento, detalhe completo em `PRODUTO.md`:

1. **Contaminação do log (001, ✅ 02-DADOS):** causa parcial confirmada, janela real de
   2026-05-03 a 04 em que a instância ficou conectada num número pessoal/teste do Edvam
   (`5521965185667`), mas isso só explica ~0,4% dos contatos. A maior fatia (16,5%) é telefone
   malformado (qualidade de dado), não reuso de instância. Não é mais hipótese, é fato, mas
   o tamanho do problema é bem menor do que a primeira leitura sugeria.
2. **Inbox "não bate" (002, ✅ 03-APP):** não é bug de código (confirmado lendo API + banco).
   É porque zero mensagem de cliente real chegou desde 01/06, e os contatos de teste do Edvam
   (mini-PDV + "oi" manual hoje) subiram ao topo da lista por causa disso.
3. **Status Z-API (003, ✅ 01-N8N):** confirmado via `GET /device`, conectado no número real
   da gráfica, (81) 8610-8547, conta business "J S Gráfica". Bate com o relato do Edvam.
4. **Roteamento do atendimento IA (004, parcial, 01-N8N):** nenhum vazamento aconteceu, 3
   fontes de dado confirmam que a IA não rodou desde a reconexão. E **existe um segundo gate**
   que a investigação de 02/07 não tinha visto (whitelist hardcoded de 5 números dentro do
   próprio workflow `JSGRAFICA_ATENDIMENTO_AI`), isso reduz o risco real do achado original
   (o "buraco" no roteamento do workflow `01` continua existindo como fato de código, mas está
   neutralizado na prática hoje). Também acharam que o envio final para os números autorizados
   parece quebrado (fila `jsgrafica_send_queue` nunca lida por nada).
5. **JWT hardcoded (005, bloqueada, 01-N8N):** achado confirmado, mas o chat 01-N8N não tem
   ferramenta de escrita no n8n via MCP (só leitura/execução), não conseguiu corrigir.
   Registrou o passo a passo pra quem tiver acesso.

**Respostas do Edvam (2026-07-02, tarde):** `5521965185667` é seu número pessoal, causa
fechada. Autorizou apagar a janela de maio (demanda 008). Decidiu que o atendimento real
começa amanhã (2026-07-03) e o agente automático não pode responder cliente, só log/Inbox
(demanda 009, urgente). Priorizou o teste ponta a ponta de recebimento (demanda 006).

**Fase 3b (achado da demanda 007):** existe uma segunda importação de histórico, distinta da
migração original de Fase 3 (02/05/2026, dados de 2025). Em 2026-07-02, o chat 02-DADOS
importou uma planilha separada (`Caixa_JS_Grafica_ATUAL.xlsx`, mantida manualmente pela
gráfica) cobrindo abr-jul/2026, 946 linhas em `jsgrafica_vendas` (R$ 42.459,39), 237 em
`jsgrafica_saidas`, 50 em `jsgrafica_fechamento`. Sem duplicidade, já em uso no dashboard.
Isso aconteceu antes do fluxo de demandas/PM existir nesta mesma sessão, por isso o Edvam
não reconheceu de imediato. Ainda em aberto: acesso de escrita do 01-N8N ao n8n (demanda 005,
bloqueada).

**Fechamento das demandas 008/009/006 (2026-07-02, fim de tarde):**
- 008 concluída: janela de maio apagada (106 msgs, 7 contatos puros); 5 contatos com
  histórico fora da janela preservados.
- 009 concluída: garantido, com evidência, que nenhum cliente real recebe resposta automática
  amanhã, os 5 números da whitelist do atendimento IA foram identificados um a um e nenhum é
  cliente real. Reforço recomendado (desativar workflow na UI) fica pendente de decisão.
- 006 bloqueada → depois **concluída com achado grave**: o Edvam mandou a mensagem de teste.
  Ela chegou de verdade no WhatsApp/Z-API (confirmado via `GET /chats`), mas **nunca foi
  gravada em `jsgrafica_log_msgs_privadas`**. Investigando a demanda 010 em paralelo, o
  01-N8N mapeou a causa provável: o workflow `01` faz uma chamada síncrona ao webhook do
  `JSGRAFICA_ATENDIMENTO_AI` antes de logar, e esse webhook nunca responde (conexão órfã
  interna, nó `10 – Responder Webhook1` sem nada alimentando ele), travando a execução
  antes do log acontecer. Isso explica tanto por que o Inbox nunca refletiu conversa real
  (demanda 002) quanto por que zero mensagem foi logada mesmo com o Z-API reconectado. **Não
  é falta de mensagem real, é o pipeline quebrado.** Virou a demanda 011, prioridade máxima,
  urgente antes do atendimento real amanhã.
- 010 concluída (bloqueada, mesmo motivo da 005): confirmado que é seguro desativar os dois
  workflows quando alguém tiver acesso (são caminhos desconectados do log). Achou o problema
  da 011 investigando isso.
- 009: adendo registrado, a justificativa original ("desativar a IA não afeta o log") estava
  errada; o log já está quebrado independente disso. A conclusão prática (garantido que
  nenhum cliente recebe resposta automática) continua válida.

## Sessão 2026-07-06 a 2026-07-28, Caixa/Financeiro vira fonte de verdade, atendimento pausado avança em pesquisa

Resumo de alto nível, detalhe demanda a demanda está em `demandas/STATUS.md` (mais recente
primeiro), não repetido aqui pra não duplicar.

✅ **06/07**: primeiro fechamento de caixa lançado direto no sistema (não mais dado importado do
Sheets), vira a âncora de todo o histórico financeiro daqui pra frente (demanda 090).

✅ **07 a 17/07**: PDV/Caixa evolui rápido, integração real com Mercado Pago (Pix dinâmico) e
RecargaPay (Pix estático pra recarga), várias correções de atribuição de gaveta/conta de
origem (demandas 196-212), e um mecanismo de "repasse automático" de recarga (demanda 188 em
diante) que se mostrou fundamentalmente errado, corrigido de vez na leva 213-218 (ver abaixo).

✅ **Em paralelo**, a frente de atendimento/Inbox fez toda a pesquisa da jornada real do
WhatsApp (demandas 159-163) e desenhou a Fase 1 do agente automático, decisão de continuar
pausado, mas com a base de dado pronta. Detalhe completo em `OBJETIVOS-MACRO.md`, não repetido
aqui.

✅ **18/07, dia de arrumação geral do financeiro** (demandas 213-218): confirmado que recarga
vendida em Dinheiro/Cartão/Pix normal nunca deveria gerar saída automática vinculada à venda:
corrigido; ~R$174,50 em saídas fantasma históricas corrigidas manualmente; achado e corrigido
um travamento de R$117,57 no saldo acumulado do fechamento geral de 10/07 que tinha se
arrastado, sem mudar de valor, até 16/07; removida a tela "Pendências entre contas" inteira, a
premissa dela (toda venda "precisa" virar uma transferência resolvendo pendência) não batia com
a operação real da gráfica.

✅ **21/07, auditoria completa do fluxo de caixa desde 06/07** (demanda 222, pelo especialista
financeiro novo "05 - FINANCEIRO JS GRAFICA", criado nesse mesmo dia): confirmou a fórmula de
fechamento batendo em toda linha (Sistema e individual) de 09/07 em diante, e achou 2 problemas
de código reais, transferência entre contas nunca contava como entrada no fechamento (só como
saída), e a trava de segurança da demanda 180 bloqueava silenciosamente até a tentativa do
próprio Edvam de corrigir um rótulo de pagamento errado, sem avisar na tela. Os dois corrigidos
nas demandas 223/224.

✅ **21-22/07, conciliação automática construída** (demandas 225-230): desenho, tabelas,
matching de pagamentos do Mercado Pago sem vínculo, cálculo de diferença de saldo agregada nas
contas sem API, tela de classificação pro Admin, e revisão de linguagem (a primeira versão dos
textos gerados saiu técnica demais, reescrita em português simples). Objetivo: parar de deixar
a divergência diária como um número agregado sem explicação, cada diferença vira um item que o
Admin nomeia, e essa classificação passa a contar de verdade no fechamento.

⚠️ **Achado de processo, não de sistema** (2026-07-21): existe um chat "04 - FRONTEND JS
GRAFICA", criado em 07/07 pra rodar UI em paralelo ao 03-APP, nunca documentado no `README.md`
do time nem com briefing formal em `equipe/`, passou despercebido até o PM tentar criar um novo
membro usando o mesmo número "04" por engano. Renomeado pra "05 - FINANCEIRO" antes de virar
demanda de verdade; o status do 04-FRONTEND foi confirmado depois (2026-07-28, direto com
o próprio chat): inativo desde a demanda 122 (2026-07-08), sem nunca ter sido encerrado
formalmente.

✅ **22 a 28/07, mecanismo de recálculo construído e mais 4 demandas de acompanhamento**
(demandas 194, 231, 232, 233): o mecanismo de recalcular fechamento antigo quando uma pendência
é classificada tarde (que tinha ficado "pra depois" de propósito) foi construído, prévia da
cascata completa antes de aplicar, aplicação sempre um dia de cada vez com confirmação. No
caminho, achados reais de sincronia entre saída e transferência vinculada (editar o valor de uma
não atualizava o outro, corrigido, com 1 caso real de R$55 de diferença corrigido junto) e
confirmação de que cancelar essa saída já era protegido por uma trava no banco (só faltava
mensagem de erro clara e um botão na tela pra desfazer a transferência certa). Também fechada a
demanda 194 (parada desde 15/07): "Movimento" virou "Visão Geral", dashboard geral do negócio.

## Sessão 2026-07-29, especialista de atendimento criado, cadeia de bugs de timestamp resolvida

✅ **Especialista "06 - AUTOMAÇÃO ATENDIMENTO INBOX" criado**: o Edvam pediu um chat próprio pra
design de conversação/automação, recusando explicitamente usar 02-DADOS pra isso. Briefing
(`pm/equipe/06-atendimento.md`) espelha a estrutura que funcionou pro 05-FINANCEIRO, identidade
embasada em prática real pesquisada (autonomia proporcional à confiança, escalação em camadas,
restrições reais da janela de 24h/taxa de qualidade do WhatsApp), domínio explícito (Z-API real,
tabelas de log/contatos/pedidos, leitura dos workflows de atendimento), disciplina de checkpoint.

✅ **Demanda 234, 100 clientes reais reconstruídos**: amostra estratificada de 628 telefones (não
conveniência), 2 camadas, estruturada via SQL pros 100/196 pedidos, qualitativa (texto real) pra
subamostra de 40. Relatório completo em `pm/conhecimento/manual-resposta-ia-100-clientes.md`: 11
regras do manual de resposta, cada uma citando conversa real (destaque: a própria equipe já
instrui por escrito um cliente a não antecipar Pix antes da confirmação de valor, valida o
desenho já decidido da Fase B). Lista de candidatos da demanda 209 refinada: André Américo passou
a excluído (mistura pedido de gráfica e de comida na mesma janela de mensagens), Lidiane Oliveira
entrou como candidata nova limpa.

✅ **Cadeia de bugs de timestamp no log de mensagens (demandas 235-240), achada durante a 234 e
toda corrigida no mesmo dia**: `data_timestamp` em si não tinha bug real em produção (235, zero
pontos quebrados, o erro era só nas consultas SQL da própria investigação 234), mas a auditoria
revelou 3 problemas reais:
- Workflow `02 - LOG MSG ENVIADAS` calculava `data_timestamp` mas nunca gravava, fora do
  mapeamento do `CREATE`/`UPDATE` Supabase, corrigido (236), achado durante o teste: o teste
  "óbvio" pedido no escopo (envio real pelo Inbox) não provava nada (o app já grava esse campo
  direto, nem passou pelos nós corrigidos), não aceito como prova, complementado com evento
  sintético direto no webhook de produção.
- O mesmo workflow (depois confirmado também o `03 - STATUS MSG`) sobrescrevia
  `sent_at`/`delivered_at`/`read_at` com `null` a cada novo evento de status, em vez de preservar
  o valor já gravado, corrigido nos dois (237, 239), testado com ciclo sintético completo
  SENT→DELIVERED→READ contra os webhooks reais.
- **Achado maior, fora do escopo original**: a configuração da Z-API da JS Gráfica tinha o campo
  `messageStatusCallbackUrl` apontando pro webhook de **outro cliente da mesma infraestrutura
  (BIOBOTS)**, não pro da própria gráfica, por isso `read_at` nunca tinha sido preenchido em
  nenhuma das 16.474 mensagens da tabela. Corrigido só do lado da JS Gráfica, sem tocar em nada
  do BIOBOTS (decisão explícita do Edvam), demanda 240, endpoint de update da Z-API descoberto e
  documentado no processo (não estava registrado em lugar nenhum do projeto ainda).

✅ **Demanda 238, falha silenciosa de geração de Pix corrigida**: relato do Edvam ("não está
gerando o qrcode"), resolvido sozinho na hora segundo ele, mas investigado a pedido dele. Achado
real: 3 pedidos ficaram sem QR Pix, `POST /api/pedidos` retornando 200 (sucesso), zero erro no
Vercel, zero linha na tabela de falhas (`jsgrafica_mercadopago_falhas_cobranca`, criada
justamente pra isso na 221). Causa confirmada com dado real (Supabase + Vercel MCP): um gate que
só processa Pix quando o telefone é numérico pulava o bloco inteiro, inclusive o próprio
try/catch que gravaria a falha, sempre que o contato ainda estava em formato `@lid` (WhatsApp
ainda não resolveu o telefone real, janela de poucos minutos). Corrigido com o caminho mínimo e
seguro: loga a falha + mostra o mesmo aviso que já existe pra falha real de cobrança, sem tentar
ampliar o gate (risco não investigado de rascunho órfão na Inbox, registrado como oportunidade
futura, não urgente).

## Sessão 2026-07-30 a 2026-08-20, Caminho C vira agente real, 2 achados de segurança, Marketing entra no ar

✅ **Virada de arquitetura do atendimento, decidida em 16/08 (Fase D, ver `OBJETIVOS-MACRO.md`)**:
o `206` (árvore de 19 IFs) gerou 6 bugs reais no mesmo dia, cada um uma regra nova quebrando
regra antiga sem ninguém prever a interação. Decisão do Edvam: substituir por um agente de IA de
verdade (`@n8n/n8n-nodes-langchain.agent`) que raciocina sobre a conversa e aciona ferramentas de
código puro (preço, Pix, pedido, cancelar, escalar), sempre recalculando o dado da fonte real.
Sequência 295 a 299 (contrato técnico, ferramentas isoladas testadas com Pix real, workflow do
agente, gate determinístico de Alto Toque, teste adversarial com 13 tentativas reais, achando e
corrigindo 1 vazamento crítico de prompt de sistema) concluída e conectada de verdade no
roteamento real desde 18/08, no lugar do `206` (que segue intacto, sem tráfego, como caminho de
reversão rápida).

✅ **3 bugs urgentes achados durante o piloto, mesma família de bug de plataforma n8n**
(`alwaysOutputData` ausente faz o node seguinte não rodar quando a consulta devolve 0 linhas, 6ª
ocorrência da mesma categoria): roteamento de sessão de pedido travava telefone com sessão antiga
apontando pro `06-PEDIDOS` desativado (306, 441 telefones reais afetados); proteção nova contra
loop de resposta automática com away-message do cliente (307); pior caso da categoria, 1ª
mensagem de cliente genuinamente novo não recebia avaliação de roteamento nenhuma (308). Achado
ao vivo pelo Edvam no mesmo dia (309): o próprio contador de loop que a 307 criou silenciou o
piloto pra um telefone real (2 respostas legítimas a mensagens diferentes contadas como "loop"),
corrigido no mesmo dia (Camada 2 passou a exigir repetição de conteúdo, não só contagem bruta).

✅ **Auditoria de segurança das rotas `/api/*` (demanda 302)**: nenhuma das 74 combinações
rota+método validava sessão no servidor, confirmado ao vivo com `curl` sem login devolvendo dado
real de cliente. Ponte aplicada no mesmo dia (304): header `X-App-Secret` exigido em toda rota
via `middleware.ts`. Registrado como ponte, não solução definitiva.

✅ **Achado de segurança grave na infraestrutura compartilhada do LabOnchain (2026-08-20)**: o PM
achou a chave `service_role` do Supabase em texto puro em 2 workflows n8n (`LABON_STATUS`,
`LABON_DASHBOARD_STATUS`), não era só da JS Gráfica, era a chave mestra do banco compartilhado
inteiro. Reportado ao PM do LabOnchain, corrigido do lado deles no mesmo dia.

✅ **Aba Marketing → Conteúdo construída e em produção (demandas 310/311)**: domínio novo, time
ganhou o 7º membro (`07 - MARKETING JS GRAFICA`). WhatsApp Status funcionando de ponta a ponta
(criar, agendar, aprovar, editar, cancelar, duplicar), reaproveitando a fila compartilhada do
LabOnchain que o Kuidu também usa. Testado com post real do Edvam publicado de verdade. Instagram
fica pronto mas desabilitado, esperando o token da conta comercial.

✅ **8º membro do time criado (2026-08-20)**: "08 - PRODUTOS E NOVOS NEGÓCIOS JS GRAFICA", papel
de pensar/propor (não executa código), pra 3 frentes novas de backlog (produtos digitais, loja
online, impressão 3D sob encomenda) e o desenho de um motor interno de recomendação/remarketing
via WhatsApp.

✅ **16 cadastros reais recuperados**: uma campanha manual de atualização de cadastro (WhatsApp,
a partir de 09/07) alcançou 1.248 contatos, 27 responderam com nome/aniversário/e-mail reais, mas
nada tinha sido transcrito pro sistema (o campo sempre foi manual, sem fonte automática). 16
recuperados e salvos, conferidos nome a nome contra o dono do número antes de gravar, 11 pulados
por serem currículo de terceiro.

## Sessão 2026-08-21 a 2026-08-28, Caminho A fecha a segurança, auditoria financeira real, marca e Site V2 nascem

✅ **27/08, Caminho A conclui a segurança de sessão (demanda 329)**: sessão real por cookie
assinado substitui de vez a ponte de segredo compartilhado da demanda 304, senha do Admin
trocada (a antiga estava vazada desde a 302), buraco novo achado e fechado no mesmo escopo
(logar como admin pelo PDV clicando no nome, sem senha). Incidente ao vivo na sequência,
corrigido no mesmo dia (334): sessão caída agora mostra aviso, não tela vazia. Reforços no mesmo
pacote: rate limit de login (332), `middleware.ts` renomeado pra `proxy.ts` por convenção do
Next.js 16 (333).

✅ **18 a 27/08, piloto do Caminho C segue e acumula 17 correções reais** (demandas 314-324,
mesma família de bug de plataforma n8n de antes, mais falso positivo grave de detecção da Dizu
batendo em cliente pagante real, corrigido na 316). Decisão formal do 06-ATENDIMENTO (demanda
330, 27/08): continuar restrito à whitelist interna, sem expandir pra cliente real ainda. Busca
de preço trocada pra busca semântica via embeddings (338), que também revelou e corrigiu um bug
que tinha deixado o piloto incapaz de cotar preço/gerar Pix desde a troca de segredo da 329.

✅ **27/08, auditoria financeira real de agosto** (demandas 335-337, 05-FINANCEIRO): lucro bruto
de R$4.248,51 no mês, causa real da divergência do fechamento identificada (fechamentos
`Sistema` não recalculados quando a conciliação classifica tarde), e resposta à pergunta do
Edvam sobre por que o saldo acumulado não bate (diferença de R$3.223,80 entre esperado e
contado, rastreada em parte até pagamento cruzado com a Dizu Refeições).

✅ **28/08, dois domínios novos**: "09 - SITE V2 JS GRAFICA" criado pra tocar um site
institucional separado (`v2.jsgrafica.site`), e o 08-PRODUTOS sai do papel com as primeiras
demandas reais (343, 346-350), achado principal, Kit Delivery Brasil já tem 30 artes prontas.
Primeiro manual de marca real da JS Gráfica também sai nesta janela (demanda 339, via framework
opensquad).
