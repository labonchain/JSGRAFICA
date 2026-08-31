# 219 — Botão "Pix" genérico disponível em carrinho 100% recarga

Status: concluída
Criada em: 2026-07-21
Aprovada em: 2026-07-21
Concluída em: 2026-07-21
Chat executor: 03 - APP JS GRAFICA

## Contexto
Investigação do 05-FINANCEIRO (auditoria de pedidos Pix sem `mp_order_id`, últimos 7 dias)
separou 12 casos em 2 grupos por causa raiz, confirmando que são problemas diferentes:

1. **Pedidos não-recarga** (candidatos reais ao timeout de `criarCobrancaPix`, mesmo bug da
   demanda 198) — zero caso novo não-cancelado desde o deploy da 198 (16/07). Esse problema
   parece resolvido, fora do escopo desta demanda.
2. **Pedidos de recarga (VEM/celular) confirmados com `forma_pagamento='Pix'` genérico em vez de
   `'Pix RecargaPay'`** — 4 casos só no dia 20/07/26 (ped-1187, ped-1231, ped-1251, ped-1284),
   4 dias depois do deploy das demandas 199/211 que deveriam ter garantido esse rótulo certo.

Pra recarga, `mp_order_id` nulo é esperado por design (o carrinho 100% recarga nunca chama
`criarCobrancaPix`, usa a chave estática do RecargaPay) — o problema real não é falta de QR, é o
**rótulo errado** (`Pix` em vez de `Pix RecargaPay`), que faz esses pedidos parecerem falha de
cobrança do Mercado Pago quando na verdade são recarga paga por fora, só mal identificada.

O 05-FINANCEIRO já conferiu que o código que deveria mandar o rótulo certo está correto
(`confirmarPagamentoRecarga`/`confirmarRecargaMista` em `app/page.tsx` e `app/pdv/page.tsx`
mandam `formaPagamento: "Pix RecargaPay"` hardcoded, sem regressão) — e fez conciliação de 3
pontas confirmando que o dinheiro dos 4 casos de 20/07 não aparece no extrato real do Mercado
Pago daquele dia (descarta ter sido Pix normal mal vinculado). **Hipótese ainda não confirmada**
(precisa ser confirmada como parte desta demanda, não presumida): existe outro caminho de
confirmação de pagamento — provavelmente `ModalConfirmarPagamento` — com um botão "Pix" genérico
ao lado do "Pix RecargaPay", e o atendente está clicando no errado quando o carrinho é 100%
recarga.

## Objetivo
Um carrinho 100% recarga nunca deve poder ser confirmado com `forma_pagamento='Pix'` genérico —
só `'Pix RecargaPay'` (ou Dinheiro/Cartão, que já funcionam certo pela 213).

## ⚠️ Checkpoint obrigatório antes de mexer em código
Execute só a parte de investigação primeiro (achar e confirmar a causa raiz real). **Pare aí e
relate ao PM o que encontrou e como pretende corrigir, antes de escrever ou aplicar qualquer
mudança de código.** Só depois de confirmação explícita (PM ou Edvam) siga pra implementação,
teste e deploy. Não aplique a correção "de uma vez" mesmo que a causa pareça óbvia.

## Escopo
- Incluído: confirmar a hipótese do 05-FINANCEIRO — investigar `ModalConfirmarPagamento` (ou
  qualquer outro componente/caminho que tenha gerado os 4 casos de 20/07) e achar exatamente
  onde/como um pedido de recarga pode ser confirmado com `forma_pagamento='Pix'` genérico.
  Reportar a causa real encontrada, mesmo que não seja a hipótese do botão.
- Incluído: corrigir a UI/lógica pra que, quando o carrinho for 100% recarga (VEM ou celular),
  a opção "Pix" genérico não apareça ou não seja selecionável — só "Pix RecargaPay",
  "Dinheiro" e "Cartão".
