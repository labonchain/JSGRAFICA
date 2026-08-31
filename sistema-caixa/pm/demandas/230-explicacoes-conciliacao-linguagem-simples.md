# 230 — Conciliação: explicar cada item em linguagem simples, não em fórmula

Status: concluída
Criada em: 2026-07-22
Aprovada em: 2026-07-22
Concluída em: 2026-07-22
Chat executor: 03 - APP JS GRAFICA

## Contexto
A tela de Conciliação (demanda 229) já está no ar e mostrando os itens reais corretamente, mas o
texto de cada item saiu direto da lógica interna, não pensado pra quem vai ler (o Edvam, sem
contexto técnico do dia a dia do código). Exemplos reais vistos em produção hoje:

- "Diferença de saldo agregada — Variação informada R$87,00 vs calculada R$0,00 (entrada R$0,00 –
  saída R$0,00)." — não diz o que isso significa na prática nem o que fazer.
- "Diferença de saldo agregada — Variação informada R$102,67 vs calculada R$65,75 (entrada
  R$125,75 – saída R$60,00) (já descontado R$327,50 identificado item a item na conciliação do
  Mercado Pago do mesmo dia)." — expõe o mecanismo interno de dedup (227↔228) pro usuário, que não
  precisa nem deveria precisar entender isso pra usar a tela.
- "Mercado Pago sem vínculo — Mercado Pago — account_money, 21/07/2026, 08:20:18" — `account_money`
  é um termo técnico da API do Mercado Pago, não significa nada pro Edvam.

O Edvam pediu explicitamente: essa tela precisa explicar, não gerar mais dúvida.

## Objetivo
Cada item da Conciliação se explica sozinho, em português simples, dizendo (1) o que aconteceu de
verdade e (2) que decisão o Admin precisa tomar — sem expor fórmula, nome de campo técnico ou
mecanismo interno de dedup.

## ⚠️ Checkpoint obrigatório antes de mexer em código
Proponha os textos novos (pode ser uma lista de exemplos, não precisa protótipo visual) pros
principais tipos de item, relate ao PM, e só depois de confirmação explícita implemente.

