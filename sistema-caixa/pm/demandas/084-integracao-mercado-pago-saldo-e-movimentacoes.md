# 084 — Integração com Mercado Pago: saldo e movimentações em tempo real (piloto, sem custo)

Status: concluída — **fechada de vez, verificado pelo PM em produção (2026-07-08, 3ª rodada)**.
Segredo/algoritmo confirmados corretos: um evento simulado do tópico "Pagamentos" validou de
verdade (`assinatura_valida: true`, confirmado direto na tabela `jsgrafica_mercadopago_eventos`,
não só pelo "200 OK" — o endpoint sempre responde 200 por exigência do Mercado Pago, mesmo com
assinatura inválida). O tópico "order" especificamente não valida — inconsistência do lado do
Mercado Pago (mesmo sintoma relatado por terceiros no repositório oficial do SDK), fora do nosso
controle. Detalhe completo e alerta pra demanda 124 em
`pm/conhecimento/mercado-pago-integracao.md`, seção 9.
Criada em: 2026-07-07
Aprovada em: 2026-07-07
Concluída em: 2026-07-08
Chat executor: 03 - APP JS GRAFICA

## Contexto
Edvam quer, no futuro, conectar as contas bancárias reais da gráfica (Nubank, Mercado Pago,
Itaú, Banco do Brasil) pra ter consulta em tempo real de saldo e atualização automática de
entradas/saídas por conta. Pesquisa do PM: pra Nubank/Itaú/BB, o único caminho realista é um
agregador de Open Finance pago (Pluggy ~R$2.500/mês, Tecnospeed ~R$1.500 entrada + R$540/mês) —
não é o caso desta demanda.

**Mercado Pago é diferente**: como plataforma de pagamento (não banco tradicional), tem API
própria de desenvolvedor, gratuita (fora das taxas de transação que a gráfica já paga), sem
precisar de agregador de Open Finance:
- Relatório "Dinheiro em conta" (`account_money`): transações que afetaram o saldo — pagamentos,
  entradas, estornos, disputas, por período.
- Relatório "Liberações" (`released_money`): saldo disponível, bloqueios/desbloqueios.
- Autenticação: Access Token + Public Key, gerados de graça no painel de desenvolvedor do
  Mercado Pago (conta da própria gráfica).

Decisão do Edvam: **começar só pelo Mercado Pago** (sem custo) como piloto, validar se ajuda de
verdade, e só then decidir se vale investir no agregador pago pra Nu/Itaú/BB.

## Objetivo
Sistema consulta automaticamente saldo e movimentações da conta Mercado Pago da gráfica, sem
precisar de lançamento manual pra essa conta.

## Escopo
**Antes de tudo: ler `pm/conhecimento/mercado-pago-integracao.md`** — base de conhecimento
completa, atualizada em 2026-07-08 com pesquisa direta na documentação oficial (as duas perguntas
que ficaram em aberto na v1 desta demanda já foram resolvidas, ver seções 5 e 6 lá). Não
redescobrir isso do zero.

**Mudança de abordagem em relação à v1 desta demanda**: não usar os relatórios "Dinheiro em
conta"/"Liberações" como fonte principal — são **assíncronos** (`POST` cria, espera, `GET` baixa
arquivo depois), confirmado na documentação. Em vez disso, usar a busca de pagamentos (síncrona,
responde na hora, sem esperar arquivo nenhum) — o sistema monta o próprio saldo/histórico somando
os pagamentos reais retornados. Relatório assíncrono fica de fora do escopo inicial.

**Qual API usar (decisão tomada com o Edvam durante o cadastro da app, 2026-07-08)**: a aplicação
foi criada em "Checkout Transparente **via Orders**" — a API de Orders, não a API de Pagamentos
mais antiga que a base de conhecimento original pesquisou. Confirmar no início da implementação
se os endpoints/campos (`external_reference`, busca de transações, Pix) mudam de nome/formato na
API de Orders em relação ao que está documentado — a base de conhecimento precisa ser atualizada
com a referência real da API de Orders antes de codar, não assumir que é 1:1 com a API antiga.

**Credenciais de teste já geradas e guardadas** — `MERCADOPAGO_PUBLIC_KEY_TESTE` e
`MERCADOPAGO_ACCESS_TOKEN_TESTE` já estão em `.env.local` (App "Pagamentos JS Grafica", User ID
`3527198843`, 1 usuário de teste já criado no painel). Não precisa pedir credencial de novo — só
ler do `.env.local` ao começar a implementação.

