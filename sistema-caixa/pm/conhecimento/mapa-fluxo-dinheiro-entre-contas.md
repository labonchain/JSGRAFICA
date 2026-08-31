# Mapa — pra onde o dinheiro vai (e o que o sistema NÃO sabe sozinho)

Criado pelo PM em 2026-07-16, a pedido do Edvam depois do caso da recarga VEM de R$102,50 (venda
não lançada, dinheiro físico parado na gaveta da Zu, recarga bancada pelo saldo do Mercado Pago).
Motivo: "tem muito giro de saldo entre as contas e dinheiro físico, precisa mapear e organizar
isso pra automatizar de fato e não ficar pendência onde não deveria existir". Isto documenta o
que existe HOJE (verificado no schema real, não suposição) — a base pra decidir o que automatizar.

## As "contas" (carteiras de dinheiro) que existem

| Conta | O que é | Onde o saldo aparece no sistema |
|---|---|---|
| 💵 Dinheiro físico — gaveta Zu | Espécie na mão da Zu | `jsgrafica_fechamento.dinheiro/moedas` (linha `fechado_por='Zu'`) |
| 💵 Dinheiro físico — gaveta Gabi | Espécie na mão da Gabi | idem, linha `fechado_por='Gabi'` |
| 💵 Dinheiro físico — sem dono | Edvam não tem gaveta própria (achado 196) | conta pra Zu/Gabi via `gaveta_destino` |
| 🏦 Caixa Econômica | Conta bancária "da caixa" | `jsgrafica_fechamento.saldo_caixa_economica` |
| 💳 Mercado Pago | Saldo de Pix/cartão recebido via MP | `jsgrafica_fechamento.saldo_mercadopago` |
| 💳 Stone | Maquininha de cartão | `jsgrafica_fechamento.saldo_stone` |
| 📱 RecargaPay | Conta usada pra fazer as recargas VEM/Celular | `jsgrafica_fechamento.saldo_recargapay` |

**Importante**: todos os `saldo_*` do fechamento são preenchidos **manualmente** pelo Edvam
olhando o app/extrato de cada um na hora de fechar o caixa geral — o sistema não sabe, sozinho,
quanto cada conta deveria ter. Não existe conciliação automática nenhuma hoje.

## Fluxos que o sistema JÁ grava sozinho (automáticos)

- **Venda em Dinheiro** → conta pra gaveta de quem vendeu (`pedido_criado_por`), ou pra
  `gaveta_destino` escolhida quando quem vende não tem gaveta própria (196/197).
- **Venda em Pix (Mercado Pago)** → gera cobrança real via Orders API, confirmação automática
  quando paga (`criarCobrancaPix`/`confirmarPedidosPagosPorOrder`).
- **Venda em Cartão** → confirmação manual (Stone não tem integração), mas fica marcado
  `forma_pagamento='Cartão'`.
- **Repasse de Recarga VEM/Celular** → gera automaticamente uma saída de `valor − R$2,50` na
  categoria `recarga_vem`/`recarga_cel`, vinculada ao pedido (`saida_vinculada_id`), atribuída ao
  mesmo operador que vendeu (`pedido_criado_por`).

## A lacuna estrutural (achado de hoje)

`jsgrafica_saidas` **não tem nenhum campo de "de qual conta esse dinheiro saiu"** — só tem
`operador` (quem/qual gaveta). Isso funciona bem quando a saída realmente sai da MESMA gaveta que
recebeu a venda (o caso comum) — mas quebra quando alguém banca a saída de outro jeito, como
aconteceu hoje: **a recarga foi paga em Dinheiro na gaveta da Zu, mas o repasse de verdade saiu do
saldo do Mercado Pago, não da gaveta dela.** O sistema registrou a saída como se fosse "da Zu"
(porque é o único campo que existe), mas fisicamente:
- Os R$102,50 continuam 100% físicos na gaveta da Zu (nada saiu de lá ainda).
- O saldo do Mercado Pago é que caiu R$100 de verdade.
- Amanhã, R$100 em espécie vão ser depositados na Caixa Econômica pra "devolver" o que o Mercado
  Pago adiantou — um **terceiro** movimento (Dinheiro → Banco), que hoje não tem NENHUM registro
  no sistema — é 100% de cabeça do Edvam.

Isso é o padrão geral, não só desse caso: sempre que uma saída é bancada por uma conta diferente
de onde a venda entrou (recarga paga em dinheiro mas repassada via saldo digital, ou o contrário),
o sistema não tem como saber — e o "depósito físico pro banco" (a etapa que fecha o ciclo) não
existe em lugar nenhum hoje.

## O que precisaria pra automatizar de verdade

1. **Campo novo em `jsgrafica_saidas`**: `conta_origem` (ex.: `dinheiro_zu`, `dinheiro_gabi`,
   `mercadopago`, `stone`, `caixa_economica`, `recargapay`) — separado de `operador` (que
   continua significando "quem vendeu/gaveta original da venda"). Isso é o que faltou hoje: a
   saída de R$100 devia ter `conta_origem='mercadopago'`, não ser tratada como se tivesse saído
   da gaveta da Zu.
2. **Registro do "depósito físico → banco"**: um tipo de lançamento pra "peguei dinheiro da
   gaveta X e depositei/usei pra repor a conta Y" — hoje esse movimento não existe em lugar
   nenhum, só de cabeça/WhatsApp. Sem isso, toda vez que uma conta digital "adianta" uma despesa
   que devia ser física (ou vice-versa), fica pendência igual a de hoje.
3. **Com os dois acima**, o fechamento geral deixa de depender 100% do Edvam decorar/contar
   manualmente cada saldo — dá pra somar o que o sistema já sabe (saldo anterior + entradas −
   saídas **por conta**) e só CONFERIR contra o extrato real, em vez de digitar tudo do zero.

## O que isso NÃO é agora
Não é uma demanda pronta pra executar — é o mapa que faltava antes de decidir o que construir.
Meu próximo passo depende do Edvam: quer que eu já escreva a demanda do `conta_origem` (item 1,
o mais barato e que já resolveria o caso de hoje de vez), ou quer ver o mapa completo primeiro
e decidir prioridade?
