# Investigação bruta e isolada — 09/07 a 18/07/2026

Feita por um agente sem nenhum contexto das demandas 200-216 nem desta conversa — só schema
técnico das tabelas e acesso direto ao Supabase + API real do Mercado Pago. Instrução explícita:
listar fatos, não interpretar, não rotular nada como bug/certo/errado, não propor correção.

Fontes: `jsgrafica_saidas`, `jsgrafica_transferencias`, `jsgrafica_pedidos`, `jsgrafica_fechamento`
+ API real do Mercado Pago (pagamentos `status='approved'`, mesmo token ativo do sistema).

Notas técnicas do próprio agente: `created_at` de saídas/transferências está em UTC (Recife é
UTC-3); horários do Mercado Pago abaixo já convertidos pra horário de Recife; `jsgrafica_pedidos`
não tem `data_dia`, o agrupamento por dia usa `created_at` convertido.

---

## 09-07-26 (quarta)

### Saídas
| valor | categoria_id | conta_origem | operador | descrição | created_at (UTC) |
|---|---|---|---|---|---|
| 20.00 | fornecedores | null | Edvam | 01 caneca | 2026-07-09 13:40:00 |
| 12.50 | recarga_vem | null | Edvam | Repasse automático: 1x recarga, recebido R$15,00, taxa R$2,50 | 2026-07-09 15:44:21 |
| 60.00 | socios | null | Edvam | (sem descrição) | 2026-07-09 22:13:05 |
| 0.86 | diversas | null | Edvam | (sem descrição) | 2026-07-09 22:13:24 |
| 19.60 | recarga_cel | null | Edvam | (sem descrição) | 2026-07-09 22:14:54 |
| 27.50 | recarga_vem | null | Edvam | Repasse automático: 1x recarga, recebido R$30,00, taxa R$2,50 | 2026-07-09 22:22:13 |
| 50.00 | recarga_vem | null | Edvam | Repasse automático: 1x recarga, recebido R$52,50, taxa R$2,50 | 2026-07-09 22:22:14 |
| 9.00 | socios | null | Edvam | (sem descrição) | 2026-07-09 22:23:07 |
| 24.00 | socios | null | Edvam | (sem descrição) | 2026-07-09 22:24:03 |
| 17.50 | recarga_vem | recargapay | Edvam | "Repasse (recriado pelo PM, corrigindo atribuição de gaveta física para conta RecargaPay)" | 2026-07-18 18:39:31 (lançado 9 dias depois, retroativo ao dia 09) |

### Transferências
Sem dado.

### Pedidos por forma de pagamento
| forma_pagamento | status | qtd | soma |
|---|---|---|---|
| Cartão | entregue | 7 | 46.10 |
| Dinheiro | entregue | 57 | 231.75 |
| Dinheiro | cancelado | 1 | 0.45 |
| Pix | entregue | 25 | 182.05 |
| Pix | cancelado | 7 | 3.15 |
| null | cancelado | 16 | 88.05 |

### Fechamento
**Gabi**: saldo_anterior 28.55 | entradas 167.30 | saídas 0.00 | resultado 167.30 | acumulado 195.85 | dinheiro 147.00 | moedas 30.30 | físico 177.30 | divergência -18.55 | fechado_em 2026-07-09 20:39:47

**Zu**: saldo_anterior 35.70 | entradas 4.50 | saídas 0.00 | resultado 4.50 | acumulado 40.20 | dinheiro 52.00 | moedas 33.55 | físico 85.55 | divergência 45.35 | fechado_em 2026-07-09 21:52:12

**Sistema**: saldo_anterior 2009.75 | entradas 445.10 | saídas 240.96 | resultado 204.14 | acumulado 2213.89 | bancos 2050.64 | dinheiro 194.00 | moedas 63.85 | físico 2308.49 | divergência 94.60 | saldo_mercadopago 1114.36 | saldo_caixa_economica 594.00 | saldo_stone 236.61 | saldo_recargapay 105.67 | fechado_em 2026-07-10 03:00:00

`resumo_ia` gravado: "O dia 09-07-26 registrou entradas de R$ 445,10 e saídas de R$ 240,96... A divergência no fechamento geral de R$ 94,60 é significativa. (...) Os dados disponíveis não explicam a totalidade da diferença."

