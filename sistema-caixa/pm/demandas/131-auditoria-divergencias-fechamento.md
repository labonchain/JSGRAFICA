# 131 — Auditoria: achar a origem das divergências de fechamento (não só ajustar o número)

Status: aprovada — liberada
Criada em: 2026-07-09
Aprovada em: 2026-07-09
Concluída em: —
Chat executor: 02 - DADOS

## Contexto
O histórico de `jsgrafica_fechamento` (fechamento geral) tem divergências grandes e sem
explicação: **03/07 → R$1.007,90** (linha sem `fechado_em`, nunca foi fechada de verdade por
ninguém — pode ser artefato de importação) e **08/07 → R$474,02** (fechamento real, feito pelo
Admin; confirmamos que o valor físico informado estava certo — R$1.712,50 batendo exatamente com
a soma de 4 contas reais que ele checou depois). A demanda 127 conserta o LAYOUT pra isso não
voltar a acontecer por confusão de "onde lançar o quê" — mas não explica **de onde veio o dinheiro
que já existe e o sistema não sabia que existia**. O Edvam pediu explicitamente (2026-07-09): não
quer só "ajustar o saldo pra bater" — quer conferir se os valores de entradas/saídas batem com
vendas e pagamentos reais antes de corrigir qualquer coisa.

## Objetivo
Um relatório (não uma correção automática) mostrando, dia a dia desde 06/07 (ou mais pra trás se
fizer sentido), se o que o sistema calculou como entrada bate com o que realmente foi vendido/
recebido — usando fontes **independentes** de verificação sempre que possível, não só o que o
próprio sistema já registrou (senão vira consistência-com-o-próprio-erro, não auditoria de
verdade).

## Escopo
- Incluído:
  1. Pra cada dia desde 06/07/2026: recalcular `totalEntradas` (vendas + pedidos entregues) e
     `totalSaidas` a partir das tabelas fonte (`jsgrafica_vendas`, `jsgrafica_pedidos`,
     `jsgrafica_saidas`) e comparar com o que está gravado em `jsgrafica_fechamento` pra aquele
     dia — confirmar que o cálculo batia (ou achar se algum dia ficou base errada).
  2. **Cruzar o valor de Pix registrado contra o extrato real do Mercado Pago** (via
     `buscarPagamentos()`/`payments/search`, já construído na 084) — essa é a única fonte
     verdadeiramente independente que temos hoje (não foi o próprio sistema que "inventou" esse
     número, é o que o Mercado Pago diz que recebeu de verdade). Se o valor de Pix que o sistema
     soma bater com o que a Mercado Pago mostra, elimina Pix como causa da divergência; se não
     bater, é uma pista forte de onde procurar.
  3. Verificar se existe venda/pedido/saída **fora do sistema** que devia ter sido lançada e não
     foi — não tem como confirmar isso sozinho (é pergunta pro Edvam), mas o relatório deve
     apontar claramente os dias/valores que não fecham, pra ele confirmar se lembra de algo que
     ficou de fora (ex.: venda que passou por fora do PDV, saída que só ele sabe).
  4. Produzir um relatório final (arquivo em `pm/conhecimento/` ou anexado nesta demanda) com:
     dia a dia, o que bate, o que não bate, e uma hipótese honesta de onde cada divergência grande
     pode ter vindo — **sem corrigir nada no banco sozinho**. Correção final é decisão do PM/Edvam
     depois de ver o relatório.
- Fora de escopo: corrigir os valores automaticamente. Investigar dias antes de 06/07 (a não ser
  que o relatório aponte necessidade clara de ir mais pra trás — aí reportar ao PM antes de ir).

## Critérios de aceite
- [ ] Relatório dia a dia (06/07 até hoje) comparando calculado vs. gravado
- [ ] Pix cruzado contra extrato real do Mercado Pago, com resultado explícito (bateu/não bateu)
- [ ] Hipóteses concretas (não vagas) pra cada divergência grande encontrada
- [ ] Nenhuma correção aplicada no banco sem aprovação explícita do PM

## Referências
Esta conversa (2026-07-08/09). Demanda 084 (fonte do extrato real do Mercado Pago). Demanda 127
(conserta o layout pra frente, esta demanda investiga o que já aconteceu). `jsgrafica_fechamento`,
`jsgrafica_vendas`, `jsgrafica_pedidos`, `jsgrafica_saidas`.

## Relato de execução

Relatório completo em
`pm/conhecimento/auditoria-divergencias-fechamento-06-a-09-07.md`. Resumo:

### 1. Recálculo independente — os 3 fechamentos gerais completos batem 100%

06-07, 07-07 e 08-07 (fechamento geral, `fechado_por: Sistema`): recalculei `total_entradas`
(vendas + pedidos entregues, mesma fronteira UTC do app) e `total_saidas` direto das tabelas
fonte — **bateu exato com o que está gravado nos 3 dias, sem diferença de um centavo**.
Não há bug de cálculo.

### 2. As divergências conhecidas não são "dinheiro sumido" — são de outra natureza

- **06-07 (-R$373,74)**: é do fechamento **por operador** da Gabi, não do geral (que está
  reconciliado, `divergencia: 0`). Mesma causa já confirmada na demanda 080 — compara físico
  contra o total de vendas (todas as formas de pagamento), não só dinheiro.
- **07-07 (+R$22,97)**: **esse é real** — cálculo bate perfeitamente, mas o físico contado
  ficou R$22,97 a mais do que o esperado. Não achei explicação nas tabelas — fica pergunta pro
  Edvam (só ponto sem solução desta auditoria).
- **08-07 (Gabi +100,90 / Zu +28,05)**: mesma causa do 06-07 (fechamento por operador). O
  fechamento geral já está reconciliado (`divergencia: 0`), confirma o que o contexto já
  registrava (bateu com 4 contas reais).
- **09-07**: dia em andamento, só parciais por operador ainda (mesma causa), sem fechamento
  geral pra avaliar.

### 3. Cruzamento com Mercado Pago — inconclusivo, achado importante sobre o motivo

96 dos 96 pedidos "Pix" de 06 a 08/07 **nunca passaram pelo Mercado Pago** — foram confirmados
manualmente (chave estática, demanda 062), sem `mp_order_id`. Só 3 pedidos de hoje (09/07,
R$0,45 cada, claramente teste) têm cobrança real via Mercado Pago — consultei a API de verdade:
os 3 mostram `status: action_required` (pagamento nunca concluído), apesar de já estarem
`entregue`/Pix no sistema.

🔴 Achado adicional: a conta do Mercado Pago está em **modo Teste (sandbox)** — os pagamentos
que aparecem lá são resíduos de desenvolvimento das demandas 084/124 (conferi, zero
correspondência com pedidos reais de hoje). Cruzar Pix contra o Mercado Pago **não serve como
verificação de dinheiro real** enquanto a conta estiver em sandbox e o Pix manual continuar
sendo maioria.

### 4. Vendas fora do sistema
Não tenho como confirmar sozinho, como a demanda já reconhecia. Único candidato concreto: o
R$22,97 do dia 07/07.

### Achados fora do escopo
- 3 pedidos de teste de hoje ficaram marcados `entregue`/Pix pago mas o Mercado Pago mostra
  pagamento nunca concluído — não corrigi (fora do escopo desta demanda, só auditoria).

### Status final
**Concluída.** Relatório dia a dia entregue, Pix cruzado com resultado explícito (inconclusivo,
com o motivo claramente identificado), hipóteses concretas pra cada divergência, nenhuma
correção aplicada no banco.
