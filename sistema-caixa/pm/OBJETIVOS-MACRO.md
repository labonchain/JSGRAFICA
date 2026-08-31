# Objetivos macro, visão de longo prazo

Documento durável. Diferente de `PRODUTO.md` (foto do estado atual, atualizada a cada rodada de
demandas) e `demandas/STATUS.md` (índice operacional), isto aqui é a bússola: os 2 objetivos
grandes que orientam pra onde o sistema deve ir, definidos pelo Edvam em 2026-07-10. Toda demanda
nova relacionada a fechamento de caixa ou a atendimento/Inbox deve ser lida à luz de qual desses
dois objetivos ela serve (ou se é só um passo local, sem servir nenhum dos dois, tudo bem, nem
tudo precisa servir a visão de longo prazo, mas vale saber diferenciar).

## 1. Fechamento de caixa assistido, reduzir a fricção do fim de dia

**O problema real**: fechar caixa é hoje a parte mais estressante do dia pro Admin, acontece no
fim do expediente, cansado, e o sistema pede várias informações manuais (saldo de contas sem API
ainda: Caixa Econômica, Stone, RecargaPay) e apresenta as informações numa ordem que não ajuda
(número que importa enterrado embaixo de blocos menos urgentes).

**Visão de longo prazo**: o agente de WhatsApp da JS Gráfica ajuda ativamente no fechamento:
por exemplo, às 18h manda mensagem pro Admin pedindo os saldos que ainda são manuais, o Admin
responde pelo WhatsApp mesmo, o agente lança no sistema e devolve um resumo do dia. Avisa
proativamente pendências (pagamentos a vencer, divergências) sem o Admin precisar ir procurar.

**Passos concretos identificados até agora** (nenhum é o objetivo final sozinho, são degraus):
- **Pesquisado em 2026-07-10, Stone e Caixa Econômica, mesma conclusão da 084 (Nu/Itaú/BB): não
  compensa agora.**
  - **Caixa Econômica**: tem Open Finance PJ de verdade (saldo disponível/bloqueado), mas só via
    agregador terceiro (ex. Pluggy), mesmo modelo de custo já descartado pra Nu/Itaú/BB na 084
    (~R$540-2.500/mês). E é pior que o que o Mercado Pago já dá hoje: só 1x/dia, transação pode
    levar até 48h pra aparecer.
  - **Stone**: tem API própria ("Stone OpenBank"), mas **não é self-service**, é feita pra
    fintech/parceiro construir produto bancário em cima da Stone (reuniões com o time de
    parcerias, sandbox, homologação formal), não pra um comerciante comum só ler o próprio saldo.
    Sem preço público nem confirmação de que aceitariam um uso tão simples, precisaria de
    contato direto (`parcerias@openbank.stone.com.br`) só pra saber se topam, sem garantia.
  - **RecargaPay**: sem API pública, confirmado desde a 147 (só link de pagamento pro consumidor).
  - **Conclusão por ora**: nenhuma das 3 justifica o esforço/custo sozinha. Só valeria
    reconsiderar se decidir pagar um agregador de Open Finance de qualquer forma (aí Stone +
    Caixa Econômica saem "de graça" na mesma assinatura, o que muda a conta), decisão em
    aberto, não é código.
- Reorganizar a tela de Fechar Caixa hoje (visual): o essencial (contagem física + divergência)
  no topo, resto (histórico, discriminação por forma de pagamento, diagnóstico) mais abaixo:
  ajuste de UI, baixo risco, não depende de nenhuma integração nova.
- Sistema de Diagnóstico de Fechamento (149-153, já construído) é a base de dados/narrativa que
  um agente de WhatsApp fechando o caixa via conversa reaproveitaria, não é o objetivo final,
  mas é a peça que já existe mais perto dele.
- O fluxo "agente pede saldo → Admin responde → agente lança → agente resume" ainda não tem
  nenhuma demanda nem desenho, precisa ser especificado (quando dispara, o que faz se o Admin
  não responder, como confirma que o valor batido é o certo antes de gravar) antes de virar
  código.
