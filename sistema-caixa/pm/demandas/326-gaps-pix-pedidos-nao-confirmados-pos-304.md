# 326 - Gaps reais de Pix/pedidos não confirmados (achados pelo 03-APP na varredura de 27/08)

Status: concluída
Criada em: 2026-08-27
Aprovada em: 2026-08-27
Concluída em: 2026-08-27
Chat executor: 03 - APP JS GRAFICA

Achado na varredura completa pedida pelo Edvam em 27/08, não é urgente (nenhum dos 3 tem
evidência de ter acontecido de verdade), mas real e sem correção/confirmação.

## Objetivo
Confirmar (com teste real, dado real) ou corrigir os 3 gaps abaixo, todos em código já existente
do `caixa-js-grafica` (Pix/pedidos), sem tocar em nada fora do escopo listado.

## Contexto

Varredura pedida pelo Edvam em 27/08 pra listar backlog e revisar "mecanismos como pedidos que
ainda não foi testado". Perguntei direto pro `03 - APP JS GRAFICA` (chat que implementou 300/301/
304) e ele foi preciso em separar o que testou de verdade do que só existe no código.

## Os 3 gaps reais

### 1. Retry de Pix (demanda 300) não cobre pedido de venda com múltiplos itens

O retry automático (trigger no banco) e o botão manual "Gerar Pix" construídos na demanda 300
só cobrem pedido avulso (`venda_id is null`). Pedido que faz parte de uma venda com múltiplos
itens (`venda_id` preenchido) e cai no cenário de telefone `@lid` pulando o Pix **nunca foi
construído pra esse caso** — nenhum dos 4 casos reais que motivaram a 300 tinha `venda_id`. Se
acontecer com venda de vários itens, hoje não tem recuperação automática nem botão, só combinar
manualmente fora do sistema.

### 2. Dois caminhos de Pix não retestados com dinheiro real depois da ponte de segurança (304)

A demanda 304 (17/08) trocou o `middleware.ts` pra exigir segredo compartilhado em toda rota
`/api/*`. Dois caminhos que já existiam antes, não tocados diretamente nas demandas 300/301/304,
passam por esse middleware novo e não foram reconfirmados com Pix real depois do deploy:

- "Criar pedido" a partir do Inbox (`POST /api/pedidos`, abre `ModalQrPix`) — confirmado que a
  navegação geral do Inbox não dá 401 depois da 304, mas não confirmado gerar um Pix real por ali.
- Venda mista (recarga + item comum) e "100% recarga" dentro de `/api/mercadopago/cobranca`
  (balcão) — só o caminho simples (pedido único, sem recarga) foi testado na 301.

Expectativa técnica é que funcionem igual (o interceptor de fetch é global,
`beforeInteractive`), mas isso é "esperado ok, não confirmado", não "testado".

### 3. Webhook real do Mercado Pago (assinatura válida) não confirmado ponta a ponta pós-304

Só foi confirmado que a rota `/api/mercadopago/webhook` continua alcançável depois da 304 (POST
vazio, sem 401). Não foi confirmado que o fluxo de confirmação automática de pagamento continua
100% intacto com um evento real assinado. O middleware só lê headers (não toca no corpo), então
teoricamente não deveria interferir, mas não está confirmado com dado real.

## Recomendação

Nenhum dos 3 tem evidência de falha real, é levantamento, não incidente. Decisão de prioridade e
ordem de teste real fica com o Edvam. Se quiser fechar algum com teste real, é rápido (o próprio
`03-APP` se ofereceu).

## Relato de execução

### O que foi feito
Nenhuma mudança de código — os 3 itens eram "confirmar ou corrigir", e os 3 foram resolvidos pela
via "confirmar com dado real", sem precisar de correção:

**Gap 1 (retry multi-item) — confirmado que o gap é real, não corrigido de propósito.** Criei 2
pedidos sintéticos reais compartilhando `venda_id`, telefone `@lid`, Pix escolhido — corrigi o
telefone (simulando a 151/300) e confirmei que `mp_order_id` continuou `null` nos dois depois da
correção (nem o gatilho automático nem o botão manual tentaram). Chamei
`/api/pedidos/retentar-pix` direto pra um deles e recebi a rejeição exata já esperada ("Pedido faz
parte de uma venda com múltiplos itens..."). **Não construí a correção** — a própria demanda 300
já tinha decidido isso conscientemente (nenhum dos 4 casos reais tinha `venda_id`, replicar a
lógica de agrupamento/recarga pra um caso nunca observado é risco desnecessário sem um caso real
pra validar contra) e esta demanda também não exige corrigir, só confirmar. Fica registrado como
limite conhecido — se acontecer de verdade, decisão de construir vira demanda própria.

**Gap 2 (Pix real depois da 304) — confirmado funcionando, sem mudança necessária.** 3 chamadas
reais com dinheiro de verdade (valores mínimos, R$0,15), todas com o header `X-App-Secret` da 304:
- `POST /api/pedidos` com `produtoId`+`formaPagamentoEscolhida:'pix'` (mesmo caminho do "Criar
  pedido" do Inbox) → Pix real gerado (`ORD01M12APE3P8AEXH09YVV642QVC`), `mp_order_id` vinculado
  certo no pedido.
- Venda mista (1 item recarga + 1 item comum, mesmo `venda_id`) via `POST /api/mercadopago/
  cobranca` → Pix real gerado só pro item comum (`ORD01M12ARA5AW2KFZD86GSV68X7K`), item de recarga
  ficou de fora certinho (vai por QR estático do RecargaPay, não pelo Mercado Pago).
- Venda 100% recarga via a mesma rota → `recargaPay: true`, QR/chave estáticos, `orderId` vazio
  (sem cobrança real no MP) — comportamento esperado confirmado.

**Gap 3 (webhook real pós-304) — confirmado funcionando, sem mudança necessária.** Construí um
evento de webhook com assinatura HMAC válida de verdade (mesmo segredo de produção, mesmo formato
`ts=...,v1=...` que `validarAssinaturaWebhook` espera), referenciando uma order Pix real recém-
criada (`ORD01M12AW8G7ZNZNQDMKZW9RZZPH`), e mandei pra `/api/mercadopago/webhook` com o header da
304 também. Resposta: `assinaturaValida: true`, evento gravado em `jsgrafica_mercadopago_eventos`
com `erro: null`. `pedidosConfirmados: 0` está CERTO (o pedido de teste não foi pago de verdade
por ninguém) — confirma também que o webhook nunca confia cegamente no aviso, sempre rebusca a
order real antes de confirmar qualquer coisa (comportamento por desenho da 124, intacto).

### Testes realizados e resultado
Todos os testes já estão descritos acima (dado real, não sintético isolado — pedidos de verdade
gravados na tabela real, cobranças reais no Mercado Pago). Todos os pedidos/eventos/rascunhos de
teste (`ped-teste-326-*`, evento do webhook, rascunhos pro telefone de teste) foram apagados depois
de cada confirmação.

### Achados fora do escopo (relatados, não resolvidos por conta própria)
Nenhum novo.

### Status final: concluída (3 gaps confirmados — 1 é limite conhecido e aceito, 2 confirmados
funcionando sem necessidade de correção)
