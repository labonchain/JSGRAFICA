# Fechamento de julho — decisões calculadas manualmente, aguardando aplicação pós-263

Documento de apoio pro 05-FINANCEIRO aplicar depois que a demanda 263 (bug de dupla contagem de
item MP classificado como transferência) estiver corrigida. Cada linha abaixo é uma decisão já
confirmada com o Edvam, mas **não aplicada ainda no sistema** — aplicar via
`PATCH /api/conciliacao/pendencias` (ação `transferencia`) depois que a 263 estiver no ar, e então
rodar `/api/conciliacao/rodar` de novo pra cada dia pra conferir o número final.

## Já aplicadas (não afetadas pelo bug 263, para referência/contexto)
- 20-07-26, Mercado Pago, R$611,26: classificado como transferência vinda de `caixa_economica`
  (id pendência `cd26bda0-e326-4fd1-8496-8c4826c5dbf5`, transferência criada
  `204c6d55-b3cd-41e4-8f77-6339db30ffc3`) — **JÁ aplicada, antes de percebermos o bug 263**. O
  número exibido pro Mercado Pago de 20/07 está temporariamente inflado (~2x R$611,26) até a
  correção sair. Não precisa reaplicar, só reconferir o número final depois da correção.
- 21-07-26, Mercado Pago, R$300,00: classificado como transferência vinda de `dinheiro_zu` (id
  pendência `f3aa5bfd-7df9-4610-a3d5-70ee797bd1e6`, transferência `8106a077-ed39-47a4-81ff-f7206676dca3`)
  — mesma situação, já aplicada antes do achado do bug, número de 21/07 também está inflado até a
  correção.

## Aplicada em 2026-08-07 (263 já concluída)
- **29-07-26, Mercado Pago, R$100,00** — classificado como transferência de `dinheiro_zu`,
  aplicado com sucesso.

## Histórico (pendente antes da aplicação acima)
- **29-07-26, Mercado Pago, R$100,00** (pendência id `d99c231c-ade8-43b3-a41e-ba0c297c6fd0`, item
  `mercadopago_pagamento`, o que a tela sugeria vincular ao pedido `ped-1821` — **confirmado pelo
  Edvam que NÃO é esse pedido**): foi um depósito de dinheiro físico que deveria ter ido inteiro
  pra Caixa Econômica, mas R$100 caiu no Mercado Pago por engano. Classificação correta:
  `transferencia`, contraparte `dinheiro_zu` (ou geral, mesma ressalva da demanda 261), descrição
  "Depósito de dinheiro físico que deveria ir pra Caixa Econômica, mas caiu no Mercado Pago por
  engano — confirmado pelo Edvam". **Não aplicar ainda** — depois da 263, classificar e reconferir
  o gap do Mercado Pago em 29-07-26 (hoje mostra pequeno resíduo já resolvido; pode mudar).

## Contexto útil pra quem for aplicar
- Cadeia real do dia 20/07 (Placa Solar): R$121 (saldo em dinheiro do dia 17/07, sistema de
  transferências ainda não existia) + R$490,58 (aporte pessoal do Edvam, conta fora do sistema)
  somaram R$611,26/611,58 na Caixa Econômica, que foi transferido pro Mercado Pago e pago à Placa
  Solar (saída já corrigida com `conta_origem='mercadopago'` mais cedo na mesma sessão). O R$121
  e o R$490,26 (residual, virou pendência `sabido`) já foram tratados à parte da Caixa Econômica.
- Cadeia real do dia 21/07 (Caixa Econômica): R$121 do dia 17 entrou E saiu no mesmo dia 20/07
  (líquido zero, saldo do fechamento de 20/07 corrigido de R$121 pra R$0). No dia 21/07, R$87
  (dinheiro físico do dia 20) foi depositado na Caixa Econômica — registrado como transferência
  real. Sobrou R$121,00 (coincidência de valor, confirmado pelo Edvam que é assunto totalmente
  separado do R$121 do dia 20) ainda sem explicação no dia 21/07 — ver pendência aberta
  `saldo_dia_agregado`, conta `caixa_economica`, 21-07-26.

## Como usar este arquivo
Cada vez que o PM/Edvam decidir uma classificação que envolveria reclassificar um item
`mercadopago_pagamento` como transferência (o cenário que dispara o bug 263), a decisão entra
numa linha nova na seção "Pendente de aplicação" acima, com: id da pendência, data, conta contraparte,
valor, motivo. Não aplicar no sistema até a 263 confirmar corrigida.