- **✅ Passo concreto construído (2026-07-21/22, demandas 225-230): conciliação automática.**
  A divergência diária do fechamento geral crescia dia após dia sem explicação (dinheiro real
  que existia mas nunca tinha sido digitado como entrada/saída em lugar nenhum, cofrinho do
  Mercado Pago, depósitos, movimentações de consolidação que o Admin faz fora do sistema). Em
  vez de resetar o saldo periodicamente (ideia rejeitada pelo Edvam por esconder o problema), o
  sistema agora compara o registrado contra o extrato real do Mercado Pago + saldo informado das
  contas sem API, isola cada diferença como item específico, e deixa o Admin nomear/classificar
 , isso ataca direto a fricção do fim de dia sem precisar de agente de WhatsApp nenhum.
  **Concluído em 28/07 (demanda 231)**: mecanismo de recalcular um fechamento já fechado quando
  um item antigo é classificado tarde, prévia da cascata completa antes de aplicar, aplicação
  sempre um dia de cada vez com confirmação.

  **Atualização de 27/08 (demanda 335)**: o número de "41 pendências, nenhuma aplicada" acima
  está desatualizado, entradas avulsas da janela já foram classificadas desde 12-13/08. A
  auditoria financeira achou um problema estrutural mais grave: fechamentos `Sistema` não são
  recalculados quando a conciliação classifica um item depois do dia já fechado, ainda sem
  demanda formal de correção aberta.
- Especialista financeiro dedicado criado (05-FINANCEIRO, `pm/equipe/05-financeiro.md`), audita
  fluxo de caixa com disciplina de conciliação de 3 pontas, não é mais o PM fazendo isso sozinho.
- **Mapa dos workflows n8n existentes levantado em 2026-07-10**,
  `pm/conhecimento/mapa-workflows-n8n.md`. Achados principais: o padrão de envio via Z-API já é
  simples e replicável (ler `jsgrafica_agent_config`, POST direto); o workflow REPORT SHEETS já
  manda mensagem agendada às 19h pro "Tutor" (mas é resumo de atendimento/CRM, não financeiro:
  serve de referência de arquitetura, não de base a estender diretamente, e tem 1 trecho de
  código suspeito não confirmado como funcional); o workflow 06-PEDIDOS é a melhor referência de
  máquina de estados determinística pra conversa de múltiplos passos (mais segura que LLM
  livre pra captar valor financeiro).

## Prioridade confirmada pelo Edvam (2026-07-10)
Entre os 2 objetivos, o atendimento (objetivo 2) é a dor maior, "500+ atendimentos numa semana"
(confirmado: 463 contatos distintos em 7 dias), Gabi como principal atendente, Edvam também
atende quase tanto (achado da 161, não é "secundário" como parecia), Zu auxiliar. O fechamento
assistido (objetivo 1) é fricção real mas de 1 evento/dia; o atendimento prende a equipe centenas
de vezes por semana. Objetivo 1 está pausado por ora, todo o esforço recente foi no objetivo 2.

## 2. Automação gradual do atendimento no Inbox

**Onde estamos agora**: atendimento automático por IA está pausado por decisão de produto (risco
de banimento do WhatsApp, ver `CLAUDE.md`), hoje o sistema só loga tudo (mensagens recebidas e
enviadas, por cliente e por atendente) e mostra no Inbox pra atendimento 100% manual.

**Por quê pausar foi a decisão certa por agora**: essa fase de log-only não é só uma medida de
segurança, é também a fase de **aprendizado**. Cada conversa real logada constrói a base de
conhecimento real que vai faltar pra qualquer agente automático não errar feio quando for
reativado. **Essa fase de aprendizado está formalmente concluída** (demandas 159-163, ver
checklist abaixo), o que falta agora é só mais 1 semana de dado (decisão do Edvam,
2026-07-12/13, ver "Linha do tempo" abaixo), não mais investigação nova.

### ✅ Pesquisa completa (demandas 159-163, `pm/conhecimento/mapa-jornada-atendimento-whatsapp.md`)