### Mercado Pago aprovado (34 transações, R$295,36)
Majoritariamente Pix pequenos (R$0,36 a R$90,00) + 2x R$2,00 `account_money` (referência `POTS_...`).

---

## 10-07-26 (quinta)

### Saídas
| valor | categoria_id | conta_origem | operador | descrição | created_at (UTC) |
|---|---|---|---|---|---|
| 20.00 | recarga_vem | null | Edvam | Repasse automático: recebido R$22,50, taxa R$2,50 | 2026-07-10 16:06:10 |
| 57.00 | fornecedores | null | Edvam | Photograf 3 banners | 2026-07-10 18:32:57 |
| 27.50 | recarga_vem | null | Gabi | Repasse automático: recebido R$30,00, taxa R$2,50 | 2026-07-10 19:13:47 |
| 3.75 | diversas | null | Edvam | (sem descrição) | 2026-07-10 22:14:25 |
| 19.60 | recarga_cel | null | Edvam | (sem descrição) | 2026-07-10 22:22:46 |
| 68.00 | socios | null | Edvam | (sem descrição) | 2026-07-10 22:23:14 |
| 5.00 | transporte_uber_taxi_oniubs | null | Edvam | Motoqueiro | 2026-07-10 22:25:51 |
| 350.00 | folha | null | Edvam | (sem descrição) | 2026-07-10 22:43:40 |
| 1915.00 | cartoes | null | Edvam | "Pagamento cartão Mercado Pago da gráfica (parte da gráfica do total de R$2.915 — R$1.000 cobertos por depósito da Dizu Refeições)" | 2026-07-12 18:09:22 (lançado 2 dias depois, retroativo ao dia 10) |
| 20.00 | recarga_vem | recargapay | Edvam | "Repasse (recriado pelo PM...)" | 2026-07-18 18:39:40 (lançado 8 dias depois, retroativo ao dia 10) |

### Transferências
Sem dado.

### Pedidos por forma de pagamento
| forma_pagamento | status | qtd | soma |
|---|---|---|---|
| Cartão | entregue | 8 | 78.40 |
| Dinheiro | entregue | 49 | 241.10 |
| Dinheiro | cancelado | 2 | 1.65 |
| Pix | entregue | 29 | 259.30 |
| Pix | cancelado | 2 | 12.00 |
| null | cancelado | 6 | 30.40 |

### Fechamento
**Gabi**: saldo_anterior 30.30 | entradas 165.00 | saídas 27.50 | resultado 137.50 | acumulado 167.80 | dinheiro 190.00 | moedas 29.10 | físico 219.10 | divergência 51.30 | fechado_em 2026-07-10 20:47:23

**Zu**: saldo_anterior 33.55 | entradas 6.60 | saídas 0.00 | resultado 6.60 | acumulado 40.15 | dinheiro 30.00 | moedas 33.60 | físico 63.60 | divergência 23.45 | fechado_em 2026-07-10 22:00:48

**Sistema**: saldo_anterior 2213.89 | entradas 578.80 | saídas 2485.85 | resultado -1907.05 | acumulado 424.41 | bancos 138.90 | dinheiro 232.00 | moedas 62.70 | físico 433.60 | divergência 9.19 | saldo_mercadopago 0 | saldo_caixa_economica 0 | saldo_stone 86.40 | saldo_recargapay 52.50 | **fechado_em 2026-07-12 18:09:11** (fechamento do dia 10 só foi gravado no dia 12) | resumo_ia: null

### Mercado Pago aprovado (41 transações, R$5.291,56)
Maioria Pix pequenos (R$0,45 a R$90,00), mais 6x `account_money` pequenos. Destaques:
- 19:20:28 — R$1.000,00, pix
- 19:38:32 — R$170,00, pix
- 19:48:57 — R$222,00, pix
- 19:52:09 — R$589,00, pix
- **20:14:47 — R$2.915,00, account_money, referência `ccpaymentprod_423679921_...`**

Rejeitados no mesmo dia (não somados acima, `status='rejected'`, `cc_rejected_high_risk`): 4
transações de R$900,00 cada, entre 21:18 e 21:25 local.

---

## 11 e 12-07-26 (sexta e sábado)

11/07: sem dado em nenhuma tabela (nem saída, nem pedido, nem fechamento, nem pagamento MP).

