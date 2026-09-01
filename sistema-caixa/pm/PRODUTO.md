# Produto, Sistema JS Gráfica (estado atual)

> 🎯 Ver `pm/OBJETIVOS-MACRO.md` pros 2 objetivos de longo prazo (fechamento de caixa assistido
> por agente + automação gradual do atendimento no Inbox), este arquivo aqui é só a foto do
> estado atual, não a visão.

Documento vivo. O PM atualiza isso conforme os chats do time reportam resultado de tarefas,
não é histórico (isso é `HISTORICO.md`), é uma foto do que o sistema faz e em que estado está
agora. **Última atualização: 2026-08-31** (as seções abaixo do "Estado atual (2026-08-31)" são o
registro histórico das sessões anteriores, mantidas porque continuam factualmente corretas no
momento em que foram escritas, só não são mais "o estado atual").

## Estado atual (2026-08-31)

Sessão longa e densa, ver `pm/demandas/STATUS.md` (topo) pro detalhe demanda a demanda. Resumo
por tema:

**Infraestrutura, GitHub (357-358, concluídas)**: todo o código da JS Gráfica está versionado em
`labonchain/JSGRAFICA` (repositório público compartilhado, criado pelo Edvam, também usado pelo
pipeline de conteúdo via GPT). `sistema-caixa/` (caixa-js-grafica completo, `pm/` incluso exceto
`pm/backups/`), `site-institucional/` (site da raiz), `site-v2/` (site novo). Decisão consciente
do Edvam: `pm/` fica público de propósito, pra o GPT do pipeline ler histórico/continuidade.

**Achado de segurança, resolvido**: auditoria pré-push achou chave `service_role` real do
Supabase compartilhado + 27 tokens Z-API reais em `pm/backups/*.json` (histórico antigo). Decisão
do Edvam: apagar os 29 arquivos do disco local (feito, confirmado), sem rotacionar a chave por
ora (decisão consciente).

**Canal do WhatsApp, completo e em produção (352-356, 362)**: canal real "JS Gráfica" criado,
testado (texto/imagem/vídeo/áudio funcionam, documento não), integrado em Marketing → Conteúdo
como 3º destino (post real, agendamento real distinto de "aprovar e publicar agora", tela de
Configurações). Robô de disparo agendado (355) rodando a cada 30min.