- **159**: mapa da jornada real, 43,3% de toda interação nova é mídia sem texto; pedido raramente
  vem estruturado em texto; confusão real com a Dizu Refeições (~8,6% do tráfego); "Pix
  antecipado, retira depois" não se confirmou no recorte medido (ver ressalva da 160).
- **160**: conversão cruzada Inbox→balcão é real mas pequena (2,6%, casos concretos: Wilson Reis,
  Luciano Araújo, Beronice Maria); o achado do Pix antecipado precisa remedição pós-Fase 5 (156).
- **161**: tempo de resposta mediana 0,7min (mas cauda de até 3,8min em mídia sem legenda, ver
  162); Edvam atende quase tanto quanto Gabi; 56% das sessões não viram pedido (mas ver achado de
  venda fechada em chat que nunca virou pedido, taxa pode estar subestimada); 1 serviço
  (Impressão P&B A4) domina ~62-66% do volume.
- **162**: rajada de mensagens fragmentadas é real (60% das sessões, mediana 22s entre
  mensagens, pausa de ~1-2min = sinal de "terminou de explicar"); equipe demora mais (mediana
  3,8min) pra responder mídia sem legenda; frases reais coletadas (padrão: nome + confirmação
  objetiva do que recebeu antes de perguntar/informar preço); direcionar sem perguntar só
  acontece pra documento óbvio de 1 página (boleto/fatura), pra tudo mais, a equipe sempre
  pergunta.
- **163** (executada, não é pesquisa mas dado relevante): balcão ganhou lembrete leve + criação
  rápida de contato, deve aumentar a cobertura de dado pra medir conversão cruzada Inbox→balcão
  daqui pra frente.

**Dizu Refeições**: empresa do mesmo grupo (LabOnchain), vai ganhar sistema/número próprios pro
ramo de alimentação, o tráfego de comida deve migrar pra lá quando existir. Até lá, o agente
precisa reconhecer esse padrão (prato + acompanhamento + preço fixo) e não tratar como gráfica.

### Investigação de jornadas, cancelar/alterar/escalação (PM, 2026-07-17)

Antes de fixar `id`s de botão, investiguei no log real o que "cancelar" e outras intenções fora
do fluxo de mídia realmente significam (detalhe completo em
`pm/conhecimento/mapa-jornada-atendimento-whatsapp.md`, seção 10). Resumo:
- **"Cancelar" é sempre sobre desistir de mandar fazer o serviço**, nunca sobre mensagem nem
  sobre produto do catálogo. E acontece muitas vezes **antes de existir um pedido formal**
  (ainda negociando), não dá pra desenhar como "cancelar um pedido que já existe" só.
- **"Alterar/corrigir" é intenção própria**, diferente de cancelar, cliente quer ajustar o que
  já pediu (ex. corrigir dado de um currículo antes de imprimir), não desistir.
- **Não dá pra medir de dado histórico "quando escala pro humano"**, hoje 100% já é humano, não
  existe caso de IA que tentou e escalou pra aprender com ele. A régua de segurança é: só
  automatizar o que a equipe já resolve RÁPIDO E SEM HESITAR (documento óbvio, 59% da mídia
  pura), qualquer intenção fora disso (cancelar, alterar, reclamação, negociação de preço)
  escala pro humano por padrão, até existir dado real de como resolver cada uma.
- **Prática de `id` de botão** (pesquisa técnica, ver histórico de conversa): Z-API separa `id`
  (estável, usado pela lógica do workflow) de `label` (texto visível, pode mudar à vontade sem
  quebrar nada), nem Z-API nem mensagem de sessão (dentro da janela de 24h) exigem aprovação da
  Meta pra botão, então não há trava de burocracia, só disciplina de não reaproveitar um `id`
  existente pra um significado novo.

### 🎯 Desenho da Fase 1 do agente (decidido em 2026-07-12/13, ainda não construído)

Fluxo no estilo "iFood" (agente prepara, humano aprova antes de qualquer coisa entrar na
esteira), escopo inicial: **só sessão nova que começa com mídia sem legenda** (43% do volume,
o caso mais estudado). Outros tipos de mensagem continuam 100% manuais nesta primeira versão.