12/07: sem dado nas tabelas internas. Mercado Pago aprovado: 3 transações, R$42,00 (R$35,00 pix +
2x `account_money` pequenos).

---

## 13-07-26 (domingo)

### Saídas
| valor | categoria_id | conta_origem | operador | descrição | created_at (UTC) |
|---|---|---|---|---|---|
| 27.50 | recarga_vem | null | Zu | Repasse automático: recebido R$30,00, taxa R$2,50 | 2026-07-13 12:18:53 |
| 19.60 | recarga_cel | null | Edvam | (sem descrição) | 2026-07-13 22:04:04 |
| 1.25 | diversas | null | Edvam | Taxa Pix | 2026-07-13 22:04:26 |
| 0.40 | diversas | null | Edvam | Taxa cartão | 2026-07-13 22:06:03 |
| 60.00 | socios | null | Edvam | (sem descrição) | 2026-07-13 22:08:39 |
| 39.51 | telefone_internet | null | Edvam | "Baixa de conta a pagar: Vivo - Telefone" | 2026-07-13 22:14:03 |
| 17.50 | recarga_vem | recargapay | Gabi | "Repasse (recriado pelo PM...)" | 2026-07-18 18:39:48 (retroativo ao dia 13) |

### Transferências
Sem dado.

### Pedidos por forma de pagamento
| forma_pagamento | status | qtd | soma |
|---|---|---|---|
| Cartão | entregue | 3 | 20.35 |
| Dinheiro | entregue | 61 | 250.27 |
| Dinheiro | pronto | 1 | 65.00 |
| Dinheiro | cancelado | 1 | 16.80 |
| Pix | entregue | 41 | 236.00 |
| Pix | cancelado | 3 | 14.60 |
| null | cancelado | 3 | 21.20 |

### Fechamento
**Gabi**: saldo_anterior 29.10 | entradas 183.10 | saídas 0.00 | resultado 183.10 | acumulado 212.20 | dinheiro 209.00 | moedas 26.45 | físico 235.45 | divergência 23.25 | fechado_em 2026-07-13 20:36:17

**Zu**: saldo_anterior 33.60 | entradas 17.90 | saídas 27.50 | resultado -9.60 | acumulado 24.00 | dinheiro 88.00 | moedas 34.40 | físico 122.40 | divergência 98.40 | fechado_em 2026-07-13 22:31:46

**Sistema**: saldo_anterior 424.41 | entradas 590.67 | saídas 165.76 | resultado 424.91 | acumulado 849.32 | bancos 471.05 | dinheiro 297.00 | moedas 60.85 | físico 828.90 | divergência -20.42 | saldo_mercadopago 163.26 | saldo_caixa_economica 232.00 | saldo_stone 50.11 | saldo_recargapay 25.68 | fechado_em 2026-07-14 00:57:51

### Mercado Pago aprovado (31 transações, R$205,60)
Todos Pix pequenos (R$0,45 a R$23,20) + 1x `account_money` R$2,00. Vários já com referência de
pedido/venda (ex.: ped-0754, ped-0756, venda-...).

---

## 14-07-26 (segunda)

### Saídas
| valor | categoria_id | conta_origem | operador | descrição | created_at (UTC) |
|---|---|---|---|---|---|
| 50.00 | recarga_vem | null | Gabi | Repasse automático: recebido R$52,50, taxa R$2,50 | 2026-07-14 10:59:19 |
| 15.00 | fornecedores | null | Edvam | Adesivo leitoso | 2026-07-14 16:59:09 |
| 125.00 | recarga_cel | null | Edvam | (sem descrição) | 2026-07-14 21:25:34 |
| 150.00 | socios | null | Edvam | "Zu" | 2026-07-14 21:27:12 |
| 50.00 | socios | null | Edvam | (sem descrição) | 2026-07-14 21:27:22 |
| 0.45 | diversas | null | Edvam | vendas cartão | 2026-07-14 21:29:44 |
| 0.86 | diversas | null | Edvam | vendas pix | 2026-07-14 21:35:30 |
| 17.50 | recarga_vem | recargapay | Edvam | "Repasse (recriado pelo PM...)" | 2026-07-18 18:39:56 (retroativo) |
| 22.50 | recarga_vem | recargapay | Gabi | "Repasse (recriado pelo PM...)" | 2026-07-18 18:40:04 (retroativo) |

