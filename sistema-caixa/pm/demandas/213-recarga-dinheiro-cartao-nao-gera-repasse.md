# 213 — Recarga paga em Dinheiro ou Cartão nunca gera saída de repasse

Status: concluída
Criada em: 2026-07-18
Aprovada em: 2026-07-18
Concluída em: 2026-07-18
Chat executor: 03 - APP JS GRAFICA

## Contexto
Achado grande do Edvam (2026-07-18), corrigindo o entendimento da demanda 188 desde a origem: o
conceito de "repasse desta venda" não existe de verdade. Recarga VEM/celular só tem 3 caminhos
reais:
1. **Pix direto no RecargaPay**: o valor pago já cobre a recarga inteira e deixa a comissão
   sentada na própria conta (demanda 199/211, já correto).
2. **Dinheiro**: o valor fica na caixinha do atendimento, segue o fluxo normal de venda (gaveta
   → depósito do dia seguinte na Caixa Econômica). A recarga em si é feita com o saldo que já
   existe no RecargaPay (repasses anteriores do Admin + comissão acumulada) ou, se faltar, o
   Admin manda de MP/Caixa — **sem ligação nenhuma com esta venda específica**.
3. **Cartão (Stone)**: mesma lógica do Dinheiro.

`gerarSaidaAutomaticaNaVenda` (`lib/supabase-admin.ts`) cria uma saída automática pra QUALQUER
venda de VEM (menos Pix RecargaPay, já excluído na 211), descontando da gaveta física de quem
vendeu — isso nunca deveria ter existido pros casos 2 e 3. O PM confirmou com dado real: 9 saídas
fictícias desde 09/07, R$175,00 no total, já apagadas manualmente — explicam quase toda a
divergência de vários fechamentos (14/07 Gabi: 94% explicado; 17/07 Zu: 97% explicado).

## Objetivo
`gerarSaidaAutomaticaNaVenda` nunca mais gera saída pra recarga VEM/celular paga em Dinheiro ou
Cartão — a venda inteira vira receita normal, sem desconto nenhum. Reabastecer o RecargaPay
continua sendo ação manual e periódica (Transferência entre Contas, demanda 201), sem ligação
com nenhuma venda.

## Escopo
- Incluído: em `gerarSaidaAutomaticaNaVenda` (`lib/supabase-admin.ts`), a lógica de repasse por
  categoria de recarga (`CATEGORIA_SAIDA_POR_CATEGORIA_PRODUTO_RECARGA`) deixa de disparar pra
  QUALQUER forma de pagamento — não é mais "todas menos Pix RecargaPay" (211), é "nenhuma
  dispara pra recarga VEM/celular, independente da forma". Documentar a decisão clara: o
  mecanismo de repasse-por-venda inteiro fica sem uso pra recarga daqui pra frente.