1. Cliente manda arquivo sem legenda → agente confirma recebimento (template simples).
2. Em paralelo, LLM lê o arquivo (mesma tecnologia da transcrição de áudio, 058/059, estendida
   pra imagem/PDF), identifica se é documento óbvio de 1 página ou algo ambíguo.
3. Documento óbvio (boleto/fatura) → agente já propõe produto+preço direto. Qualquer outra coisa
   → pergunta em aberto o que o cliente quer (replica o padrão real medido na 162).
4. Espera o cliente responder **sem reagir a cada mensagem fragmentada**, usa a pausa de
   ~1-2min (achado da 162) como sinal de "terminou de explicar", acumula a resposta inteira.
5. Gera um **pedido PENDENTE DE APROVAÇÃO**, nunca entra na esteira sozinho.
6. **UI de aprovação** (decisão do Edvam, 2026-07-12): popup de notificação + revisar/aprovar na
   aba **Fila de impressão** (hoje subutilizada, só mostra confirmado/em produção; vira também
   o lugar de pedido pendente de aprovação, em vez de criar aba nova).
7. Detecção do padrão Dizu acontece ANTES do fluxo acima, não confunde pedido de comida com
   pedido de gráfica.

### 📋 Checklist técnico (atualizado 2026-07-13)

**Fase A, preparar agora, sem ativar nada, zero risco pro que já funciona:**
- [ ] Whitelist de números autorizados vira config editável (hoje hardcoded, achado da 004):
  01-N8N, comportamento idêntico ao de hoje, só muda a fonte.
- [ ] Status novo "aguardando aprovação" no pedido + UI de revisão/aprovação na Fila de
  impressão, 03-APP. Nada cria pedido nesse status ainda, só fica pronto.
- [ ] Spike técnico: provar que o Gemini lê imagem/PDF de verdade (conta página, identifica tipo
  de documento), validação isolada, sem conectar em conversa real ainda.

**Fase B, fim de semana seguinte (ou quando o Edvam decidir, após mais 1 semana de dado):**
- [x] Workflow de conversa de verdade (n8n) implementando os 7 passos do desenho acima:
  **demanda 206** (2026-07-17), workflow "206 - JSGRAFICA | AGENTE FASE B (TESTE ISOLADO)" (62
  nós, inativo), testado ponta a ponta (documento óbvio, ambíguo, escalonamento, rajada) só com o
  número do Edvam, envio real via WhatsApp confirmado. `01 - LOG MSG RECEBIDAS` confirmado
  intocado.
- [x] **Demanda 208 (aprovada 2026-07-17, executada e concluída em 2026-08-14)**, fechou os 3
  gaps que a própria 206 tinha deixado registrados (corrida de escrita no buffer de rajada
  eliminada de verdade via função Postgres atômica, heurística "sempre P&B A4" corrigida pra
  escalar sem confiança real, todos os gatilhos de escalonamento do desenho da 204 implementados:
  negociação de pagamento fora do padrão, arquivo com senha/erro técnico, correções repetidas sem
  resolver, timeout do p90 do tipo de serviço) **+ os 2 itens adicionados no mesmo dia**:
  detecção permanente de padrão Dizu Refeições reincorporada (revertendo remoção indevida da 259,
  com escalonamento real + trava de dado estrutural, nenhum pedido nasce de mensagem Dizu) e
  lista de categorias do workflow atualizada com Recarga Celular/VEM. Continua 100% isolado, só
  no número do Edvam, workflow `01` confirmado intocado ao final. Relato completo:
  `pm/demandas/208-fase-b-fechar-gatilhos-e-corridas-pendentes.md`.
  - **Achado resolvido em 2026-08-15 (demanda 272)**: lista de categorias reduzida de 15 pra 7
    itens (6 categorias reais do catálogo + "Outro"), decisão direta do Edvam, folgada dentro do
    limite de 10 linhas do WhatsApp. Deixou de ser bloqueio.
  - **Achado da sessão de reavaliação de 2026-08-14, preservado**: a confusão com a Dizu Refeições
    não é um problema temporário que a 259 estava certa em apagar do desenho, o número da JS
    Gráfica continua sendo o número que todo mundo tem, ligado ao mesmo espaço físico e ao mesmo
    grupo, mesmo depois de a Dizu ganhar número próprio. É um estado permanente e estrutural, de
    volume baixo mas constante, não um bug a ser eliminado. Ver Exemplo 8 de
    `pm/conhecimento/blueprint-conversas-exemplo-agente.md` e detalhe completo em
    `project_contaminacao_dizu_refeicoes.md` (memória do projeto).