### Transferências
Sem dado.

### Pedidos por forma de pagamento
| forma_pagamento | status | qtd | soma |
|---|---|---|---|
| Cartão | entregue | 5 | 24.80 |
| Dinheiro | entregue | 53 | 310.10 |
| Dinheiro | cancelado | 1 | 7.00 |
| Pix | entregue | 17 | 141.70 |
| Pix | cancelado | 1 | 4.80 |
| null | cancelado | 3 | 9.90 |

### Fechamento
**Gabi**: saldo_anterior 26.45 | entradas 244.40 | saídas 50.00 | resultado 194.40 | acumulado 220.85 | dinheiro 197.00 | moedas 25.20 | físico 222.20 | divergência 1.35 | fechado_em 2026-07-14 20:33:51

**Zu**: saldo_anterior 34.40 | entradas 39.30 | saídas 0.00 | resultado 39.30 | acumulado 73.70 | dinheiro 47.00 | moedas 37.75 | físico 84.75 | divergência 11.05 | fechado_em 2026-07-14 21:12:20

**Sistema**: saldo_anterior 849.32 | entradas 476.60 | saídas 431.31 | resultado 45.29 | acumulado 894.61 | bancos 627.23 | dinheiro 244.00 | moedas 62.95 | físico 934.18 | divergência 39.57 | saldo_mercadopago 314.61 | saldo_caixa_economica 182.00 | saldo_stone 92.23 | saldo_recargapay 38.39 | fechado_em 2026-07-14 23:23:37

### Mercado Pago aprovado (16 transações, R$152,20)
Todos Pix pequenos (R$1,20 a R$57,00), maioria com referência de pedido/venda.

---

## 15-07-26 (terça)

### Saídas
| valor | categoria_id | conta_origem | operador | descrição | created_at (UTC) |
|---|---|---|---|---|---|
| 60.00 | socios | null | Edvam | (sem descrição) | 2026-07-15 21:51:12 |
| 6.00 | material_de_expediente | null | Edvam | (sem descrição) | 2026-07-15 21:51:31 |
| 19.60 | recarga_cel | null | Edvam | (sem descrição) | 2026-07-15 21:51:59 |
| 16.00 | transporte_uber_taxi_oniubs | null | Edvam | (sem descrição) | 2026-07-15 21:56:49 |
| 1.55 | diversas | null | Edvam | taxa pix | 2026-07-15 22:19:06 |
| 0.86 | diversas | null | Edvam | taxa cartões | 2026-07-15 22:20:07 |
| 9.50 | recarga_vem | null | Edvam | (sem descrição) | 2026-07-15 22:24:14 |
| 67.50 | recarga_vem | null | Edvam | (sem descrição) | 2026-07-15 22:25:36 |
| 1300.00 | aluguel | null | Edvam | "Aluguel (casa) — pago com transferências Caixa R$260 + Stone R$134 + Mercado Pago + empréstimo Dizu R$400" | 2026-07-15 23:47:42 |
| 17.50 | recarga_vem | recargapay | Gabi | "Repasse (recriado pelo PM...)" | 2026-07-18 18:40:11 (retroativo) |
| 10.00 | recarga_vem | recargapay | Gabi | "Repasse (recriado pelo PM...)" | 2026-07-18 18:40:20 (retroativo) |

### Transferências
Sem dado.

### Pedidos por forma de pagamento
| forma_pagamento | status | qtd | soma |
|---|---|---|---|
| Cartão | entregue | 5 | 43.60 |
| Dinheiro | entregue | 48 | 662.35 |
| Pix | entregue | 32 | 166.80 |
| null | cancelado | 1 | 2.20 |
| null | confirmado | 1 | 4.00 |

### Fechamento
**Gabi**: saldo_anterior 25.20 | entradas 107.60 | saídas 0.00 | resultado 107.60 | acumulado 132.80 | dinheiro 93.00 | moedas 23.35 | físico 116.35 | divergência -16.45 | fechado_em 2026-07-15 20:33:53

**Zu**: saldo_anterior 37.75 | entradas 50.05 | saídas 0.00 | resultado 50.05 | acumulado 87.80 | dinheiro 151.00 | moedas 33.40 | físico 184.40 | divergência 96.60 | fechado_em 2026-07-15 21:10:59