- Confirmar que isso não quebra nenhum outro produto que porventura reaproveite a mesma função
  fora do contexto de recarga (ramo genérico de `preco_custo`, mencionado no código como "nenhum
  produto real passa por este ramo hoje") — não mexer nesse ramo, só no de recarga.
- Explicitamente fora de escopo: qualquer mudança na "Transferência entre Contas" (201) — já é o
  mecanismo certo pra reabastecer o RecargaPay, só não estava sendo usado como a única fonte.

## Critérios de aceite
- [x] Recarga VEM/celular paga em Dinheiro não gera saída nenhuma
- [x] Recarga VEM/celular paga em Cartão não gera saída nenhuma
- [x] Pix RecargaPay continua sem gerar saída (comportamento da 211 intacto)
- [x] Testado com pedido sintético de cada forma de pagamento
- [x] Confirmado que nenhum outro fluxo depende do repasse automático de recarga pra funcionar

## Riscos e cuidados
Não remover o mecanismo de repasse em si (pode ser reaproveitado se algum dia fizer sentido pra
outro tipo de produto) — só parar de disparar pra recarga. Não mexer na 201.

## Referências
Demanda 188 (mecanismo original, entendimento corrigido). Demanda 199/211 (Pix RecargaPay, já
correto). Demanda 201 (Transferência entre Contas, mecanismo certo de reabastecimento). Achado
real: 9 saídas fictícias, R$175,00, corrigidas manualmente pelo PM em 2026-07-18 (13/07, 14/07,
15/07, 17/07 — fechamentos de Gabi e Zu já corrigidos; fechamentos "Sistema" desses mesmos dias
ainda não recalculados, pendência registrada em `pm/demandas/STATUS.md`).

## Relato de execução
Implementado em `gerarSaidaAutomaticaNaVenda` (`lib/supabase-admin.ts`): a checagem por
categoria de recarga passou a ser incondicional — `if (CATEGORIAS_RECARGA.includes(produto.categoria))
return { criada: false, motivo: 'recarga_sem_repasse_automatico' }`, logo depois de buscar o
produto e ANTES de qualquer lógica de `gera_saida_automatica`/matemática de repasse. Vale pra
VEM e celular igual (`CATEGORIAS_RECARGA`, constante já existente em `lib/supabase-admin.ts`,
reaproveitada de `idsProdutosRecarga`), independente da forma de pagamento — não é mais "todas
menos Pix RecargaPay" (211), é "nenhuma recarga, ponto".

**Limpeza de código morto** (a checagem antiga ficou 100% inalcançável pra recarga): removido o
branch antigo de matemática de repasse por categoria (`CATEGORIA_SAIDA_POR_CATEGORIA_PRODUTO_RECARGA`,
taxa fixa da 052/079) e o guard específico de celular (`CATEGORIA_PRODUTO_REPASSE_MANUAL`, 128) —
os dois foram substituídos pela checagem única acima, que já cobre as duas categorias de uma vez
(celular já estava bloqueado antes; agora VEM também está, pelo mesmo motivo estrutural, não só
por comissão variável). O ramo genérico (`preco_custo` × quantidade, produtos não-recarga) ficou
100% intacto — só removi o `if/else` que virou sempre-else, a lógica interna não mudou uma
vírgula. Removida também a importação não usada de `TAXA_RECARGA_VEM` (só era usada no branch
removido).

**Achado durante a checagem "nenhum outro fluxo depende do repasse automático de recarga"**
(pedido explícito do critério de aceite): `lib/diagnostico.ts` (Camada B, demanda 150) tinha 2
sinais que assumiam TODA venda de VEM devia ter repasse automático vinculado:
`recarga_vem_sem_repasse` (pedido de VEM entregue sem `saida_vinculada_id` → alerta "atenção") e
`saida_repasse_vem_sem_pedido` (saída "Repasse Recarga VEM" sem pedido vinculado → alerta
"atenção"). Com a 213 no ar, TODA venda de VEM em Dinheiro/Cartão passaria a nascer sem vínculo
de propósito — esses 2 sinais disparariam falso positivo em praticamente toda venda de VEM dali
pra frente, poluindo o diagnóstico diário. **Removidos os dois** (não fazia sentido adaptá-los —
o conceito que eles verificavam deixou de existir). Celular manteve seus sinais intactos (128,
fora do escopo desta correção). Busquei também por qualquer UI/componente que dependesse de
`saida_vinculada_id`/os tipos de sinal removidos — nenhum encontrado, a mudança é segura.

Teste com pedido sintético (recarga VEM, `prod-083`), avançado pra "entregue" via
`PATCH /api/pedidos` real:
- `forma_pagamento: 'Dinheiro'` → nenhuma saída gerada, `saida_vinculada_id` permanece `null`.
- `forma_pagamento: 'Cartão'` → idem, nenhuma saída.
- `forma_pagamento: 'Pix RecargaPay'` → idem (comportamento da 211 continua intacto, agora
  redundante com a checagem nova pra recarga especificamente, mas continua valendo como
  segunda trava pra qualquer produto futuro pago com essa forma).
- Ramo genérico (produto sintético fora de recarga, `gera_saida_automatica: true`,
  `preco_custo: 5,00`, categoria "Serviço terceirizado", quantidade 2) → saída gerada
  corretamente: R$10,00 (5,00 × 2), categoria "Fornecedores", vínculo salvo no pedido — confirma
  que a refatoração não quebrou o único ramo que sobrou. Todos os pedidos, a saída e o produto
  sintéticos foram apagados do banco ao final.

`npx tsc --noEmit` limpo. `npm run build` limpo. Deploy em produção:
`dpl_2wWg9AQFdP5wxsQTTsF2AQKnzG7Q`, aliases confirmados via `vercel inspect` em
`pdv.jsgrafica.site` e `admin.jsgrafica.site`.