- [x] **Conectar no roteamento real do workflow `01`, demanda 274 (2026-08-15), CONECTADO DE
  VERDADE.** Novo branch no `Switch Destino`: telefone autorizado + mídia sem legenda + sem
  sessão de pedido ativa → chama o `206`. O `206` trocou o filtro hardcoded do número do Edvam
  pela mesma checagem real de whitelist (`jsgrafica_telefones_autorizados`) que o `01` usa.
  Webhook de produção não registrou via API (achado de infra, 5 tentativas falhas), destravado
  pelo Edvam com um toggle manual na UI do n8n, confirmado pelo PM com chamada HTTP real. Testado
  com mensagem real do WhatsApp do Edvam, ponta a ponta, sem regressão no fluxo de quem não está
  na whitelist.
- [x] **Regra de expansão, parte técnica pronta, decisão de QUEM ainda é do Edvam.** Demandas
  275/276 (2026-08-15): painel no Admin (dentro de Configurações → Conectar API, e também direto
  na conversa do Inbox) pra ligar/desligar qual telefone o agente atende, sem SQL, toggle de 1
  clique, cria a linha se o telefone ainda não existir. O "kill switch" e a expansão gradual
  viraram autosserviço puro pro Edvam, não dependem mais de pedir pra alguém mexer no banco.
- [x] Consertar ou substituir o caminho de envio quebrado (`jsgrafica_send_queue`,
  `ENETUNREACH`, achado da 014), **resolvido pela 206**: reaproveitado o padrão simples que já
  funciona (workflow 13, POST direto Z-API), sem tocar no `jsgrafica_send_queue` antigo.

**Fase C, expansão de escopo (2026-08-15, decisão do Edvam, mesmo dia da conexão real):**
- [x] **Agente passa a atender texto puro, não só mídia, demandas 277 (desenho, 06-ATENDIMENTO)
  + 278 (implementação, 01-N8N).** Reabre a "Proposta 3" da 243, que recomendava esperar por causa
  do risco de dado pessoal em fluxo de texto (Regra 4 do manual, 234), o Edvam decidiu avançar
  mesmo assim, mantendo a mesma disciplina: texto objetivo → proposta direta; texto ambíguo →
  pergunta → lista; texto de dado pessoal/alto toque (currículo, digitação, antecedentes, **conta
  gov**, gap de regex achado e corrigido na 278) → escala direto, nunca decide sozinho. 2 exemplos
  novos no blueprint com citação real (Maria Clara, Débora Borges). Testado 100% via webhook real
  de produção nos 4 caminhos (objetivo, ambíguo, dado pessoal, saudação solta/fora de escopo) +
  regressão de mídia confirmada.
- Critério exato de quando uma "rajada" é considerada completa (~1-2min é o achado da 162, o
  buffer real ficou em 90s, confirmado cobrindo texto também sem mudança, demanda 278), resolvido
  na prática, não formalizado como "regra geral documentada" à parte.

**Onde isso deixa o agente hoje (2026-08-15)**: tecnicamente pronto e rodando em produção, mídia
e texto, conectado ao `01`, controlado por painel no Admin, mas só responde quem estiver na
whitelist, que hoje só tem os 5 números internos/teste de sempre. Nenhum cliente real foi
adicionado ainda; isso continua sendo decisão explícita do Edvam, agora feita por 1 clique no
painel em vez de pedir demanda nova toda vez.