- Incluído:
  1. Cadastrar um app no painel de desenvolvedor do Mercado Pago (conta da gráfica) — **modo
     Teste (sandbox) primeiro**, gerar Access Token pelo jeito simples (copiar da tela, não fluxo
     OAuth completo — decisão já tomada, ver seção 6 da base de conhecimento: OAuth completo é
     complexidade desnecessária pro porte da gráfica). Guardar de forma segura (mesmo padrão de
     credencial sensível já usado pra Z-API/Gemini: tabela com RLS travada, nunca no `.env`
     exposto ao cliente).
  2. **Lembrete de renovação do token**: como o token estático não renova sozinho (confirmado),
     registrar de alguma forma (campo de data de expiração + aviso visual no admin quando estiver
     perto de vencer, ou pelo menos uma nota bem visível no `STATUS.md`/`CLAUDE.md`) — sem isso, a
     integração para de funcionar silenciosamente daqui a ~180 dias.
  3. **`GET /v1/payments/search`** — rota própria (`app/api/mercadopago/...` ou dentro de
     `lib/mercadopago.ts` novo) que busca os pagamentos reais da conta, filtra por período, soma
     valores. Essa é a fonte principal de dado — testar em sandbox primeiro com pagamento de
     teste real antes de qualquer tela.
  4. **Webhook** (complementar, não substitui o item 3): endpoint público que recebe avisos em
     tempo real (pagamento aprovado, estorno), valida a assinatura (`x-signature`, HMAC-SHA256 —
     código de exemplo já na base de conhecimento) antes de confiar no aviso.
  5. Exibir saldo/movimentações em algum lugar do sistema — decidir com o PM/Edvam se entra
     direto em algum relatório existente (ex. dentro de "Controle de Caixa") ou é uma tela própria
     "Conta Mercado Pago" (mais simples, menos risco de misturar com o fluxo de caixa físico que
     as demandas 074/077/121 já mexem).
- Fora de escopo: Nubank, Itaú, Banco do Brasil (dependem de agregador pago, decisão futura).
  Misturar automaticamente esse saldo no cálculo de divergência do fechamento físico (074/077) —
  por ora é só consulta/exibição, não afeta o fechamento de caixa em dinheiro. Relatórios
  assíncronos (settlement/release) — fora do escopo inicial, avaliar depois se fizer falta.

## Critérios de aceite
- [x] App cadastrado no Mercado Pago (sandbox), token funcionando
- [x] `GET /v1/payments/search` retornando pagamentos reais de teste, testado em sandbox
- [x] Webhook implementado e **recebendo** de verdade (testado com POST real em produção,
      responde 200, grava no log) — **validação de assinatura implementada e testada contra os
      vetores de teste reais do SDK oficial, mas ainda não exercida com um aviso genuíno do
      Mercado Pago** — falta 1 passo manual do Edvam, ver "Pendência" abaixo
- [x] Sistema mostra saldo/movimentações calculados a partir dos pagamentos reais (não relatório)
- [x] Lembrete de expiração do token implementado/documentado de forma visível
- [x] Testado com pagamento real de teste na conta MP da gráfica (sandbox), não fictício — 2x

## Riscos e cuidados
Token do Mercado Pago é credencial sensível — mesmo cuidado de RLS/segurança já aplicado ao token
Z-API (demandas 024/025). Não deixar essa integração influenciar o cálculo de divergência do
fechamento físico sem decisão explícita — são coisas conceitualmente diferentes (dinheiro físico
contado vs. saldo digital consultado).

## Referências
**`pm/conhecimento/mercado-pago-integracao.md`** (ler primeiro). Mercado Pago Developers
(`mercadopago.com.br/developers`) — relatórios "Dinheiro em conta" e "Liberações", Webhooks.
`jsgrafica_agent_config` (padrão de guardar credencial sensível).

## Relato de execução

### Achados confirmados por teste real em sandbox (não só documentação) — atualizados na base de
conhecimento (`pm/conhecimento/mercado-pago-integracao.md`, seção 8 nova):