- Incluído: verificar se carrinho MISTO (recarga + outro produto) tem o mesmo problema — nesse
  caso a lógica pode ser mais sutil (não é "sempre bloquear Pix genérico", é "recarga dentro do
  carrinho misto precisa do tratamento certo mesmo com Pix genérico no resto"). Reportar como
  achado se for o caso, sem resolver escopo maior do que o pedido aqui sem alinhar antes.
- Explicitamente fora de escopo: o timeout de `criarCobrancaPix` (198, já resolvido, não
  reabrir sem caso novo real). Resolução manual do `ped-1251` (tratada fora desta demanda,
  ação direta do Edvam com a Gabi).

## Critérios de aceite
- [x] Causa raiz confirmada com evidência (não só a hipótese do 05-FINANCEIRO repetida)
- [x] Carrinho 100% recarga não consegue mais ser confirmado com `Pix` genérico
- [x] Testado com pedido sintético (recarga sozinha, e recarga misturada com outro produto se
      aplicável)
- [x] Nenhuma regressão nos fluxos que já funcionam (Dinheiro, Cartão, Pix RecargaPay puro,
      Pix normal em produto não-recarga)

## Riscos e cuidados
Não mexer em `criarCobrancaPix`/timeout (198) nem em `gerarSaidaAutomaticaNaVenda` (213) — são
mecanismos diferentes, já corretos. O ajuste é só na camada de confirmação de pagamento/UI.

## Referências
Investigação do 05-FINANCEIRO (2026-07-21, relatada diretamente ao PM, ver
`pm/equipe/05-financeiro.md` pro papel dele). Demandas 198 (timeout QR), 199/211 (Pix
RecargaPay não gera repasse), 213 (recarga nunca gera saída automática). Casos reais: ped-1187,
ped-1231, ped-1251, ped-1284 (todos 20-07-26).

## Relato de execução
(preenchido pelo chat executor ao concluir)

- O que foi feito:
  - **Causa raiz confirmada com evidência real** (não só a hipótese repetida): consulta direta
    aos 4 casos (`ped-1187`, `ped-1231`, `ped-1251`, `ped-1284`) mostrou os 4 com
    `pagamento_confirmado_origem='manual'` e `pagamento_confirmacoes_historico` vazio (nunca
    passaram pela ferramenta de correção da 180), e os timestamps de transição de status
    (`data_producao_at` → `data_pronto_at` → `data_entregue_at`) só 2 a 9 segundos entre si —
    clique rápido pela esteira sem produção real acontecendo no meio. `ModalConfirmarPagamento`
    (`components/TelaPedidos.tsx`) mostra os 4 botões (Dinheiro/Cartão/Pix/Pix RecargaPay) lado a
    lado sem saber que o pedido é recarga — o atendente clicou no "Pix" errado nessa correria.
    Nenhum dos 4 casos reais é venda mista (cada um é `venda_id` de item único).
  - Adicionado `eh_recarga: boolean` na resposta de `GET /api/pedidos` (`app/api/pedidos/route.ts`)
    — reaproveita `idsProdutosRecarga` (já existente, usada pelos pontos de cobrança 147/213, não
    alterada) pra marcar cada pedido sem duplicar a checagem de categoria.
  - `ModalConfirmarPagamento` (`components/TelaPedidos.tsx`) ganhou a prop `apenasRecarga?: boolean`
    — quando `true`, a opção "Pix" genérica some da lista (só Dinheiro/Cartão/Pix RecargaPay).
    Atualizados os 4 pontos de chamada do modal em `TelaPedidos.tsx` (detalhe de pedido único,
    detalhe de venda agrupada — avanço por item e avanço em lote —, e o card da fila) e os 2 em
    `TelaInbox.tsx` (avanço de pedido único e de venda inteira do cartão do Inbox), cada um
    calculando `apenasRecarga` a partir do(s) `eh_recarga` do(s) item(ns) envolvido(s): item único
    → o próprio `eh_recarga`; lote/venda → `true` só se **todos** os itens forem recarga
    (`.every()`) — carrinho misto continua com as 4 opções, como o escopo pediu (investigar mas
    não resolver escopo maior sem alinhar).
  - Ferramenta "🔧 Corrigir forma de pagamento" (demanda 180, `TelaPedidos.tsx`) tinha as opções
    hardcoded como `["Dinheiro", "Cartão", "Pix"]` — nunca ganhou "Pix RecargaPay" depois que a
    199 introduziu essa forma. Adicionada a 4ª opção; grid mudou de `grid-cols-4` pra `grid-cols-2`
    (rótulo mais longo, 5 botões no total agora com o "Voltar").
- Testes realizados e resultado:
  - `npx tsc --noEmit` e `npm run build` passaram limpos.
  - Teste isolado com dado sintético real na tabela (`scripts/spike-219-teste-eh-recarga.ts`,
    mantido no repo): 1 pedido 100% recarga sozinho (`eh_recarga=true`, esperado), 1 pedido
    não-recarga sozinho (`eh_recarga=false`, confirma zero regressão), 1 venda mista recarga +
    não-recarga (`apenasRecarga` calculado via `.every()` = `false`, confirma que venda mista
    continua com as 4 opções). Os 3 casos bateram o esperado. Pedidos de teste apagados ao final
    (confirmado via SQL, 0 linhas residuais).
- Achados fora do escopo:
  - Nenhum novo além do já registrado na investigação original (opções desatualizadas da 180,
    corrigido acima por decisão explícita do PM ao aprovar esta demanda).
- Status final: concluída, testada e em produção — deploy `dpl_DnHcd8Cf8eA3MKt92qy2e26jvWEy`,
  alias confirmado em `pdv.jsgrafica.site` e `admin.jsgrafica.site`.