### Linha do tempo (decisão do Edvam, 2026-07-12/13)
Acumular mais 1 semana de log de conversas reais (incluindo o efeito da 163 na cobertura de
contato) e monitorar a jornada da equipe, revisita a decisão de avançar com a implementação
no próximo fim de semana. A Fase A (preparação) pode rodar durante essa semana, sem esperar.

### Revisão do PM (2026-07-16), véspera do fim da semana de espera
Amanhã (sexta, 17/07) fecha a semana adicional de log decidida em 12-13/07, o fim de semana
que se aproxima é o ponto de decisão que o Edvam definiu pra revisitar o avanço da
implementação. Revisão do que mudou desde então, sem executar nada:

**Fase A (preparação), concluída em 2026-07-16, os 3 itens.**
- [x] Whitelist de números editável (01-N8N), concluído desde 03/07 (demanda 015)
- [x] Status "aguardando aprovação" + UI de revisão na Fila de impressão (03-APP), **demanda
      202**, card fúcsia destacado + Aprovar/Rejeitar, nenhum fluxo cria esse status ainda
      (confirmado em produção: 0 pedidos nesse status)
- [x] Spike técnico Gemini lendo imagem/PDF (03-APP), **demanda 203**, testado com 13 mídias
      reais de clientes: 100% de acerto em contagem de páginas de PDF (inclusive 7 páginas) e
      classificação documento-óbvio-vs-ambíguo com extrações corretas e específicas. **Conclusão:
      a abordagem desenhada pra Fase 1 é viável.** Achado secundário sem impacto: o rótulo de
      "tipo de mídia" erra às vezes (chama PDF de 1 página de "imagem"), mas não afeta as duas
      métricas que importam (páginas, óbvio/ambíguo), ajustar prompt fica pra quem implementar a
      Fase B, não bloqueia a decisão.

**Pronto pro fim de semana de decisão**: a preparação combinada em 12-13/07 está completa. A
decisão de avançar pra Fase B (o workflow de conversa de verdade) é do Edvam.

**Progresso indireto que fortalece a base de dados do futuro agente** (não são itens da Fase A,
mas resolvem exatamente o tipo de "dado mal lido" que faria um agente automático errar):
- Nome de contato ↔ nome do pedido sincronizados (167/172/184/187), 24 contatos com nome
  inválido limpos, 32 com nome errado da empresa corrigidos, busca por nome Unicode estilizado
  corrigida. Um agente lendo `lead_name` hoje encontra dado bem mais confiável que em 07-07.
- Card do Atendimento com múltiplos itens não esconde mais venda parcial (190), era um "fluxo
  cego" real: pedido de WhatsApp com 2+ itens entregava só o primeiro e escondia o resto. Um
  agente automatizando a partir desse fluxo teria herdado esse bug.
- Varredura sistemática de pedidos entregues sem pagamento confirmado (173), confirma que não
  há um padrão estrutural de perda de dado financeiro escondido no histórico recente.

**Achados sem mudança desde 07-13** (ainda válidos, não reavaliados nesta revisão): mapa da
jornada (159-163), desenho da Fase 1 (mídia sem legenda, aprovação estilo iFood), tráfego da
Dizu Refeições ainda misturado (~8,6%, sem número próprio ainda confirmado), critério exato de
timeout de rajada ainda não cravado.

**O que isso significa pro fim de semana**: tecnicamente dá pra decidir avançar (a pesquisa e o
desenho continuam de pé), mas os 3 itens de Fase A não existem ainda, se o Edvam quiser
realmente começar a Fase B no fim de semana, a Fase A precisa ser feita primeiro (é rápida, os 3
itens são preparação de baixo risco, sem ativar nada). Sem isso, "avançar no fim de semana"
significaria pular a preparação combinada.

**Estado das peças já existentes** (herdado, ainda válido):
- Log de mensagens recebidas/enviadas, funcionando (workflows 01/02/03 do n8n).
- Sugestão de IA no Inbox (botão manual, demanda 048), já existe e é o meio-termo atual: a IA
  ajuda o atendente a responder mais rápido, mas a decisão de enviar continua sempre humana.

### Especialista dedicado criado (2026-07-28) + primeiro exercício proposto