## Escopo
- Incluído: reescrever `descricao_sugerida` (gerada em `lib/conciliacao.ts`, 227/228) e/ou a
  camada de apresentação em `TelaConciliacao.tsx`/`ModalClassificarPendencia.tsx` (o que fizer
  mais sentido tecnicamente, documentar a escolha) pros casos reais:
  - **`saldo_dia_agregado`, positivo** (sobrou saldo sem explicação): algo como "O saldo que você
    informou de [conta] subiu R$X nesse dia, mas o sistema não tem nenhuma venda, despesa ou
    transferência que explique isso. De onde veio esse dinheiro?"
  - **`saldo_dia_agregado`, negativo** (faltou saldo sem explicação): "O saldo que você informou
    de [conta] ficou R$X menor do que o sistema esperava nesse dia[, já descontando os itens
    individuais listados abaixo, quando aplicável]. Pra onde foi esse dinheiro?" — a parte do
    desconto (dedup MP↔MP) deve aparecer só se relevante, e de forma que não pareça jargão (ex.:
    "esse valor já não conta o que está listado nos itens individuais abaixo", não "descontado
    R$X identificado item a item").
  - **`mercadopago_pagamento`** (pagamento sem vínculo): traduzir `payment_type_id` pra português
    reconhecível — `bank_transfer` = "Pix", `account_money` = "saldo interno do Mercado Pago" (ou
    termo melhor se o executor achar mais claro pesquisando o que esse tipo realmente representa),
    outros tipos conforme aparecerem. Frase no formato "Você recebeu R$X por [Pix/...] no Mercado
    Pago às HH:MM do dia DD/MM, sem nenhum pedido ou venda correspondente. Você sabe o que foi
    esse pagamento?"
- Incluído: revisar os rótulos genéricos da tela também ("Diferença de saldo agregada", "Mercado
  Pago sem vínculo") se ficarem melhores com um nome mais direto — não obrigatório manter os
  nomes atuais.
- Explicitamente fora de escopo: mudar a lógica de cálculo/matching (227/228, já corretas — isso
  é só sobre como o resultado é comunicado). Mudar o fluxo de classificação (229, já funciona).

## Critérios de aceite
- [x] Nenhum item da tela mostra fórmula bruta ("variação informada vs calculada") ou termo
      técnico da API do Mercado Pago sem tradução
- [x] Cada item deixa claro o que aconteceu e que decisão o Admin precisa tomar
- [x] Testado visualmente contra os itens reais já em produção (a lista de hoje)

## Riscos e cuidados
Não perder informação real ao simplificar — o Admin ainda precisa conseguir ver o valor exato, a
conta e a data. Simplificar a explicação, não escondê-la.

## Referências
Demanda 225 (desenho), 227/228 (geração dos itens), 229 (tela). Print real do Edvam (2026-07-22)
com os textos atuais que motivaram esta demanda.

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  - **Pesquisado o significado real de `payment_type_id`** da API do Mercado Pago (não é
    suposição) — `account_money` é pagamento feito com o saldo que já estava na própria
    conta/carteira do Mercado Pago (distinto de `bank_transfer`=Pix). Mapa de tradução criado em
    `lib/conciliacao.ts` (`fraseTipoPagamentoMP`) cobrindo os tipos documentados na API
    (bank_transfer, account_money, ticket, credit_card, debit_card, prepaid_card, atm,
    digital_wallet, digital_currency, crypto_transfer) + fallback genérico pra tipo não mapeado
    (nunca quebra, só mostra o tipo cru entre aspas).
  - **`lib/conciliacao.ts`** (227/228): `descricao_sugerida` reescrita nos 2 pontos de geração —
    `mercadopago_pagamento` agora no formato "Você recebeu R$X {via Pix/do saldo que já estava na
    conta/etc.} no Mercado Pago às HH:MM do dia DD/MM, sem nenhum pedido ou venda correspondente
    no sistema. Você sabe o que foi esse pagamento?"; `saldo_dia_agregado` agora em 2 variantes
    (saldo sobrou / saldo faltou) sem expor "variação informada vs calculada" nem o valor exato
    do desconto de dedup 227↔228 — só avisa QUE já foi descontado, quando aplicável ("esse valor
    já não conta os pagamentos individuais do Mercado Pago listados separadamente nesta tela").
  - **Rótulos genéricos revisados** (`TelaConciliacao.tsx`, `ModalClassificarPendencia.tsx`):
    "Mercado Pago sem vínculo"/"Pagamento do Mercado Pago sem vínculo" → "Pagamento não
    identificado"; "Diferença de saldo agregada"/"...informado vs calculado" → "Saldo sem
    explicação" — servem só de etiqueta curta agora, a frase completa carrega a explicação real.
  - **Backfill de uma vez só** (`scripts/backfill-230-descricao-amigavel.ts`, mantido no repo) —
    reescreveu `descricao_sugerida` dos 10 itens reais já em produção (todos ainda `pendente`,
    nenhum classificado/ignorado foi tocado): os 5 `mercadopago_pagamento` tiveram o pagamento
    rebuscado na API do Mercado Pago (mesmo `origem_externa_id`, só pra pegar `payment_type_id`/
    horário de novo — valor/conta/status intactos); os 2 `saldo_dia_agregado` recalculados dos
    campos já salvos na própria linha, incluindo o de Mercado Pago com o texto de dedup.
- Testes realizados e resultado:
  - `npx tsc --noEmit`/`npm run build` limpos.
  - Testado com dado sintético (`scripts/teste-230-textos.ts` + `scripts/teste-230-textos-dedup.ts`,
    mantidos no repo) via `calcularGapContasSemApi` real, dia isolado: caso positivo, negativo
    simples e negativo-com-dedup — os 3 textos saíram exatamente como propostos no checkpoint.
    `mercadopago_pagamento` não dá pra sintetizar (não existe "pagamento aprovado falso" na API
    real do MP) — validado pelo próprio backfill contra pagamentos reais.
  - Backfill rodado contra produção: os 10 itens reais confirmados com o texto novo (visto
    diretamente via `GET /api/conciliacao/pendencias`) — nenhuma fórmula bruta, nenhum termo
    técnico sem tradução, R$300/R$-290,58/os créditos de "cofrinho" (`account_money`) todos
    legíveis em português simples.
- Achados fora do escopo:
  - Nenhum novo.
- Status final: concluída, testada (sintético + backfill real conferido) e em produção — deploy
  `dpl_EaGX6DT5hVt8WQwDNFCt5kR8s3Sr`, alias confirmado em `pdv.jsgrafica.site` e
  `admin.jsgrafica.site`.