- **A API de Orders e a API clássica de Pagamentos são bem mais diferentes do que a base de
  conhecimento v1 supunha** — não é só nome de endpoint:
  - `GET /v1/orders` (busca da Orders API): `page`/`page_size` (não `limit`/`offset`), resposta
    `{ data, paging }` com paginação em **string**, range máximo de **1 mês**.
  - `POST /v1/orders`: status `"processed"`/`"accredited"` pra um pagamento aprovado — não
    `"approved"` como a API clássica.
  - `POST /v1/payments` (criar pagamento pela API clássica): **bloqueado** pra este app
    (`401 Unauthorized use of live credentials`) — confirma que um app "Checkout Transparente
    via Orders" só cria pagamento pela Orders API.
  - `GET /v1/payments/search`/`GET /v1/payments/{id}` (**leitura** pela API clássica): funcionam
    normalmente pra pagamentos criados via Orders API, com `limit`/`offset` de verdade, e —
    achado mais importante — trazem `net_received_amount`/taxas/`money_release_date` que o
    objeto de pagamento da própria Orders API **não expõe**.
- **Decisão de arquitetura**: usar `GET /v1/payments/search` como fonte de saldo/movimentações
  (não `/v1/orders`) — é o único que traz o valor líquido real (após taxa do Mercado Pago) e
  status de liberação. A Orders API fica reservada pra quando a 124 (Parte B) precisar criar
  cobrança.
- **`config.online.callback_url` da Orders API não dispara webhook real** pra pagamento direto
  por token (testado 2x, aguardando o suficiente cada vez — nenhum POST chegou). Só existe uma
  forma confirmada de receber webhook de verdade: a assinatura configurada no painel
  (Aplicação → Webhooks → Configurar notificações) — não existe endpoint de API pra isso.
- **Algoritmo de validação da assinatura confirmado linha a linha** contra o código-fonte real +
  testes unitários do SDK oficial `mercadopago/sdk-nodejs` (não só a documentação, que a própria
  base de conhecimento já avisa ser confusa) — testado com os vetores de teste reais do SDK
  antes de considerar pronto (bateu certo).

### O que foi feito:
- `jsgrafica_mercadopago_config` (nova, RLS travada sem política — mesmo padrão do token Z-API,
  024/025) guarda `access_token`/`public_key`/`webhook_secret`/`token_criado_em`/`ambiente`, com
  índice único garantindo no máximo 1 config `ativo` por vez. Seedada com as credenciais de Teste
  já geradas (`.env.local`).
- `jsgrafica_mercadopago_eventos` (nova) — log append-only de todo webhook recebido (tipo, ação,
  id do recurso, se a assinatura validou, payload bruto, erro se houver) — prova de que o
  endpoint está funcionando e histórico pra depuração.
- `lib/mercadopago.ts` novo: `getConfigMercadoPago()` (cache 1min, mesmo padrão de `lib/zapi.ts`),
  `buscarPagamentos()` (`GET /v1/payments/search`), `buscarPagamentoPorId()`,
  `validarAssinaturaWebhook()` (HMAC-SHA256, algoritmo confirmado real), `diasParaExpirarToken()`.
- `GET /api/mercadopago/movimentacoes` — monta saldo bruto/líquido + lista de movimentações a
  partir dos pagamentos reais, período configurável (7/30/90 dias no seletor da tela).
- `POST /api/mercadopago/webhook` — endpoint público, valida assinatura (`data.id` vem da query
  string da própria URL do webhook, não só do corpo — achado confirmado no SDK), grava evento,
  responde rápido (sempre 200, mesmo com assinatura inválida/não configurada — fica registrado
  pra investigar, sem entrar em loop de reenvio do Mercado Pago).
- `components/TelaMercadoPago.tsx` (novo, só Admin) — nova aba "💳 Mercado Pago" dentro do grupo
  Financeiro. **Decisão registrada**: tela própria, não misturado com o fluxo de caixa físico
  (074/077/121) — são coisas conceitualmente diferentes, como o próprio risco da demanda já
  apontava. Mostra saldo bruto/líquido, lista de movimentações (data/método/status/referência/
  valores), badge do ambiente (Teste/Produção) e aviso visual quando o token está a ≤30 dias de
  expirar (ou já expirado).
- Nota de expiração do token também adicionada no `CLAUDE.md` do projeto (visível fora do
  sistema, caso ninguém abra a tela por meses).

### Testes realizados e resultado:
- App sandbox confirmado funcionando: `GET /users/me` com o token de Teste retornou o usuário de
  teste real (`TESTUSER8756730226131997578`, User ID 3527198843 — bate com o da demanda).
- **2 pedidos reais de teste criados via `POST /v1/orders`** com cartão de teste APRO (aprovação
  garantida) — R$10,00 e R$5,00, ambos aprovados de verdade (`status: processed/accredited`),
  confirmados aparecendo em `/v1/payments/search` com valor líquido correto (R$9,50 e R$4,76,
  descontada a taxa do Mercado Pago).
