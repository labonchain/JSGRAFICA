# Referência: como sistemas financeiros e PDV "de verdade" se organizam vs. o que temos hoje

Pesquisado pelo PM em 2026-07-07, a pedido do Edvam ("a parte financeira tá capenga e parecendo
um caos, precisamos de referência de como é um sistema financeiro de verdade"). **Isso não é
plano de refatoração** — é só o mapa comparativo pra decidir com calma o que vale mudar depois.

---

## 1. Módulo financeiro — como o mercado organiza

Estrutura padrão de ERP/financeiro (TOTVS, Oracle, Kamino etc.), resumida:

| Módulo | O que faz |
|---|---|
| **Contas a Pagar** | Compromissos futuros/agendados (o que ainda vai sair) |
| **Contas a Receber** | Valores a receber agendados/previstos (o que ainda vai entrar) |
| **Fluxo de Caixa** | Saldo previsto dia a dia, juntando o que já aconteceu + contas a pagar/receber futuras |
| **Conciliação Bancária** | Cruza o que o sistema acha que devia ter com o extrato real do banco |
| **DRE (Demonstrativo de Resultado)** | Receita − custo − despesa, organizado por período, pra decisão e pro contador |

Ponto chave: esses módulos **são separados mas conversam entre si** — uma venda no PDV já
alimenta o Contas a Receber e o Fluxo de Caixa sozinha, sem digitar de novo.

### Como isso compara com o que a JS Gráfica tem hoje
- **Contas a Pagar**: não existe como conceito — "Lançar Saídas" é sempre uma saída que **já
  aconteceu**, não uma conta agendada pra pagar depois. Não há "vou pagar isso dia 15", só "paguei
  isso agora".
- **Contas a Receber**: parecido — pedido no Inbox tem uma noção de "aguardando pagamento", mas
  não é tratado como um módulo de recebíveis (com previsão, vencimento, cobrança).
- **Fluxo de Caixa**: existe de forma fragmentada — "Movimento" (dia) + "Dashboard" (período) +
  "Fechar Caixa" (fechamento físico), três telas separadas que não se conversam num só lugar.
- **Conciliação Bancária**: não existe ainda — é exatamente o que a demanda 084 (Mercado Pago)
  começa a resolver, ainda de forma bem inicial (1 conta, sem comparar com o físico).
- **DRE**: não existe formalmente — o mais próximo é o Dashboard somando entradas/saídas por
  período, sem separar por categoria de custo/receita como um DRE de verdade faria.

**Leitura honesta**: o "caos" que você sente provavelmente vem de ter pedaços de Fluxo de Caixa,
Contas a Receber e Conciliação **meio misturados** em 3-4 telas (Movimento, Dashboard, Fechar
Caixa, Pedidos) em vez de cada conceito ter seu lugar claro. Não é que o cálculo esteja errado
(a maioria das demandas recentes, 067/074/077, corrigiram exatamente contas que já estavam
certas em essência) — é que a **organização visual não segue a divisão que um sistema financeiro
de verdade usaria.**

Fontes: [TOTVS — módulos de ERP](https://www.totvs.com/blog/erp/modulos-do-erp/), [Kamino — módulo financeiro](https://kamino.com.br/blog/modulo-financeiro-erp/), [Interativo Sistemas — contas a pagar/receber/fluxo de caixa](https://www.interativosistemas.com.br/articles/modulo-financeiro-erp.html)

---

## 2. PDV/Frente de caixa — como o mercado organiza

Fluxo padrão (Conta Azul, Bling, VendaSimples etc.):
1. Identificar produto (código de barras ou busca) → preço/descrição vêm do cadastro
2. Montar a venda (soma itens, desconto, total)
3. Receber pagamento (dinheiro/cartão/Pix, inclusive dividido entre formas)
4. Emitir nota fiscal (NFC-e)
5. Baixa automática no estoque
6. Controle de turno: abertura, sangria (retirada de dinheiro no meio do turno), suprimento
   (reforço de troco), fechamento
7. Relatórios: vendas, produtos mais vendidos, formas de pagamento

**Boas práticas citadas como essenciais**: funcionar **offline** (a internet cai e o caixa não
pode parar), e ter **integração automática com financeiro/estoque** (a venda já entra sozinha,
sem lançar de novo em outro lugar).

### Como isso compara com o que a JS Gráfica tem hoje
- **Identificar produto → montar venda → pagamento**: já funciona bem (demandas 066/077 já
  adicionaram forma de pagamento e cálculo de taxa) — essa parte está alinhada com o padrão.
- **Nota fiscal (NFC-e)**: não existe — a JS Gráfica presta serviço (impressão, consultas), não é
  claro se emissão de nota fiscal por venda se aplica da mesma forma que um varejo tradicional;
  isso é uma pergunta de negócio/contábil pro Edvam, não uma lacuna técnica óbvia.
- **Baixa de estoque**: não se aplica do mesmo jeito — a gráfica vende serviço (impressão,
  consulta), não itens de estoque físico contável um a um (a exceção seria papel/insumo, que hoje
  não é rastreado como estoque).
- **Sangria/suprimento durante o turno**: não existe — hoje só existe abertura (em construção,
  demanda 074) e fechamento no fim do dia; não há registro de retirada/reforço no meio do turno.
- **Offline**: o sistema depende 100% de internet (Vercel + Supabase) — não funciona sem conexão.
  Isso é um risco real citado como prática essencial no mercado, mas pode ser aceitável pro porte
  da gráfica (decisão de custo/benefício, não corrigir sem avaliar o impacto real de quedas de
  internet no dia a dia).
- **Integração automática com financeiro**: aqui a JS Gráfica já está **bem posicionada** — desde
  a demanda 054 (unificação venda→pedido), toda venda de balcão ou Inbox já cai direto em
  `jsgrafica_pedidos`, que alimenta Dashboard/Movimento/Fechamento sem lançamento duplicado. Isso
  é exatamente o padrão recomendado, já implementado.

Fontes: [Conta Azul — frente de caixa](https://contaazul.com/blog/o-que-e-frente-de-caixa/), [VendaSimples — PDV](https://vendasimples.com.br/blog/o-que-e-pdv-frente-de-caixa/), [Bling — frente de caixa](https://www.bling.com.br/funcionalidades/frente-de-caixa)

---

## Resumo — onde investir se/quando quiser mexer nisso (não agora)
1. **Maior ganho, menor esforço**: juntar Movimento + Dashboard + Fechamento numa navegação que
   deixe claro "isso é o Fluxo de Caixa" — hoje são 3 abas que fazem parte do mesmo conceito sem
   dizer isso.
2. **Sangria/suprimento durante o turno**: se acontecer na prática (alguém tira dinheiro do caixa
   no meio do dia pra algo), vale ter isso registrado — hoje só existe abertura/fechamento.
3. **Contas a Pagar de verdade**: se a gráfica tem compromissos com data futura (aluguel,
   fornecedor a prazo), um conceito de "vou pagar isso dia X" ajudaria — hoje tudo é lançado como
   já pago.
4. **NFC-e**: pergunta de negócio primeiro (obrigatório pro tipo de serviço da gráfica?), não
   assumir que falta.
5. **Offline**: avaliar se quedas de internet já causaram problema real antes de investir nisso.