**Sistema**: saldo_anterior 894.61 | entradas 859.55 | saídas 1508.51 | resultado -648.96 | acumulado 245.65 | bancos 80.62 | dinheiro 244.00 | moedas 56.75 | físico 381.37 | divergência 135.72 | saldo_mercadopago 42.86 | saldo_caixa_economica 0 | saldo_stone 0.97 | saldo_recargapay 36.79 | fechado_em 2026-07-16 00:24:41

### Mercado Pago aprovado (33 transações, R$1.087,80)
Maioria Pix pequenos. Destaques:
- 20:01:05 — R$400,00, pix
- 20:08:09 — R$260,00, pix
- 20:13:25 — R$134,00, pix
- 20:31:19 — R$36,00, pix
- 23:13:49 — R$75,00, pix

**Nota do agente**: os três valores destacados (400,00 / 260,00 / 134,00 = R$794,00) batem
exatamente com as parcelas citadas na descrição da saída de "Aluguel" do mesmo dia — só que a
descrição atribui os R$260 à Caixa Econômica e R$134 à Stone, e os três apareceram como **Pix
recebidos no Mercado Pago**, não como saída de nenhuma das duas outras contas.

---

## 16-07-26 (quarta)

### Saídas
| valor | categoria_id | conta_origem | operador | descrição | created_at (UTC) |
|---|---|---|---|---|---|
| 19.60 | recarga_cel | null | Edvam | (sem descrição) | 2026-07-16 19:12:58 |
| 50.00 | socios | null | Edvam | (sem descrição) | 2026-07-16 19:15:04 |
| 1.08 | diversas | null | Edvam | Taxa cartões | 2026-07-16 19:33:43 |
| 100.00 | recarga_vem | mercadopago | Zu | "Repasse automático na hora da venda: 1x recarga, valor recebido R$ 102,50, taxa R$ 2,50/recarga — lançamento retroativo (venda não registrada na hora, achado do Edvam)" | 2026-07-16 20:17:43 |
| 10.00 | recarga_cel | recargapay | Edvam | "Repasse (recriado pelo PM...)" | 2026-07-18 18:40:27 (retroativo) |

### Transferências
Sem dado.

### Pedidos por forma de pagamento
| forma_pagamento | status | qtd | soma |
|---|---|---|---|
| Cartão | entregue | 1 | 12.50 |
| Dinheiro | entregue | 14 | 151.60 |
| Dinheiro | cancelado | 1 | 20.00 |
| Pix | entregue | 26 | 127.35 |
| Pix | aguardando_retirada | 2 | 8.70 |
| null | cancelado | 2 | 8.00 |

### Fechamento
**Gabi**: saldo_anterior 23.35 | entradas 36.70 | saídas 0.00 | resultado 36.70 | acumulado 60.05 | dinheiro 39.00 | moedas 23.35 | físico 62.35 | divergência 2.30 | fechado_em 2026-07-16 18:04:02

**Zu**: saldo_anterior 33.40 | entradas 122.10 | saídas 0.00 | resultado 122.10 | acumulado 155.50 | dinheiro 118.50 | moedas 34.80 | físico 153.30 | divergência -2.20 | fechado_em 2026-07-16 19:06:51

**Sistema**: saldo_anterior 245.65 | entradas 313.35 | saídas 180.68 | resultado 132.67 | acumulado 378.32 | bancos 213.50 | dinheiro 157.50 | moedas 58.15 | físico 429.15 | divergência 50.83 | saldo_mercadopago 94.84 | saldo_caixa_economica 109.00 | saldo_stone 0.97 | saldo_recargapay 8.69 | fechado_em 2026-07-17 00:42:33

### Mercado Pago aprovado (22 transações, R$225,19)
Maioria Pix pequenos. Um pagamento com cartão de crédito (visa) de R$99,14 às 21:00:10.