**🎨 Qualidade visual das peças, teste concluído, padrão aguardando aprovação (361, 364, 366)**: a
produção original (32 peças, HTML/CSS/SVG puro) foi considerada fraca pelo Edvam ("visual
genérico, parece Canva"). Causa raiz: técnica de código não simula foto/textura real. Solução:
workflow (364) gera imagem realista via **Gemini gratuito**, testado em 3 variações de fundo no
mesmo produto (366): produto isolado, painel de cor complementar dentro da própria foto
(recomendado pelo 07-Marketing, mockup real com título/CTA direto sobre o painel, foto e
tipografia como peça só) e cena lifestyle ambientada (opção pontual). **Aguardando aprovação do
Edvam** da variação recomendada antes de virar padrão de produção e escalar pras 32 peças antigas.

**✅ Contador de visualizações de Status, causa raiz corrigida (363 parte 2, 367, 2026-08-31)**:
o painel mostrava 8x a 20x mais "visualizações" do que o número real do WhatsApp nativo. Causa:
a função `jsgrafica_contar_visualizacoes_status` somava eventos `RECEIVED` (entrega automática,
82,5% da base) junto com `READ` (visualização real, 18,9%). Corrigido com filtro `status='READ'`,
testado contra 5 posts reais, painel já mostra o número certo. No caminho, 3 hipóteses causais
diferentes foram propostas e derrubadas por dado real antes de achar a causa verdadeira (registro
completo em `pm/demandas/363-*.md`, inclusive autocrítica do executor sobre apresentar hipótese
como conclusão fechada sem validar primeiro).

**🔴 Alcance de Status via API, ainda sem causa raiz confirmada (363 parte 1)**: Status postado
via automação (API) não alcança todos os clientes reais (achado real: Zuzeide, 72 interações,
nunca vê Status via API, só o manual). A hipótese original ("1.717 contatos sincronizados pelo
dispositivo vinculado da Z-API") foi derrubada, o Edvam confirmou que não existe conceito de
sincronização de contato na Z-API. Segunda hipótese (contato salvo/não salvo na agenda do
telefone) também derrubada, Zuzeide está salva na agenda e mesmo assim não aparece em `/contacts`.
Causa real ainda não identificada. Edvam segue direto com o 01-N8N e com o suporte da Z-API.

**Bug real corrigido no Inbox (demanda 368, 2026-08-31)**: o botão "Sugestão da IA" negava
serviços reais da gráfica (ex. "agendamento de RG") porque a rota de sugestão nunca consultava o
catálogo (`jsgrafica_produtos`), só o histórico de conversa. Corrigido injetando a lista real de
serviços ativos no prompt, testado com caso real e com regressão (serviço que a gráfica realmente
não presta continuou sendo negado corretamente).

**08-Produtos**: sem demanda ativa, aguardando o Edvam detalhar o que não convenceu no Kit
Delivery Brasil antes de fechar a proposta de retomada de pesquisa (demanda 360).

## Estado atual (2026-08-30), histórico

**Episódio de coordenação (28/08 à noite)**: o Edvam abriu várias janelas de PM por engano
tentando limpar a sessão, gerando confusão real de múltiplos "00 - PM" coexistindo e dando
onboarding pro time em paralelo. Resolvido fechando as janelas duplicadas e reidentificando o
time inteiro numa rodada de handshake (endereços técnicos atualizados em
`pm/conhecimento/mapa-chats-especialistas.md`). Sem perda de trabalho, só bagunça de coordenação.
**04-Frontend reativado** no mesmo episódio (nunca tinha tido briefing formal, agora tem,
`pm/equipe/04-frontend.md`), roda em paralelo ao 03-APP só em demanda explicitamente atribuída.

**Produtos digitais, mudança de direção (29/08)**: as demandas 346 (Kit Delivery Brasil) e 347
(6 templates avulsos) foram **canceladas**, decisão direta do Edvam de refazer a frente de
produtos digitais do zero, ainda sem novo desenho definido. A 348 (squad de produção de kits,
07-Marketing) segue aprovada.

**🆕 Canal do WhatsApp da JS Gráfica, construído do zero e em produção (29/08, demandas
352-356)**: pesquisa confirmou com o suporte da Z-API que dá pra postar conteúdo (texto, imagem,
vídeo) num Canal (recurso diferente de Status, conteúdo permanente tipo feed, não expira em 24h).
Canal real criado (`120363412925013708@newsletter`, nome "JS Gráfica"), testado de ponta a ponta,
e **integrado como 3º destino em Marketing → Conteúdo** ao lado de Status/Instagram: post real
(criar/agendar/aprovar), tela de Configurações do Canal (identidade/seguidores/exclusão), tudo
rodando contra a Z-API real, sem fila compartilhada do LabOnchain (schema próprio,
`jsgrafica_canal_posts`). Documentação técnica completa (endpoints reais, divergências da doc
pública da Z-API já encontradas 4 vezes) em `pm/conhecimento/guia-canal-whatsapp-automacao.md`.
**Falta ainda**: robô de disparo agendado (demanda 355, 01-N8N, a cada 30min, pra post agendado
publicar sozinho sem precisar de "aprovar" manual) e decisão sobre incluir "seguir outros canais"
(hipótese do 07-Marketing, não confirmada como necessidade de negócio). Contador de seguidores do
canal não está disponível via API nesta conta/plano da Z-API (achado confirmado, não é bug).

**Manual de marca exportado pra uso externo (29-30/08)**: o manual completo (demanda 339), a logo
(5 versões vetoriais + PNG) e as 3 fontes usadas (todas Google Fonts gratuitas) foram exportados
como arquivo de verdade em `opensquad/exports/manual-de-marca-339/`, prontos pra um designer usar
fora do sistema.

**Decisão de infraestrutura em andamento (30/08)**: nenhum projeto da JS Gráfica está no GitHub
hoje (`site-v2` tem git local com 2 commits mas sem remoto; raiz e `caixa-js-grafica` nem
repositório local têm). O Edvam decidiu subir tudo pro GitHub, trabalho de organização/auditoria
de segredo em andamento antes de criar os repositórios de verdade (ver `pm/demandas/STATUS.md`
pra status exato).

## Estado atual (2026-08-28), histórico

**Time**: 9 chats hoje. Novo domínio criado nesta janela: **09 - SITE V2 JS GRAFICA** (28/08,
`pm/equipe/09-site-v2.md`, site institucional novo em Next.js, `v2.jsgrafica.site`, fluxo
separado do 03-APP, dialoga com o resto do time quando precisa usar algo). O 08-PRODUTOS também
saiu do papel: primeiras demandas reais aprovadas (343, 346-350), achado principal, o Kit
Delivery Brasil (NEG-KIT-001) já tem 30 artes prontas e é o item mais perto de vender de verdade.

### Segurança: Caminho A concluído, ponte antiga desativada (demanda 329, 2026-08-27)

A ponte temporária de segurança (`X-App-Secret`, demanda 304) foi substituída pela solução
definitiva: sessão real por cookie assinado (`SESSION_SECRET`, Web Crypto), login de admin com
senha nova (a antiga estava vazada e foi invalidada) e login de PDV sem senha só pra Zu e Gabi. O
segredo antigo foi removido da Vercel e não funciona mais. Corrigido no mesmo escopo um buraco
novo achado durante a implementação: clicar no nome "Edvam" no PDV logava como admin sem senha
nenhuma. Reforços posteriores no mesmo pacote: rate limit no login do admin (332), aviso visível
de sessão caída em vez de tela vazia (334), renomeação de `middleware.ts` pra `proxy.ts` por
convenção do Next.js 16 (333, sem mudança de lógica).

### Atendimento: piloto do Caminho C segue restrito, 17 bugs corrigidos, decisão formal de continuar

O piloto conectado em 18/08 (demanda 299) se estendeu bem além dos 4 dias planejados, com uma
sequência grande de bugs reais achados e corrigidos ao vivo (314 a 324, mesma família de
problemas de plataforma n8n de antes). A decisão formal do 06-ATENDIMENTO (demanda 330, 27/08)
foi continuar restrito à whitelist interna (6 telefones) por mais um ciclo, sem expandir pra
cliente real ainda, sem pausar. A busca de preço trocou de texto literal pra busca semântica real
via embeddings (demanda 338, pgvector), corrigindo também um bug urgente que tinha deixado o
piloto inteiro incapaz de cotar preço ou gerar Pix desde a troca de segredo da 329.

### Financeiro: auditoria real de agosto (demandas 335-337, 27/08)

Lucro real de agosto (01-27/08): R$17.107,36 de entrada, R$12.858,85 de saída, **lucro bruto de
R$4.248,51**. Achada a causa real da divergência do fechamento: a tela soma só os fechamentos
`Sistema`, que não são recalculados quando a conciliação classifica uma entrada avulsa depois do
dia já fechado, então dias inteiros de entrada real ficam fora do total mostrado. Pergunta
separada do Edvam (por que o saldo acumulado não bate) também respondida: hoje o sistema espera
R$3.947,75 acumulado desde 06/07, mas o real contado é R$723,95, uma diferença de R$3.223,80,
rastreada em boa parte até um pagamento cruzado com a Dizu Refeições em 24/07. Nenhuma correção
de sistema aplicada ainda, as duas demandas são levantamento, recomendações passadas pro PM.

### Novo domínio: marca e produtos digitais (demanda 339, 28/08)

Primeiro manual de marca real da JS Gráfica, construído pelo 07-MARKETING via implementação
própria do framework opensquad. Sistema visual completo (paleta, tipografia, grid), manual de 10
seções, logo fechado depois de várias rodadas de ajuste real com o Edvam. Publicado como artefato
próprio.

---

## Estado atual (2026-08-20), histórico

**Time**: 8 chats hoje, não mais 6. Dois domínios novos criados nesta janela: **07 - MARKETING
JS GRAFICA** (18/08, `pm/equipe/07-marketing.md`, aba Marketing → Conteúdo) e **08 - PRODUTOS E
NOVOS NEGÓCIOS JS GRAFICA** (20/08, `pm/equipe/08-produtos.md`, ideação de produto/negócio, não
executa código). Time completo e domínio de cada um em `pm/README.md`.

### Atendimento: Caminho C construído, conectado e em piloto real

Toda a virada de arquitetura decidida em 16/08 (ver `OBJETIVOS-MACRO.md`, "Fase D") saiu do
papel nesta janela. O `206` (árvore de 19 IFs, congelado desde a demanda 292 por fragilidade
estrutural) foi substituído por um agente de IA real (`@n8n/n8n-nodes-langchain.agent`) que
raciocina sobre a conversa e aciona ferramentas de código puro (preço, Pix, pedido, cancelar,
escalar), sempre recalculando o dado da fonte real, nunca aceitando o que a IA tenta passar como
valor. Sequência 295→299 (contrato, ferramentas, agente, gate de Alto Toque, teste adversarial
com 1 vazamento crítico achado e corrigido) concluída e **conectada de verdade no roteamento
real desde 18/08** (demanda 299), no lugar do `206` (que continua existindo intacto, sem
tráfego, como caminho de reversão rápida).

**3 bugs urgentes achados e corrigidos no piloto, mesma família de bug de plataforma n8n**
(`alwaysOutputData` ausente faz o próximo node não rodar quando a consulta devolve 0 linhas,
6ª ocorrência da mesma categoria nesta sessão): roteamento de sessão de pedido travava telefone
com sessão antiga apontando pro `06-PEDIDOS` desativado (306, 441 telefones afetados); proteção
contra loop de resposta automática com away-message do lado do cliente (307); pior caso da
categoria, 1ª mensagem de cliente genuinamente novo não recebia avaliação nenhuma (308).
**Achado ao vivo, mesmo dia (309)**: o próprio contador de loop da 307 silenciou o piloto pra um
telefone real (2 respostas legítimas contadas como "loop"), corrigido no mesmo dia (Camada 2
agora exige repetição de conteúdo, não só contagem). Piloto continua rodando, ainda só com a
whitelist de sempre (5 números internos/teste), nenhum cliente real adicionado.

### Segurança: 2 achados grandes, ambos fechados

- **Rotas `/api/*` sem sessão real (demanda 302, auditoria)**: nenhuma das 74 combinações
  rota+método validava sessão no servidor, confirmado ao vivo com `curl` sem login devolvendo
  dado real. **Ponte aplicada no mesmo dia (demanda 304)**: header `X-App-Secret`
  (`NEXT_PUBLIC_APP_SHARED_SECRET`) exigido em toda rota via `middleware.ts`. É ponte, não
  solução definitiva (não distingue Edvam/Zu/Gabi, é `NEXT_PUBLIC_` logo visível no navegador).
  Caminho A (sessão real por cookie assinado) segue não escopado.
- **Chave `service_role` do LabOnchain em texto puro em 2 workflows n8n compartilhados**
  (`LABON_STATUS`, `LABON_DASHBOARD_STATUS`), achado pelo PM investigando a infraestrutura de
  Conteúdo/Marketing (20/08). Não era só da JS Gráfica, era a chave mestra do banco
  **compartilhado inteiro** (todos os clientes LabOnchain). Reportado ao PM do LabOnchain,
  **corrigido do lado deles no mesmo dia** (nodes trocados pra credencial nativa do n8n).
  Resíduo menor ainda pendente do lado deles (chave `anon` hardcoded em 1 node, baixo risco).

### Novo: aba Marketing → Conteúdo (demandas 310/311, concluídas e em produção)

WhatsApp Status funcionando de ponta a ponta: criar, agendar, listar, aprovar, editar, cancelar
e duplicar posts, tudo testado contra o webhook real compartilhado do LabOnchain
(`LABON_DASHBOARD_STATUS` + tabela `labon_status_queue`, multi-tenant, mesmo sistema já usado
pelo Kuidu). Backend assina um JWT próprio (`SUPABASE_JWT_SECRET`, nova env var em
`.env.local`/Vercel) pra autenticar como JS Gráfica nesse sistema compartilhado. UI: calendário +
tabela ("Plano de conteúdo"), preview de como fica no WhatsApp ("Como vai ficar"), modal de
criação/edição, atualização automática em segundo plano (15s, sem travar a tela). Instagram
(seção do modal + preview) e a visão "Quadro" ficam visíveis mas desabilitados, sem token da
conta comercial e sem mockup, respectivamente, aguardando o Edvam. Guia completo de como
configurar o token do Instagram quando chegar a hora: `pm/conhecimento/guia-instagram-api-automacao.md`.

### Achado e corrigido: dado real de cadastro nunca aproveitado

Uma campanha manual de "atualize seu cadastro" (WhatsApp, a partir de 09/07) alcançou 1.248
contatos; 27 responderam com nome/aniversário/e-mail reais, mas nada tinha sido transcrito pra
`jsgrafica_contatos` (campos existem desde a demanda 086, sempre manuais, sem fonte automática).
**16 recuperados e salvos** (`data_aniversario`/`lead_email`), conferidos nome a nome contra o
contato do WhatsApp antes de gravar; 11 pulados de propósito por serem currículo de terceiro
(nome da mensagem não batia com o dono do número). Primeiro insumo real pro motor de
recomendação/remarketing descrito no backlog (ver `demandas/STATUS.md`).

---

## Histórico da sessão de 2026-07-29 (mantido como registro, não é mais "estado atual")

**PDV/Caixa/Financeiro**, ver `../CLAUDE.md` (seção "Fluxo financeiro") pro modelo corrigido de
recarga/conciliação. Resumo: PDV+Admin 100% Supabase, fechamento diário (por operador + geral)
rodando desde 2026-07-06, conciliação automática com Mercado Pago no ar (demandas 225-230),
especialista financeiro dedicado criado (`pm/equipe/05-financeiro.md`, "05 - FINANCEIRO JS
GRAFICA"). Mecanismo de recalcular fechamento antigo (última peça do desenho, era "pendente")
foi construído em 28/07 (demanda 231), prévia da cascata + aplicação com confirmação, um dia
de cada vez. 41 pendências reais aguardam classificação com o Admin (nenhuma aplicada ainda).

✅ **29/07, falha silenciosa de geração de Pix corrigida (demanda 238)**: quando um pedido é
criado com o contato ainda em formato `@lid` (WhatsApp ainda não resolveu o telefone real, janela
de poucos minutos), a geração do Pix era pulada por inteiro, sem erro nem log, a equipe só via
"não gerou o QR" sem explicação. Agora loga em `jsgrafica_mercadopago_falhas_cobranca` e mostra o
mesmo aviso que já existe pra falha real de cobrança. Ampliar pra tentar o Pix mesmo com `@lid`
ficou registrado como oportunidade futura, não urgente (ver `demandas/238-*.md`).

**Inbox/Atendimento**, ver `OBJETIVOS-MACRO.md` (fonte de verdade pra essa frente, evita
duplicar aqui). Resumo: atendimento automático ao cliente continua pausado por decisão de
produto. Fase A (preparação pra automação gradual) concluída em 2026-07-16. Fase B (workflow de
conversa de verdade) construída e testada isolada (demanda 206, só com o número do Edvam):
aguardando decisão do Edvam pra conectar no roteamento real e definir regra de expansão gradual.
Especialista dedicado de conversação/automação criado em 29/07 (`pm/equipe/06-atendimento.md`,
"06 - AUTOMAÇÃO ATENDIMENTO INBOX"), primeira entrega foi a reconstrução de 100 clientes reais e
o manual de resposta da IA (demanda 234, `pm/conhecimento/manual-resposta-ia-100-clientes.md`).

✅ **29/07, cadeia de bugs de timestamp no log de mensagens corrigida** (demandas 235-240,
achado durante a análise da 234): `data_timestamp` em si nunca teve bug real em produção (235,
zero pontos quebrados, o erro era só nas consultas SQL da própria investigação), mas a
investigação revelou 3 problemas reais e todos corrigidos: (a) workflow `02 - LOG MSG ENVIADAS`
calculava `data_timestamp` mas nunca gravava (236); (b) esse mesmo workflow, e depois confirmado
também o `03 - STATUS MSG`, sobrescreviam `sent_at`/`delivered_at`/`read_at` com `null` a cada
novo evento de status em vez de preservar o valor já gravado (237, 239); (c) achado maior: a
configuração da Z-API da JS Gráfica tinha o campo `messageStatusCallbackUrl` apontando pro
webhook de **outro cliente (BIOBOTS)**, por isso `read_at` nunca tinha sido preenchido em nenhuma
das 16.474 mensagens da tabela, corrigido só do lado da JS Gráfica, sem tocar no BIOBOTS
(demanda 240).

✅ **29/07, lacuna "o que aciona o workflow `02`" fechada (demanda 241, investigação a pedido
explícito do Edvam: "não podemos ter lacunas, dúvidas ou bugs silenciados")**: investigação
exaustiva (todos os campos da Z-API, execuções reais do n8n, código do app inteiro, todos os
outros workflows) não achou nenhum chamador ativo **hoje**. Achado que resolve a pergunta de outra
forma: as 827 linhas com a assinatura do `02` estão todas confinadas a 25/03→03/05/2026, zero
desde então (87 dias). Ou seja, não é um gatilho vivo escondido: foi um mecanismo que funcionou
por ~6 semanas (coincide com a última edição do próprio workflow, 25/03, e com 2 picos de disparo
em massa em abril compatíveis com campanha) e parou, sem que ninguém tivesse notado, hoje quem
registra envio de mensagem é só o caminho do app (`registrarMensagemEnviada`). Não foi possível
provar retroativamente QUEM chamava naquela janela (n8n não guarda execução de período sem log
habilitado, e essa era justamente a causa raiz de nunca aparecer nada na busca: faltava
`saveDataSuccessExecution` etc. nos `settings` do `02`/`03`, agora corrigido e validado). Detalhe
técnico completo em `project_n8n_workflows.md` (memória) e na própria demanda 241.

**Time**: 6 chats hoje, 00-PM (coordenação), 01-N8N, 02-DADOS, 03-APP, 05-FINANCEIRO,
06-ATENDIMENTO (novo, 29/07). Existe também um "04 - FRONTEND JS GRAFICA" criado em 2026-07-07
pra rodar UI em paralelo, **status real incerto** confirmado antes: **inativo desde a demanda
122 (2026-07-08)**, checado direto com o próprio chat em 2026-07-28. Nunca teve briefing formal
em `equipe/`, reativar exigiria criar um antes da primeira demanda nova.

---

## Histórico da sessão de 2026-07-02 (mantido como registro, não é mais "estado atual")

## O que é

Sistema de gestão da JS Gráfica (gráfica rápida, Ibura, Recife-PE): PDV + Caixa + Produtos +
Atendimento via WhatsApp, integrado. Três peças:

1. **App** (Next.js), `pdv.jsgrafica.site` (PDV) e `admin.jsgrafica.site` (Admin + Inbox)
2. **Automação** (n8n + Z-API), recebe/envia WhatsApp, log, pedidos, campanhas
3. **Dados** (Supabase, projeto LabON), fonte de verdade de tudo

## Estado por área (atualizado após demandas 001-005)

### 🔴 2026-07-03: Edvam desativou manualmente TODOS os nós de envio do workflow 06-PEDIDOS
Depois de ver o robô de pedidos mandando mensagem pra números com conversas sem relação
óbvia com a gráfica (uma delas parecia ser sobre troca de remédio numa farmácia), o Edvam
desativou direto na UI do n8n os nós `ENVIAR PERGUNTA Z-API`, `ENVIAR PERGUNTA PAGAMENTO`,
`ENVIAR CONFIRMACAO BOTAO`, `ENVIAR PIX CLIENTE`, `AVISAR CORRECAO`, `ENVIAR MSG GRUPO`,
`AVISAR CLIENTE PEDIDO CRIADO`, `ENVIAR NOTIF COMPROVANTE GRUPO`, `AVISAR CLIENTE
COMPROVANTE`. O workflow continua ativo e processando (grava estado em
`jsgrafica_memoria_conversas`), mas **nada sai pra fora**, nenhuma automação envia mensagem
pra cliente agora, nem Dizu (desativada pelo PM) nem pedidos (nós desativados pelo Edvam).
Atendimento é 100% manual via Inbox até decisão explícita de religar. A demanda 031 (01-N8N)
continua valendo, precisa entender a causa antes de religar qualquer envio automático.

### Pedidos automáticos, histórico do que foi decidido (2026-07-02, superado pelo acima)
Como o fluxo `06-PEDIDOS` só é acessível depois de passar pelo atendimento IA (travado pela
whitelist), cliente novo não consegue fazer pedido automático pelo WhatsApp hoje. Edvam
confirmou que quer pedido funcionando mesmo com a conversa livre da IA travada, demanda 021
(01-N8N) tem uma proposta aprovada (reconhecimento de palavra-chave, sem LLM) aguardando
implementação.

### PDV / Caixa / Produtos
Funcional em produção. Vendas, saídas, fechamento e dashboard rodando 100% no Supabase.

**Resolvido (demanda 007):** as 946 linhas novas em `jsgrafica_vendas` (`operador='import'`)
são uma importação legítima de um segundo backlog de histórico (planilha
`Caixa_JS_Grafica_ATUAL.xlsx`, abr-jul/2026, R$ 42.459,39), distinta da migração original de
02/05 (2025, R$ 108.820,16). Sem duplicidade, sem conflito, já em uso no dashboard. Junto
entraram 237 linhas em `jsgrafica_saidas` e 50 em `jsgrafica_fechamento` (mesma importação).
Dois bugs de comparação de data como texto no dashboard foram encontrados e já corrigidos/
implantados nessa mesma sessão (antes do fluxo de demandas existir).

### Inbox WhatsApp, ✅ pipeline funcionando ponta a ponta (confirmado 2026-07-02)
**Código do Inbox confirmado correto** (demanda 002). Duas causas reais por trás do "Inbox não
bate com a realidade" (demanda 006/011), ambas corrigidas em 2026-07-02:
1. O workflow `01` fazia uma chamada síncrona ao webhook do `JSGRAFICA_ATENDIMENTO_AI` antes
   de logar, e esse webhook nunca respondia (conexão órfã interna), travando a execução.
   Corrigido: nó `HTTP Request` recebeu `onError: continueRegularOutput` via API do n8n.
2. **Causa maior, encontrada depois:** a Z-API não estava chamando **nenhum** dos 3 webhooks
   do n8n (confirmado via histórico de execuções, zero em todos). O webhook de "mensagem
   recebida" da Z-API não apontava pra URL nenhuma do n8n. Corrigido via API da Z-API
   (`update-webhook-received` → URL do workflow `01`; `update-webhook-delivery` → workflow
   `03`). Webhook de "mensagem enviada" (workflow `02`) ainda não localizado/corrigido:
   endpoint exato não encontrado, não é crítico pra hoje.

**Confirmado com mensagem real** às 01:33:54 UTC de 2026-07-02, "Teste3" apareceu no banco
com `from_me:false`. Sistema pronto pra atendimento real amanhã do ponto de vista de log.

### Automação n8n
8 workflows ativos. Z-API confirmado (demanda 003, via `GET /device`) conectado ao número
real da gráfica: **(81) 8610-8547 ("J S Gráfica")**, bate com o relato do Edvam.
`jsgrafica_agent_config.connected_phone` no banco está desatualizado (mostra número de SP,
parado desde abril), proposta de sincronização automática registrada, não implementada.

**Atendimento automático por IA, GARANTIDO travado para amanhã (demandas 004 + 009):**
- Nenhuma resposta automática foi enviada a ninguém desde a reconexão de hoje, confirmado
  por 3 fontes vazias no banco.
- O workflow `01` de fato roteia qualquer mensagem para o webhook do atendimento sem checar
  telefone (fato de código), **mas** o workflow `JSGRAFICA_ATENDIMENTO_AI` tem um segundo
  gate: nó `FILTRAR TELEFONES AUTORIZADOS`, whitelist hardcoded de 5 números. **Confirmado
  (demanda 009) que nenhum dos 5 é cliente real**, 1 é o número pessoal do Edvam, 1 é
  literalmente nomeado "Cliente Teste", 1 é de outro cliente da agência (Dizu Refeições), 1 é
  um bot de teste, 1 nunca teve interação. O fluxo de pedido automático (`06-PEDIDOS`)
  também só é alcançável depois de passar pela mesma whitelist, igualmente fechado.
- Mesmo para os 5 números autorizados, o envio final parece quebrado: a resposta só é gravada
  numa fila (`jsgrafica_send_queue`) que nunca foi lida por nada, 0 linhas desde sempre.
- **Ressalva:** a garantia depende de ninguém editar os workflows entre agora e amanhã, o
  01-N8N não tem como travar isso tecnicamente (sem acesso de escrita).
- **Correção registrada (demanda 006/009):** a justificativa original de que "desativar
  JSGRAFICA_ATENDIMENTO_AI não afeta o log" estava **errada**, o log já está quebrado hoje,
  ativo ou não (ver seção Inbox acima). Desativar não piora nada, mas também não é a causa
  nem a solução do problema de log, são dois problemas distintos.
- Escopo não confirmado: a decisão "agente não pode responder cliente" cobre só o atendimento
  conversacional + pedidos automáticos, ou também `05 - GESTAO PRODUTOS` e
  `jsgrafica_envio_de_msg` (campanhas)? 01-N8N acha que não se aplica a esses dois, mas pediu
  confirmação do Edvam.

**Achado operacional novo:** o chat "01 - N8N JS GRAFICA" só tem ferramentas de
leitura/execução do n8n via MCP, **não tem como criar credential nem editar workflow**
(demanda 005, bloqueada por isso). Qualquer demanda que exija editar um workflow de fato
precisa de alguém com acesso de escrita (UI do n8n ou credencial de API com permissão).

### Dados
~23% dos contatos fora do DDD 81, causa explicada e parcialmente limpa (demandas 001 + 008):
- Janela confirmada de 2026-05-03 03:58 a 2026-05-04 12:58 UTC em que a instância Z-API
  ficou conectada no número pessoal do Edvam (`5521965185667`, confirmado por ele). **Limpeza
  já executada:** 106 mensagens e 7 contatos "puros" da janela apagados. 5 contatos com
  histórico fora da janela foram mantidos (incluindo o próprio número pessoal do Edvam, 227
  mensagens legítimas de uso do sistema, e curiosamente o número da própria gráfica aparecendo
  como contato de si mesma, achado extra, não investigado, baixa prioridade).
- A maior fatia (16,5%, 327 contatos) é telefone malformado/não parseável, qualidade de
  dado, não contaminação por outro negócio. Ainda não tratada (candidata futura).
- O restante (~6,5%, ~130 contatos) é um "long tail" de dezenas de DDDs, 1 contato cada,
  espalhado de jan-abr, provavelmente ruído orgânico, não confirmado. Ainda não tratado.

## Decisão do Edvam (2026-07-02, tarde), atendimento real começa amanhã

**A partir de amanhã, o número da gráfica passa a atender clientes de verdade.** Decisão
explícita: o agente automático **não pode responder** ninguém, só logar as conversas e
mostrar no Inbox pra atendimento manual. Isso torna as demandas 006 e 009 (abaixo) urgentes,
precisam estar resolvidas antes do atendimento real começar.

- ✅ `5521965185667` confirmado como número pessoal/teste do Edvam, causa da janela de maio
  fechada, dados apagados (demanda 008 concluída).
- ✅ Importação de 946 linhas em `jsgrafica_vendas`: legítima, já em uso, sem ação necessária
  (demanda 007 concluída).
- ✅ Garantido que nenhum cliente real recebe resposta automática amanhã (demanda 009
  concluída), reforço opcional (desativar workflow na UI) ainda pendente de decisão.
- ⏳ **Bloqueado, precisa de ação agora:** demanda 006 (confirmar recebimento ponta a ponta)
  só avança quando alguém mandar uma mensagem de teste pra (81) 8610-8547.

## Decisões do Edvam (2026-07-02, fim de tarde)

- ❌ Não desativar `JSGRAFICA_ATENDIMENTO_AI` por enquanto, a whitelist já é garantia
  suficiente.
- ✅ Desativar `05 - GESTAO PRODUTOS` de vez, essa função passa a ser só pelo admin (aba
  Produtos já construída).
- ✅ `jsgrafica_envio_de_msg` (campanhas) fica desativado por padrão, só ativa e dispara
  manual quando o Edvam quiser mandar campanha, nunca automático.

## ✅ Acesso de escrita ao n8n resolvido (2026-07-02)

Edvam forneceu API key do n8n (escopo workflows). PM agora lê e escreve direto via API:
demandas 010 e 011 já concluídas/aplicadas com isso. Isso também destrava a 005 (JWT
hardcoded) para uma próxima sessão.

## Pendências que dependem só do Edvam agir agora

1. **Mandar mensagem de teste pra (81) 8610-8547**, confirma que o conserto da demanda 011
   funcionou de verdade. PM confere direto, sem precisar de chat.
2. Decidir sobre a whitelist do atendimento IA no médio prazo: formalizar como config editável
   (hoje é hardcoded em código), sem pressa.

## Pendências conhecidas (backlog antigo, não mexido nesta rodada)

- Sugestão de IA no Inbox (botão manual), não iniciado
- Import/export CSV no admin, não iniciado
- Fila de impressão local, fase futura