- `GET /api/mercadopago/movimentacoes` testado local e **em produção**: retornou os 2 pagamentos
  reais, saldo líquido exato (R$14,26), token com 180 dias pra expirar (recém-configurado).
  Tela testada via Playwright — layout, seletor de período, badge de ambiente, tudo certo.
- Webhook: `POST` de teste manual direto no endpoint deployado (`https://admin.jsgrafica.site/
  api/mercadopago/webhook`) confirmado recebendo e gravando no log corretamente, inclusive o
  caminho de erro gracioso (sem segredo configurado ainda, mensagem clara, sem derrubar nada) —
  mesmo padrão do caminho de erro gracioso já usado pra `GEMINI_API_KEY` (048/059). Apagado
  depois de confirmar.

### Pendência que depende do Edvam (não é possível eu fazer sozinho):
Pra fechar 100% o critério "webhook validando aviso real", falta **1 passo manual único**, que só
quem tem acesso ao painel consegue fazer (confirmado: não existe endpoint de API pra isso):
1. Acessar [Painel do desenvolvedor](https://www.mercadopago.com.br/developers/panel) → App
   "Pagamentos JS Grafica" → Webhooks → Configurar notificações.
2. Colar a URL: `https://admin.jsgrafica.site/api/mercadopago/webhook` (Modo Teste primeiro).
3. Copiar a **chave secreta** gerada ali e passar por canal seguro (mesmo cuidado já usado com a
   chave do Gemini) — vai pra `jsgrafica_mercadopago_config.webhook_secret`.
Depois disso, qualquer pagamento de teste novo vai gerar um webhook de verdade, com assinatura
validável — o mecanismo já está 100% implementado e testado contra os vetores reais do SDK, só
falta esse segredo de verdade pra validar contra algo genuíno.

### Achados fora do escopo:
- A API de Orders exige range máximo de 1 mês em `/v1/orders` — se a 124 (Parte B) precisar
  listar cobranças Pix por um período maior, vai precisar paginar por mês.
- App bloqueado de criar pagamento pela API clássica (`401`) — só reforça que a 124 precisa usar
  `POST /v1/orders` mesmo, não `POST /v1/payments`.

### Status final (1ª rodada):
Concluída e em produção (`dpl_DvBgvbogpnwgQDuo9YtKU97YWhzt`, aliasado em `pdv.jsgrafica.site` e
`admin.jsgrafica.site` — só Admin vê a aba, PDV sem acesso). `npx tsc --noEmit` e `npm run build`
limpos. Pendência isolada e documentada acima (configurar webhook no painel + secret) — não
bloqueia o resto da demanda, que já está funcionando e mostrando dado real.

---

## 2ª rodada (2026-07-08) — Edvam configurou o webhook no painel, testado contra aviso genuíno

O Edvam completou o passo manual: URL `https://admin.jsgrafica.site/api/mercadopago/webhook`
registrada no painel (modo Teste), eventos "Order (Mercado Pago)" e "Pagamentos (legacy)"
marcados, segredo gerado e salvo em `.env.local` (`MERCADOPAGO_WEBHOOK_SECRET_TESTE`).

**O que foi feito:**
- Segredo copiado de `.env.local` pra `jsgrafica_mercadopago_config.webhook_secret` (é de lá que
  o endpoint lê, não do `.env` — mesmo padrão RLS-travada da 024/025).
- Criado 1 pedido real novo via `POST /v1/orders` (cartão APRO, R$7,00) especificamente pra
  gerar um aviso de webhook de verdade vindo do Mercado Pago (não simulado por mim).

**Resultado — "recebendo" confirmado 100%, "validando" ainda não bate:**
- **O webhook chegou de verdade** — `jsgrafica_mercadopago_eventos` registrou o evento com
  `recurso_id` batendo exatamente com o pedido que acabei de criar (`ORDTST01KX1FDDPKXEG576HS8QZZVH1T`),
  tipo `"order"`, ação `"order.processed"` — prova concreta e inequívoca de que o Mercado Pago
  está entregando webhook de verdade pro endpoint em produção. Isso fecha 100% o "recebendo".
- **A validação da assinatura falhou** (`assinatura_valida: false`, "Assinatura inválida").
- Adicionei campos de diagnóstico na tabela (`x_signature`, `x_request_id`, `query_string`) e
  disparei outro pedido de teste (R$3,00) pra capturar os dados brutos reais do próximo aviso:
  - Query string real: `?data.external_reference=teste-084-diag-assinatura&data.id=ORDTST01KX1FRJKB5JPS303N5NCEFT9Q&type=order`
    — confirma que `data.id` **vem mesmo na query string** (como a base de conhecimento já
    apontava) e que meu código está extraindo o valor certo dali.
  - `x-signature` real: `ts=1783535260,v1=b5cf50f08af1b4b4e31ca4d63968727e82e645463df5183f0d1657b62d32eea9`
  - Recalculei o HMAC **manualmente, fora do código do sistema**, com o manifesto exato
    (`id:<data.id>;request-id:<x-request-id>;ts:<ts>;`) e o segredo salvo — **não bateu**, nem
    com `data.id` no formato original nem em minúsculo.
- **Conclusão**: o algoritmo em si está correto (bateu 100% com os vetores de teste oficiais do
  SDK antes de qualquer teste real, ver seção acima) e os dados brutos capturados batem com o
  que a documentação descreve — o problema é especificamente **o valor do segredo não corresponde
  ao que o Mercado Pago usou pra assinar este aviso**. Não é um bug de código: refiz a conta na
  mão, fora do sistema, com o mesmo resultado.

**Hipótese mais provável, não confirmável por mim (preciso de acesso ao painel)**: o painel do
Mercado Pago pode mostrar/gerar **um segredo por assinatura de evento, não um só por
aplicação** — como foram marcados 2 tipos de evento ("Order (Mercado Pago)" e "Pagamentos
(legacy)"), é possível que cada um tenha (ou possa gerar) um segredo diferente, e o valor salvo
em `MERCADOPAGO_WEBHOOK_SECRET_TESTE` seja o de um dos dois, não o de "Order" (que foi o tipo do
evento que testei, já que os pedidos são criados via Orders API).

**Pergunta pro Edvam/PM, pra fechar 100%**: no painel (Aplicação → Webhooks → Configurar
notificações), ao lado de "Order (Mercado Pago)" e "Pagamentos (legacy)", aparece **um segredo só
pra tudo, ou um segredo por linha/evento**? Se for por evento, preciso do segredo específico de
"Order (Mercado Pago)" (é o tipo que a integração atual usa de verdade). Se for só um segredo pra
tudo, vale reconferir se foi copiado certo (sem espaço/quebra de linha — já chequei que o valor
salvo não tem esse problema, mas pode ter sido copiado errado desde a origem).

**Não é bloqueante**: o resto da demanda (saldo/movimentações reais, tela, lembrete de expiração)
segue funcionando 100% independente disso — só a validação da assinatura do webhook depende
dessa confirmação.

### Status final (2ª rodada):
Deployado com o diagnóstico (`dpl_6qwbVfPoQehD8kSLVLU5yq1ExnkD`). `npx tsc --noEmit` e
`npm run build` limpos. 4 eventos reais de teste (incluindo 1 simulação do próprio Edvam via
painel, `recurso_id: "123456"`) registrados em `jsgrafica_mercadopago_eventos` como prova —
mantidos, não apagados, servem de evidência da investigação. Pendência final: 1 pergunta pro
Edvam sobre o segredo (acima) — assim que responder, é só atualizar
`jsgrafica_mercadopago_config.webhook_secret` (nenhuma mudança de código necessária) e testar de
novo com outro pedido de teste.

---

## 3ª rodada (2026-07-08) — segredo confirmado 100% correto pelo Edvam; achado mais fundo

O Edvam confirmou, comparando byte a byte com o painel: o segredo salvo é idêntico (64
caracteres), e é **1 campo só** de "Assinatura secreta" pra toda a configuração — não por evento.
As duas hipóteses da rodada anterior (segredo errado / segredo por evento) foram descartadas.
Pedido explícito do Edvam: comparar a string-modelo do HMAC campo a campo contra a documentação,
não só rodar de novo.

**O que foi feito — comparação byte a byte, exaustiva:**
- Adicionei captura de **todos os headers brutos** da requisição (`headers_brutos`, coluna nova
  jsonb) + `x_signature`/`x_request_id`/`query_string` isolados, pra eliminar de vez qualquer
  dúvida sobre header duplicado/reescrito por alguma camada intermediária (cheguei a suspeitar do
  `middleware.ts` do projeto ou da própria infra da Vercel) — **descartado**: `middleware.ts` já
  ignora `/api/**` explicitamente (`if (pathname.startsWith('/api/')) return NextResponse.next()`,
  linha 14), e os headers brutos capturados mostram exatamente 1 `x-request-id` (sem duplicata),
  `user-agent: "MercadoPago WebHook v1.0 order"` (confirma que quem entregou foi o Mercado Pago
  de verdade, não infra da Vercel).
- Disparei mais 2 pedidos de teste novos (R$2,00 e antes R$3,00) só pra capturar dado limpo e
  completo — cada um gerou 1 webhook real novo, `assinatura_valida` sempre `false`.
- Com os dados 100% limpos de um evento (`id` do pedido, `x-request-id`, `ts`, `v1` — todos
  extraídos diretamente do JSON bruto salvo, sem passar pelo código de novo), refiz o HMAC na mão
  testando uma matriz grande de variações plausíveis:
  - `id` = id do pedido (`ORDTST...`), maiúsculo e minúsculo
  - `id` = `external_reference` do pedido, maiúsculo e minúsculo
  - `id` = id do pagamento aninhado (`PAY...`), maiúsculo e minúsculo
  - `ts` = valor literal do header (segundos, confirmado — o header mostra 10 dígitos, não os
    "milissegundos" que a documentação genérica descreve, mas isso não deveria importar pro HMAC
    já que é usado como string literal) e `ts × 1000` (testando a hipótese de milissegundos)
  - com e sem o campo `request-id` no manifesto
  - ordem dos campos trocada (`ts` primeiro, `request-id` primeiro)
  - sem o `;` final, com espaço depois de `;`, campos concatenados sem separador
  - segredo usado como string UTF-8 (padrão), decodificado de hex pra bytes, decodificado de
    base64 pra bytes
  - `HMAC-SHA1` em vez de `SHA256` (sanity check)
  - **Nenhuma combinação bateu** com o `v1` recebido, em nenhum dos 2 eventos testados.
- Busquei online por relatos de outros desenvolvedores com o mesmo sintoma — achei uma discussão
  real no repositório oficial (`mercadopago/sdk-nodejs`, discussion #318): **"webhook x-signature
  não valida corretamente em prod, mas sim em test"** — confirma que este NÃO é um problema único
  meu, é um sintoma já relatado por outros integradores contra a infraestrutura real do Mercado
  Pago (não consegui abrir o conteúdo completo da thread — GitHub Discussions bloqueou o fetch
  automatizado — mas o título e o resumo de busca já confirmam que o sintoma é conhecido).

**Conclusão desta rodada**: o algoritmo, o segredo e a extração dos dados estão corretos (todos
re-confirmados). O que ainda não descartei é se o problema é **específico do tópico "order"**
(evento `order.processed`) — todos os 3 eventos reais recebidos até agora vieram desse tópico,
porque só consigo criar cobrança via `POST /v1/orders` (a API clássica de pagamento está
bloqueada pra este app, `401`, achado da 1ª rodada). Nunca recebi um evento tópico `payment`
de verdade pra comparar.

**Próximo passo concreto, decisivo, que só o Edvam consegue fazer** (não dá pra eu simular via
API — confirmei que o "Simulador de notificação" é só um botão no painel, sem endpoint de API
equivalente): usar o **Simulador de notificação** no painel (Webhooks → Configurar notificações →
Simular) e disparar **1 evento tipo "Pagamentos (legacy)"** (não "Order") — pode ser com um ID
qualquer, tipo `123456`, mesmo que fictício, já que é só pra eu comparar a assinatura recebida.
Se esse evento **validar certo** com o mesmo código, confirma que o problema é uma inconsistência
específica do Mercado Pago no tópico "order" (fora do meu controle, reportável a eles) — e nesse
caso a estratégia muda: teria que confiar só no "recebendo" pro tópico order (sem validar
assinatura) ou aguardar o Mercado Pago corrigir. Se **também falhar**, aponta pra algo mais
sistêmico ainda a investigar (ex. o próprio ambiente de Teste ter uma particularidade não descrita
na documentação).

### Status final (3ª rodada):
Sem mudança de código nova além da captura de headers brutos (já deployada,
`dpl_6qwbVfPoQehD8kSLVLU5yq1ExnkD`). 6 eventos reais de teste registrados no total (incluindo 2
simulações do Edvam e 4 pedidos reais meus), todos mantidos como evidência. Investigação exaustiva
documentada acima — aguardando 1 teste específico do Edvam (simular evento tipo "Pagamentos
(legacy)" no painel) pra isolar se o problema é específico do tópico "order". Resto da demanda
(saldo/movimentações/tela/lembrete) 100% funcional e não depende disso.