**Nota do agente**: a saída de R$100,00 (recarga, `conta_origem=mercadopago`, "venda não
registrada na hora") não corresponde a nenhuma transação individual de R$102,50 nem R$100,00 na
lista de pagamentos aprovados do Mercado Pago para esse dia.

---

## 17-07-26 (quinta)

### Saídas
| valor | categoria_id | conta_origem | operador | descrição | created_at (UTC) |
|---|---|---|---|---|---|
| 109.00 | transferencia_entre_contas | caixa_economica | Edvam | "Transferência: Caixa Econômica → RecargaPay" | 2026-07-17 13:06:11 |
| 6.50 | material_de_expediente | null | Zu | 01 lampada para aquecer papel | 2026-07-17 16:18:33 |
| 45.00 | socios | null | Zu | coca - reserva | 2026-07-17 21:22:39 |
| 57.60 | recarga_cel | recargapay | Edvam | (sem descrição) | 2026-07-17 21:58:16 |
| 4.65 | diversas | stone | Edvam | taxa cartões | 2026-07-17 22:33:16 |
| 2.56 | diversas | mercadopago | Edvam | taxa Pix | 2026-07-17 22:33:49 |
| 350.00 | folha_de_pagamento | null | Edvam | "Baixa de conta a pagar: Gabi - Colaboradora" | 2026-07-17 22:55:14 |
| 18.00 | transferencia_entre_contas | mercadopago | Edvam | "Transferência: Mercado Pago → Dinheiro (Gabi) — Gabi trocou R$18 em dinheiro físico por Pix pessoal com o Admin (lançamento retroativo, 17/07/2026)" | 2026-07-18 18:11:21 (lançado no dia seguinte) |
| 42.50 | recarga_vem | recargapay | Zu | "Repasse (recriado pelo PM...)" | 2026-07-18 18:40:35 (lançado no dia seguinte) |

### Transferências
| conta_origem | conta_destino | valor | operador | saida_id | created_at |
|---|---|---|---|---|---|
| caixa_economica | recargapay | 109.00 | Edvam | e6c480c1... | 2026-07-17 13:06:11 |
| mercadopago | dinheiro_gabi | 18.00 | Edvam | 26e70de2... | 2026-07-18 18:11:21 |

### Pedidos por forma de pagamento
| forma_pagamento | status | qtd | soma |
|---|---|---|---|
| Cartão | entregue | 5 | 97.70 |
| Dinheiro | entregue | 39 | 193.75 |
| Pix | entregue | 43 | 273.35 |
| Pix | cancelado | 3 | 19.20 |
| Pix RecargaPay | entregue | 2 | 37.50 |
| null | cancelado | 3 | 6.70 |

### Fechamento
**Gabi**: saldo_anterior 23.35 | entradas 112.70 | saídas 0.00 | resultado 112.70 | acumulado 136.05 | dinheiro 103.00 | moedas 33.60 | físico 136.60 | divergência 0.55 | fechado_em 2026-07-17 20:37:23

**Zu**: saldo_anterior 34.80 | entradas 99.05 | saídas 51.50 | resultado 47.55 | acumulado 82.35 | dinheiro 37.00 | moedas 46.60 | físico 83.60 | divergência 1.25 | fechado_em 2026-07-17 21:34:41

**Sistema**: sem dado (fechamento geral de 17/07 nunca foi gravado).

### Mercado Pago aprovado (31 transações, R$435,75)
Maioria Pix pequenos e médios (R$1,20 a R$157,00), a maioria com referência de pedido/venda.

---

## 18-07-26 (hoje, sexta)

Sem dado em nenhuma tabela interna (nenhuma saída/transferência/pedido/fechamento com `data_dia`
ou `created_at` de hoje, além dos lançamentos retroativos já listados nos dias correspondentes).
Mercado Pago aprovado: 1 transação, R$2,00 (`account_money`).

---

## Totais brutos do período

- **Mercado Pago aprovado, soma de todos os dias**: 212 transações, R$7.737,46
- Por dia: 09/07 R$295,36 (34) · 10/07 R$5.291,56 (41) · 11/07 sem dado · 12/07 R$42,00 (3) ·
  13/07 R$205,60 (31) · 14/07 R$152,20 (16) · 15/07 R$1.087,80 (33) · 16/07 R$225,19 (22) ·
  17/07 R$435,75 (31) · 18/07 R$2,00 (1, dia em andamento)
- Pagamentos não aprovados no período (fora dos totais acima): 23 cancelados/expirados + 4
  rejeitados por risco alto (R$900,00 cada, todos em 10/07 entre 21:18 e 21:25 local)

Nenhuma linha foi omitida, classificada ou explicada pelo agente — interpretação fica com quem lê.