Depois de ~10 dias de foco total no financeiro (demandas 213-233), o Edvam pediu pra retomar o
planejamento do objetivo 2. Duas decisões novas:

- **Especialista dedicado criado**: "06 - AUTOMAÇÃO ATENDIMENTO INBOX" (`pm/equipe/06-atendimento.md`)
 , desenho de conversação e automação de atendimento é disciplina própria, não é 02-DADOS (o
  Edvam recusou explicitamente essa alocação). Metodologia embasada em prática real de
  atendimento automatizado: autonomia proporcional à confiança (mais conservador em
  pagamento/cancelamento/reclamação), tratamento de erro em camadas (reformular → opções →
  escalar), mapear caminho feliz + erro + escalação juntos, e as restrições reais do WhatsApp
  (janela de 24h pra mensagem livre, taxa de qualidade do número como base concreta do risco de
  banimento já documentado).
- **✅ Demanda 234 concluída (2026-07-29)**: 100 clientes reais reconstruídos (amostra
  estratificada de 628, 2 camadas: estruturada + qualitativa com texto real de 40). Manual de
  resposta com 11 regras/achados citáveis (`pm/conhecimento/manual-resposta-ia-100-clientes.md`)
 , confirma o desenho já decidido da Fase B em vários pontos (ex.: a própria equipe já instrui
  por escrito um cliente a não antecipar Pix antes da confirmação de valor). Lista de candidatos
  da 209 refinada: André Américo passa de "atenção" pra **excluído** (mistura pedido de gráfica e
  de comida na mesma janela de mensagens, não só sessões separadas); Lidiane Oliveira entra como
  candidata nova limpa; José Roberto Silva estava bloqueado até a 208 fechar, **208 concluída em
  2026-08-14** com o gatilho de "múltiplas etapas de acabamento" coberto pelos novos gatilhos
  gerais de escalonamento; vale reavaliar esse candidato numa futura revisão da lista da 209 (não
  refeito automaticamente, fora do escopo da 208).
- **✅ Demanda 235 concluída (2026-07-29)**: investigado o achado da 234 sobre
  `data_timestamp`, **zero pontos quebrados em produção** (app, scripts e RPCs do Postgres
  sempre comparam o valor bruto, sem `to_timestamp()`; coluna 100% consistente em ms). O bug era
  um erro nas consultas SQL ad hoc da própria investigação 234, não algo real em produção.
  Confirmado com evidência que 159-163/204/205 não foram afetadas. 1 achado incidental (domínio
  01-N8N, ver demanda 236 proposta): o workflow `02 - LOG MSG ENVIADAS` calcula `data_timestamp`
  mas nunca grava (fora do mapeamento CREATE/UPDATE), sem sintoma hoje por causa do fallback já
  existente pra `sent_at`.
- Os 3 pontos em aberto da Fase B (conectar roteamento real / regra de expansão / escopo
  texto-puro) continuam sem decisão, o Edvam disse explicitamente "ainda não" quando perguntado
  se queria avançar neles agora, só queria entender onde a frente estava.

### Fase D: virada de arquitetura, Caminho C (2026-08-16, decisão do Edvam)

O `206` (árvore de 19 nodes IF decidindo toda a conversa) gerou 6 bugs reais no mesmo dia
(demandas 279-289), o padrão comum entre eles é regra nova quebrando regra antiga sem ninguém
prever a interação. O Edvam apontou o problema estrutural direto: uma árvore de IFs não escala
pra atendimento de qualidade, por mais que cada regra individual esteja certa. Decisão tomada,
consciente do custo de teste maior: substituir o `206` por um agente de IA real
(`@n8n/n8n-nodes-langchain.agent`, mesmo tipo de node que o `JSGRAFICA_ATENDIMENTO_AI` já usa) que
raciocina sobre a conversa e aciona ferramentas de código puro pra tudo que não pode ser
inventado (preço, Pix, pedido, confirmação, escalação) - a ferramenta sempre recalcula o dado da
fonte real, nunca aceita o que a IA tenta passar como valor.

