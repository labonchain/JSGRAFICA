# Base de conhecimento — Integração Mercado Pago (JS Gráfica)

Pesquisado pelo PM em 2026-07-07, direto na documentação oficial do Mercado Pago Developers,
pra servir de referência única — não revisitar/redescobrir isso a cada demanda. Sempre que algo
aqui for confirmado por teste real (não só documentação), atualizar este arquivo.

**Aviso encontrado durante a pesquisa**: a documentação do Mercado Pago tem reclamação recorrente
de desenvolvedores por ser confusa/mal organizada (ex.: "[DESABAFO] DOCUMENTAÇÃO MERCADO PAGO",
tabnews.com.br/honassis/desabafo-documentacao-pessima-mercado-pago) — reforça por que vale ter
esse resumo próprio.

---

## 1. Como criar a aplicação e obter credenciais

1. Acessar o [Painel do desenvolvedor](https://www.mercadopago.com.br/developers/panel) **logado
   com a conta Mercado Pago da própria gráfica** (a conta que já recebe os pagamentos).
2. "Criar nova aplicação" — nome livre (ex.: "JS Gráfica — Sistema Interno"), tipo de pagamento
   "Pagamentos online", indicar o tipo de produto que está integrando.
3. Marcar as opções de autorização de dados, criar a aplicação.
4. Dentro de "Detalhes da aplicação" → "Credenciais", clicar em **"Ativar credenciais"**.
5. Copiar **Public Key** e **Access Token** da seção "Modo Produção" (existe também "Modo Teste",
   pra usar antes de mexer com dado real — usar teste primeiro).

**Ponto crítico, fácil de esquecer**: o Access Token **expira em 180 dias por padrão**. Isso não
é "gerar uma vez e esquecer" como o token do Z-API — precisa de um plano pra renovar (reativar
manualmente antes de expirar, ou implementar o fluxo OAuth de refresh, a confirmar qual dos dois
faz mais sentido pro porte da gráfica — provavelmente reativação manual a cada ~5 meses é
suficiente, dado o volume).

Fontes: [Criação de credenciais](https://www.mercadopago.com.br/developers/pt/docs/security/oauth/creation), [Credenciais](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/credentials)

---

## 2. Webhooks — tempo real de verdade (recomendado, em vez de ficar consultando)

Em vez de o sistema ficar perguntando "mudou alguma coisa?" de tempos em tempos, o Mercado Pago
**avisa sozinho** quando algo acontece (pagamento aprovado, estorno, etc.) — mandando um POST
pra uma URL que a gente cadastra. É o mesmo padrão que já usamos com o Z-API/n8n (webhook que
recebe e loga), só que aqui quem manda é o Mercado Pago.

- Eventos cobertos: aprovação/rejeição de cobrança, compensação de transferência bancária,
  reembolsos/estornos, atualização de assinatura, tentativa de fraude detectada.
- O aviso chega com o **tipo de evento e o ID da cobrança** — o sistema então busca os detalhes
  completos chamando a API (o aviso em si não traz todos os dados).
- **Segurança**: cada aviso vem com um header `x-signature`, contendo timestamp + assinatura
  criptografada (HMAC-SHA256, usando uma chave secreta configurada no painel). Precisa validar
  essa assinatura antes de confiar no aviso — mesmo cuidado que já temos com qualquer webhook
  externo.
- **Prazo de resposta**: o sistema tem que responder com HTTP 200 em até 22 segundos, senão o
  Mercado Pago considera que falhou e tenta de novo a cada 15 minutos.
- IPN (o mecanismo antigo, mais simples) está sendo descontinuado — usar Webhooks, não IPN.

Fontes: [Webhooks — Notificações](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks), [Simulador de Webhooks + assinatura secreta (anúncio)](https://www.mercadopago.com.br/developers/pt/news/2024/01/11/Webhooks-Notifications-Simulator-and-Secret-Signature)

### Validação da assinatura (`x-signature`)
1. O header vem no formato `ts=<timestamp>,v1=<assinatura>` — separar por vírgula.
2. Montar uma string-modelo com os dados da notificação + o `ts`.
3. Calcular HMAC-SHA256 dessa string, usando a chave secreta (gerada no painel ao configurar o
   webhook) — comparar o resultado (em hexadecimal) com o `v1` recebido.
4. Exemplo em Node.js (da documentação oficial):
   ```js
   const cyphedSignature = crypto.createHmac('sha256', secret)
     .update(signatureTemplateParsed)
     .digest('hex');
   ```

---

## 3. Relatórios — saldo e movimentações (histórico/consulta sob demanda)

Além do webhook (que avisa eventos novos em tempo real), existem dois relatórios pra consultar
dado histórico ou o estado atual:

- **"Dinheiro em conta" (`account_money`)**: transações que afetaram o saldo — pagamentos,
  entradas, disputas, estornos, por período, líquido e bruto.
- **"Liberações" (`released_money`)**: saldo disponível — mostra valor total disponível e
  bloqueios/desbloqueios de fundos num período.

**Ponto ainda não 100% confirmado pela pesquisa** (marcar pra validar em sandbox antes de
implementar): não ficou claro se existe um endpoint simples de "GET saldo atual agora" (resposta
imediata) ou se os dois relatórios acima são só **geração assíncrona de arquivo** (pedir o
relatório, esperar, baixar o arquivo pronto) — os exemplos encontrados usam endpoints como
`/v1/account/settlement_report/config` e `/v1/account/release_report/config`, que parecem ser
de **configuração** do relatório, não de consulta instantânea. **Testar isso primeiro em sandbox
antes de desenhar a tela** — pode ser que o saldo "ao vivo" só venha de fato pelo webhook (ir
somando os eventos) e o relatório sirva só pra conferência periódica/histórico, não pra "saldo
agora".

Fontes: [Dinheiro em conta — geração via API](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/additional-content/reports/account-money/api), [Liberações — geração via API](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/reports/available-money/api)

---

## 4. Fluxo proposto (rascunho, a confirmar com o Edvam antes de implementar)

### O que o Edvam (admin) precisa fazer, uma vez só:
1. Logar no [Painel do desenvolvedor](https://www.mercadopago.com.br/developers/panel) com a
   conta Mercado Pago da gráfica.
2. Criar a aplicação (passo 1 acima).
3. Copiar Access Token + Public Key (modo Teste primeiro, depois Produção).
4. Passar essas credenciais pro time técnico (03-APP) configurar no sistema — **nunca digitar
   direto numa tela pública, sempre por um canal seguro** (mesmo cuidado que tivemos com a chave
   do Gemini).
5. Configurar a URL de webhook no painel do Mercado Pago (o 03-APP vai fornecer essa URL depois
   de implementar o endpoint que recebe o aviso) + copiar a chave secreta do webhook.

### O que o sistema precisa fazer:
1. Guardar Access Token + chave secreta do webhook de forma segura (RLS travada, mesmo padrão
   do token Z-API).
2. Endpoint público que recebe o webhook do Mercado Pago, valida a assinatura, busca os detalhes
   do evento na API, e grava/atualiza a movimentação no sistema.
3. Rotina separada (a confirmar se precisa) pra consultar saldo/relatório periodicamente, caso o
   webhook sozinho não seja suficiente pra saber "quanto tem disponível agora".
4. Tela mostrando o saldo e as movimentações recentes da conta Mercado Pago.
5. Lembrete/aviso próximo da expiração do Access Token (180 dias), pra não parar de funcionar
   silenciosamente.

---

## Perguntas em aberto (resolver antes ou durante a implementação, não assumir)
- [x] ~~Existe mesmo um "GET saldo agora" instantâneo~~ — **RESOLVIDO (2026-07-08, pesquisa
      direta na documentação oficial + confirmação cruzada)**. Ver seção 5 abaixo.
- [x] ~~Reativação do Access Token a cada 180 dias: manual ou automatizada~~ — **RESOLVIDO**. Ver
      seção 6 abaixo.
- [ ] O webhook precisa de uma URL pública estável — confirmar que `app.jsgrafica.site` (ou
      equivalente) aceita isso sem problema de firewall/rota.
- [ ] O relatório "Liberações" (`released_money`) apareceu numa busca como **descontinuado em
      01/03/2022** ("Available Money report was disabled") — outras páginas da documentação ainda
      o descrevem como ativo. Não bater o pé em nenhum dos dois sem testar em sandbox — por isso a
      seção 5 abaixo recomenda nem depender desse relatório específico.

---

## 5. RESOLVIDO — não existe "saldo agora" instantâneo via relatório, mas existe um caminho melhor

**Os relatórios (`account_money`/"Dinheiro em conta" e `release_report`/"Liberações") são
100% assíncronos, confirmado direto na documentação oficial**: você faz `POST` pra criar o
relatório (`/v1/account/settlement_report` ou `/v1/account/release_report`), recebe **HTTP 202
(Accepted)** — não o dado em si, só a confirmação de que começou a gerar — e só depois baixa o
arquivo pronto (`.csv`/`.xlsx`) via `GET .../{file_name}`. Não tem "saldo agora" nesse caminho.

**Caminho melhor, que resolve o problema de outro jeito**: `GET /v1/payments/search` — esse **é
síncrono** (responde na hora, HTTP 200 com os dados já prontos). Busca os pagamentos reais dos
últimos 12 meses, com filtro por data/status/etc. Cada pagamento vem com `id`, `date_created`,
`date_approved`, `money_release_date` (quando aquele valor específico fica disponível pra
sacar), `payment_method_id`, `status`, `status_detail`, valor.

**Proposta revisada**: em vez de depender do relatório assíncrono pra saber "saldo", o sistema
monta o próprio "saldo" somando os pagamentos reais retornados por essa busca (síncrona, sob
demanda) — combinado com o webhook (avisa na hora quando um pagamento novo acontece). Mais
simples, mais confiável, sem esperar arquivo gerar. O relatório assíncrono fica só como opção de
conferência periódica (ex. 1x por semana), não como fonte principal.

Fontes: [Busca de pagamentos](https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-pro/search-payments/get), [Geração de relatório — Dinheiro em conta](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/additional-content/reports/account-money/api)

## 6. RESOLVIDO — renovação do Access Token

Renovação **automática existe**, mas só funciona se a aplicação for criada usando o fluxo
completo de autorização OAuth (login do vendedor + tela de consentimento), com o escopo
`offline_access` habilitado desde o início — aí sim o sistema recebe um `refresh_token` junto
com o Access Token, e pode trocar por um novo automaticamente antes de expirar, sem precisar
que o Edvam faça nada.

**O jeito simples que descrevi na seção 1** (logar no painel, copiar Public Key + Access Token
direto da tela) **não gera `refresh_token`** — esse token precisa ser renovado manualmente a
cada ~180 dias.

**Recomendação, dado o porte da gráfica** (conta própria, não um app pra múltiplos vendedores):
o fluxo OAuth completo é complexidade desnecessária aqui — mais simples usar o token estático do
painel + um lembrete calendário pro Edvam reativar a cada ~5-6 meses. Só vale o OAuth completo se
um dia isso crescer pra atender múltiplas contas/vendedores.

Fontes: [Renovar Access Token](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/additional-content/security/oauth/renewal)

## 7. Cobrança Pix por pedido, com confirmação automática (parte B, pedido do Edvam 2026-07-08)

**Objetivo**: em vez de só mostrar a chave Pix estática em texto (fluxo atual, demanda 062), o
sistema gera uma cobrança Pix de verdade pela API, específica de cada pedido — usando
`external_reference = id do pedido` — pra quando o cliente pagar, o webhook avisar o sistema e
ele já saber **exatamente** qual pedido foi pago, sem confirmação manual.

**Limite real, importante**: isso só funciona pra pagamento **gerado pelo próprio sistema**. Se o
cliente pagar direto numa chave Pix fora desse fluxo (ex. mandando pro WhatsApp/Instagram, fora
do pedido), não tem `external_reference` pra amarrar — cai no fluxo manual que já existe (113).

**Requisito de conta encontrado na pesquisa, a confirmar em sandbox**: pra cobrança via API
funcionar sem divergência, a conta precisa ter uma **chave Pix aleatória cadastrada no próprio
Mercado Pago** (não uma chave "com portabilidade", vinda de outro banco) — conferir isso no
painel da conta da gráfica antes de implementar.

**Usuários de teste**: não precisa de outra conta — o painel de desenvolvedor (dentro da mesma
conta real) tem uma ferramenta de "usuários de teste" que cria comprador/vendedor fictícios pra
simular pagamento sem mexer em dinheiro real.

Fontes: [Integração com Pix](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/integration-configuration/integrate-with-pix), [Pix — Checkout Transparente](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/pix)

---

## 8. RESOLVIDO (demanda 084, testado em sandbox real, não só documentação) — API de Orders vs API clássica de Pagamentos

O site de documentação do Mercado Pago bloqueia fetch automatizado (retorna HTTP 400 pra
ferramentas tipo WebFetch) — toda confirmação abaixo veio de **teste direto na API real** (conta
de sandbox da própria gráfica, User ID `3527198843`) e do código-fonte + testes unitários oficiais
do SDK `mercadopago/sdk-nodejs` (GitHub, `raw.githubusercontent.com`, não bloqueado).

**Endpoints confirmados por teste real:**
- `GET /v1/orders` — **este é o "search" da API de Orders** (não existe `/v1/orders/search`,
  isso cai em `/v1/orders/{id}` com id inválido). Parâmetros: `begin_date`/`end_date` (RFC3339,
  **máximo 1 mês de intervalo**), `page`/`page_size` (não `limit`/`offset` — esses são ignorados
  silenciosamente aqui). Resposta: `{ data: [...], paging: { total, total_pages, offset, limit } }`
  — note `data`, não `results`, e os campos de paginação vêm como **string**, não número.
- `POST /v1/orders` — confirmado funcionando neste app (criado via Orders), payload real testado:
  `{ type: "online", processing_mode: "automatic", total_amount, external_reference, transactions:
  { payments: [{ amount, payment_method: { id, type, token, installments } }] }, payer: { email },
  config: { online: { callback_url } } }`. Resposta real (pagamento aprovado com cartão de teste
  APRO): `id` prefixado `ORDTST...`, pagamento dentro de `transactions.payments[]` com `id`
  prefixado `PAY...`, **status `"processed"` + `status_detail: "accredited"`** — não
  `"approved"` como na API clássica. Confirma o aviso da demanda: nomes E VALORES de status
  diferem entre as duas APIs, não só nomes de campo.
- `POST /v1/payments` (API clássica, criar pagamento direto) — **bloqueado pra este app**:
  retorna `401 "Unauthorized use of live credentials"`. Confirma que um app criado como
  "Checkout Transparente via Orders" não pode criar pagamento pela API clássica — só pela Orders.
- `GET /v1/payments/search` e `GET /v1/payments/{id}` (API clássica, **leitura**) — **funcionam
  normalmente**, mesmo pra pagamentos criados via Orders API. Aceitam `limit`/`offset` (nomes
  corretos aqui, confirmados). **Achado-chave**: um pagamento criado via `POST /v1/orders`
  aparece automaticamente em `/v1/payments/search` com o `id` numérico clássico, `status:
  "approved"` (terminologia clássica), e — o mais importante pra esta demanda — com dados
  financeiros que o objeto de pagamento da própria Orders API **não tem**: `transaction_details.
  net_received_amount` (valor líquido após taxas), `fee_details` (taxas discriminadas),
  `money_release_date`/`money_release_status` (liberação de saldo). O vínculo entre os dois é
  `point_of_interaction.references[].id` (tipo `ORDER_MP`) apontando de volta pro id `ORDTST...`.

**Decisão de arquitetura pra esta demanda (saldo/movimentações)**: usar `GET /v1/payments/search`
como fonte principal — não `/v1/orders` — porque tem o dado financeiro completo (líquido, taxas,
liberação) que a Orders API sozinha não expõe. A API de Orders (`/v1/orders`, `POST`) fica
reservada pra quando a demanda 124 (Parte B) precisar **criar** cobrança Pix por pedido — não é
usada pra leitura de saldo.

**`config.online.callback_url` (Orders API) NÃO dispara webhook de verdade pra pagamento direto
via token** — testado 2x (aguardando ~20s cada vez), nenhum POST chegou no endpoint informado
nesse campo, apesar de o campo ser aceito e ecoado de volta na resposta. Bate com a hipótese de
que esse campo é só pra fluxos de checkout com redirecionamento (hosted checkout), não pra
pagamento direto por token que já processa sem redirecionar. **A única forma confirmada de
receber webhook de verdade é a assinatura configurada no painel** (Aplicação → Webhooks →
Configurar notificações) — não existe endpoint de API pra ler/criar essa assinatura
programaticamente (confirmado por busca no SDK oficial, nenhum cliente pra isso existe).

**Algoritmo de validação da assinatura (`x-signature`) confirmado linha a linha** contra o
código-fonte + testes unitários reais do SDK oficial (`mercadopago/sdk-nodejs`,
`src/utils/webhook`): manifesto = `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` (pares
ausentes são omitidos da string, não viram vazio), HMAC-SHA256 com o segredo, comparação em
tempo constante. `data.id` vem do **query string** da URL do webhook, não só do corpo do POST.
Implementado em `lib/mercadopago.ts` (`validarAssinaturaWebhook`), testado com os vetores de
teste reais do próprio SDK antes de usar em produção (bateu certo).

## 9. RESOLVIDO (2026-07-08) — assinatura não validava só pro tópico "order"

**Investigação fechada.** Os primeiros avisos reais recebidos (tópico `order`, `order.processed`
— o único tipo possível de gerar nesta app, já que a API clássica de Pagamentos está bloqueada,
ver seção 8) davam `assinatura_valida: false` mesmo com segredo e algoritmo conferidos à exaustão
(comparação campo a campo com o painel, matriz grande de variações do manifesto testadas à mão,
nada bateu). Achado um relato de outro desenvolvedor com o mesmo sintoma no repositório oficial
do SDK (`mercadopago/sdk-nodejs#318`).

**Teste decisivo**: usando "Simular notificação" no painel com tópico **"Pagamentos"** (não
"Order" — só existe "Pagamentos" na lista, não "Pagamentos (legacy)" como o nome sugeria antes)
→ evento `type: "payment"`, `action: "payment.updated"` → **`assinatura_valida: true`**,
confirmado direto na tabela `jsgrafica_mercadopago_eventos` (não só pelo "200 OK" da resposta,
que o endpoint sempre devolve por exigência do próprio Mercado Pago, mesmo com assinatura
inválida — só o campo `assinatura_valida` gravado no banco confirma de verdade).

**Conclusão**: o segredo, o algoritmo e a implementação estão corretos — confirmado que validam
pra eventos do tópico `payment`. O tópico `order` especificamente não valida com o mesmo segredo/
algoritmo — é uma inconsistência do lado do Mercado Pago (bate com o relato de terceiros), fora
do nosso controle, não um bug nosso.

**⚠️ Relevante pra demanda 124 (Parte B)**: cobrança gerada via **API de Orders** dispara
justamente eventos do tópico `order` — o que não valida hoje. Antes de confiar na confirmação
automática de pagamento por webhook na 124, **testar de novo com um evento `order` real** (não
simulado) depois de qualquer atualização de SDK/API do Mercado Pago, ou considerar um plano B
(ex. usar a busca de pagamentos síncrona, já construída na 084, como conferência periódica em
vez de depender 100% do webhook pra esse tópico específico).

**Re-testado na demanda 124 (2026-07-08, mesmo dia, evento `order.processed` genuíno de uma
order real paga)**: **continua falhando** (`assinatura_valida: false`). O desenho da 124 assume
isso como permanente: o webhook vira só um GATILHO — nada do payload é usado; tudo que importa
vem de uma re-busca autoritativa (`GET /v1/orders/{id}` com o nosso token). Um aviso forjado só
consegue provocar uma consulta à nossa própria conta — se a order não estiver paga DE VERDADE lá,
nada acontece. Validação de assinatura continua rodando e sendo logada (vai passar a valer
sozinha se o Mercado Pago corrigir o tópico order um dia).

## 10. Cobrança Pix via Orders API — fatos confirmados por teste real (demanda 124, 2026-07-08)

- **Payload que funciona** (`POST /v1/orders`): igual ao de cartão, trocando o pagamento por
  `payment_method: { id: "pix", type: "bank_transfer" }` — sem token, sem installments.
- **O QR NÃO vem na resposta da criação** — o POST devolve `201` com status `processing` e
  `payment_method` só com `id`/`type`. O QR é gerado assíncrono: um `GET /v1/orders/{id}` ~3s
  depois traz `qr_code` (copia-e-cola EMV, com o valor embutido), `qr_code_base64` (~3,7KB) e
  `ticket_url`. Implementado com re-consulta em loop curto (`criarCobrancaPix` em
  `lib/mercadopago.ts`).
- **Expiração padrão: 24h** (`date_of_expiration` = criação + 1 dia). Order aguardando pagamento
  fica `action_required` / `waiting_transfer`; paga vira `processed`.
- **E-mail do pagador é obrigatório mas é só metadado** (pagador de Pix não autentica em lugar
  nenhum). Sandbox rejeita qualquer domínio ≠ `@testuser.com` (erro explícito
  `invalid_email_for_sandbox`; o local-part é livre — `cliente.<telefone>@testuser.com` passa).
  Produção aceita domínio normal — o sistema usa `cliente.<telefone>@jsgrafica.site`.
- **Não há como simular o PAGAMENTO de um Pix em sandbox por API**: `PUT /v1/payments/{id}`
  devolve o mesmo `401` de qualquer escrita clássica; não existe endpoint de simulação de pagador.
  O pipeline de confirmação automática foi validado com order de **cartão APRO** (aprova na hora
  = order genuinamente paga), que percorre exatamente o mesmo caminho (webhook `order.processed`
  → re-busca → confirmação por `mp_order_id`). O 1º Pix pago de verdade será em produção, com
  valor pequeno e aprovação do Edvam.
- **`X-Idempotency-Key` por referência do pedido** (`pix-<pedido/venda id>`): retry da criação
  devolve a mesma cobrança em vez de duplicar.
- Orders pendentes podem ser canceladas via `POST /v1/orders/{id}/cancel` (usado na limpeza dos
  testes) — orders já pagas não.