**Desenho concluído** (análise, sem código):
- Demanda 290: comparação inicial dos 3 caminhos (reviver `ATENDIMENTO_AI`, dar liberdade de
  texto pro `206`, ou algo novo) - recomendação original (híbrido) superada pela 292.
- Demanda 291: régua de correção de tom + mecanismo de contexto de conversa recente (8 mensagens/
  7 dias), conteúdo reaproveitado como insumo do prompt do agente novo, não descartado.
- Demanda 292: avaliação da 3ª opção (agente + ferramentas), contagem exata dos 19 IFs, mapa das
  9 ferramentas necessárias contra o código que já existe hoje, riscos novos com mitigação real
  (guardrail de validação de saída é o principal). **Recomendação final: Caminho C.**
- Demanda 293: fronteira exata entre IA sozinha, automação (as 9 ferramentas) e equipe humana -
  critério objetivo de acionamento de cada ferramenta, régua de escalação em 2 camadas, os 3
  cenários de retomada depois de escalar.
- Demanda 294: coluna `enviado_por` (`ia`/`equipe`/`sistema`) criada em
  `jsgrafica_log_msgs_privadas`, os 3 caminhos implementados e testados com mensagem real -
  pré-requisito técnico pro agente novo saber diferenciar mensagem de humano da própria.

**Sequência de implementação criada em 2026-08-16** (demandas 295-299, ver
`analise-arquitetura-atendimento-humanizado-vs-estruturado.md` seção 7.7 pra justificativa da
ordem), cada uma bloqueada pela anterior:
- [x] **295** (06-ATENDIMENTO, concluída 2026-08-17): contrato técnico completo, fundamentado no
      código real. Achados: desconto de volume não documentado, `206` de hoje não gera Pix
      nenhum. `checar_sessao_pedido_ativa`/`buscar_contexto_conversa_recente` viraram 1 pré-passo
      de código, trava Dizu em 2 lugares. Detalhe: `pm/conhecimento/caminho-c-contrato-das-ferramentas.md`.
- [x] **296** (01-N8N, concluída 2026-08-18): as 6 ferramentas + pré-passo + trava Dizu construídas
      isoladas, testadas com Pix real, nenhum agente conectado ainda.
- [x] **297** (01-N8N, concluída 2026-08-18): workflow do agente construído (`@n8n/n8n-nodes-
      langchain.agent`), guardrail de valor provado bloqueando com teste negativo isolado, testado
      nas 4 categorias da fronteira. Achado 305 aberto no processo (Alto Toque não determinístico).
- [x] **305** (01-N8N, concluída 2026-08-18): gate determinístico de Alto Toque fechado, mesmo
      padrão do Dizu, achou e corrigiu 2 regressões reais no processo.
- [x] **298** (01-N8N, concluída 2026-08-18): teste adversarial, 13 tentativas reais. 1 vazamento
      crítico achado (prompt de sistema vazando por pedido de "tradução/resumo") corrigido com 2
      camadas e retestado; guardrail de telefone divergente fechado deterministicamente.
- [x] **299 e continuação** (01-N8N/06-ATENDIMENTO): piloto passou de 4 dias planejados pra um
      ciclo bem mais longo, com 17 bugs reais achados e corrigidos ao longo do caminho (314-324).
      Decisão formal do Edvam via demanda 330 (27/08): continuar restrito à whitelist interna por
      mais um ciclo, sem expandir pra cliente real ainda, sem pausar. Confirmado com teste real
      que a IA aciona corretamente preço, pedido e Pix de ponta a ponta (demanda 328).

**O `206` está congelado** desde a demanda 292 (nenhuma regra nova nele) e, desde a conexão da
299, deixa de receber tráfego da whitelist (substituído pelo agente novo nesse ponto), mas continua
existindo intacto como caminho de reversão rápida se o piloto mostrar problema real.

## Como usar este documento

Ao escrever uma demanda nova relacionada a fechamento de caixa ou Inbox/atendimento, checar se
ela é um passo em direção a um desses objetivos, se for, citar aqui no "Contexto" da demanda
pra manter o fio visível. Atualizar este arquivo quando um passo concreto for concluído ou quando
o Edvam refinar a visão.
