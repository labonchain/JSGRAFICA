# 112 — Cancelar pedido/venda (Inbox, Fila de impressão, Pedidos, Financeiro)

Status: concluída
Criada em: 2026-07-08
Aprovada em: 2026-07-08
Concluída em: 2026-07-08
Chat executor: 03 - APP JS GRAFICA

## Contexto
Itens 6-7 do backlog. Não existe cancelamento de pedido/venda em **nenhum lugar do sistema**
hoje — nem pro Admin. Confirmado ao vivo quando o Edvam tentou apagar um pedido de teste
("entregue") e não conseguiu (resolvido manualmente pelo PM via SQL, ver correção registrada em
`STATUS.md` 2026-07-07). Decisão de produto já tomada na mesma conversa: **cancelamento tira o
valor da soma total do dia.**

## Objetivo
Admin (e quem mais fizer sentido) consegue cancelar um pedido/venda a partir de qualquer uma das
4 telas onde ele aparece, e o valor cancelado some do total do dia automaticamente.

## Escopo
- Incluído:
  1. **Mecanismo central**: um novo status `cancelado` em `jsgrafica_pedidos` (ampliar a
     constraint, mesmo padrão da demanda 065 que ampliou pra "aguardando_retirada"). Todo cálculo
     que soma `status: 'entregue'` (Dashboard, Fechamento, Entradas) precisa **não somar**
     `cancelado` — conferir todos os pontos que já filtram por `entregue` hoje.
  2. **Se o pedido já tinha gerado saída automática** (demanda 104, `saida_vinculada_id`
     preenchido), cancelar o pedido também precisa reverter/apagar essa saída — senão fica saída
     de repasse "fantasma" sem a venda que a originou.
  3. Botão "Cancelar" em 4 lugares, reaproveitando o mesmo mecanismo central (não duplicar
     lógica):
     - Card de pedido no Inbox (`TelaInbox.tsx`)
     - Fila de impressão (dentro de `TelaPedidos.tsx`)
     - Aba "Todos os pedidos" (`TelaPedidos.tsx`)
     - Card individual dentro de Financeiro/Contas a Pagar-Receber, se fizer sentido lá (avaliar
       ao implementar — pode ser que só as 3 primeiras já cubram o caso real)
  4. Confirmação antes de cancelar (modal simples, "tem certeza?"), sem motivo obrigatório.
- Fora de escopo: reembolso automático de dinheiro pro cliente (isso é a demanda futura de
  "Contas a Pagar/Receber" pro lado de reembolso, se vier a ser necessário — aqui é só marcar
  como cancelado e tirar da soma).

## Critérios de aceite
- [x] Existe botão de cancelar nas 3-4 telas listadas
- [x] Pedido cancelado não conta mais em nenhum total (Dashboard/Financeiro/Fechamento/Entradas)
- [x] Se tinha saída automática vinculada (104), ela é revertida/apagada junto
- [x] Testado com pedido sintético em cada uma das telas

## Riscos e cuidados
Mexe em cálculo financeiro real — testar exaustivamente com dado sintético, conferir que os
totais batem certo antes e depois de cancelar. Aguardar o 03-APP terminar a demanda 105 antes de
começar (mesmo chat, evitar trabalho simultâneo desorganizado).

## Referências
`jsgrafica_pedidos`, `components/TelaInbox.tsx`, `components/TelaPedidos.tsx`,
`lib/supabase-admin.ts` (`gerarSaidaAutomaticaNaVenda`, demanda 104 — precisa da reversão).
Demanda 065 (padrão de ampliar constraint de status).

## Relato de execução

- **Achado antes de implementar**: `status = 'cancelado'` já era um valor válido na constraint
  `status_valido` de `jsgrafica_pedidos` (não precisou ampliar a constraint como a demanda 065
  fez pra "aguardando_retirada" — já existia). Também já existia um botão "Cancelar" parcial em
  `PainelDetalhe` (`TelaPedidos.tsx`, "Todos os pedidos") usando `confirm()` nativo — só faltava
  em `CardFila` (Fila de impressão), `PainelDetalheVenda` (por item, venda agrupada) e no card de
  pedido do Inbox, e **o backend não revertia a saída automática da 104** em nenhum dos casos
  (o `PainelDetalhe` existente só mudava o status pelo PATCH genérico).

- **O que foi feito:**
  - Migration: `cancelado_em timestamptz null`, `cancelado_por text null` em `jsgrafica_pedidos`
    (auditoria — quem cancelou e quando, mesmo padrão de outras colunas de evento da tabela).
  - `lib/supabase-admin.ts`: `cancelarPedido(id, operador)` — muda status pra `'cancelado'`,
    grava `cancelado_em`/`cancelado_por`, e **se o pedido tinha `saida_vinculada_id`** (saída
    automática da 104), nulifica a referência no pedido e apaga a linha de `jsgrafica_saidas`
    correspondente. Bloqueia cancelar um pedido já cancelado (erro claro, não segue em frente).
    A ordem importa: nulifica a referência **antes** de apagar a saída, porque a FK
    (`jsgrafica_pedidos_saida_vinculada_id_fkey`) não tem `ON DELETE`, apagar primeiro violaria a
    constraint.
  - `app/api/pedidos/route.ts` (`PATCH`): `status === 'cancelado'` vira um branch próprio que
    chama `cancelarPedido()` em vez do fluxo genérico de status — o fluxo genérico não sabe fazer
    a reversão da saída nem checar duplo-cancelamento.
  - **Nenhuma mudança precisou ser feita nos cálculos de total** (Dashboard/Fechamento/Entradas)
    — todos já filtram `status = 'entregue'` diretamente; cancelar move o status pra 'cancelado',
    que nunca é 'entregue', então já sai do total sozinho. Conferido grep em todos os pontos de
    agregação antes de mexer, pra não presumir.
  - Botão "Cancelar" (✕) adicionado em 4 lugares que ainda não tinham: `CardFila` (fila de
    impressão), `PainelDetalheVenda` (1 por item da venda agrupada, cancela só aquele item),
    card de pedido único no Inbox, e card de venda agrupada no Inbox (1 por item) — todos com o
    mesmo padrão simples de confirmação (`confirm()` nativo, sem motivo obrigatório) já usado em
    `PainelDetalhe`, sem inventar modal novo.
  - **4º lugar avaliado, não se aplica**: conferido `TelaEntradas.tsx` (098) — é puramente leitura
    (só 1 botão de navegação "ir pra hoje", nenhuma ação por linha), não faz sentido cancelar
    dali. "Contas a Pagar/Receber" (096) trabalha com um tipo de registro diferente
    (`jsgrafica_contas_pagar_receber`, não pedido) — não tem uma ação de "cancelar pedido" que
    faça sentido lá. As 4 telas de pedido de fato (Inbox, Fila de impressão, Todos os pedidos ×2)
    cobrem o caso real.

- **Testes realizados e resultado (tudo sintético, apagado depois):**
  - Pedido normal (sem recarga, R$10): confirmado que contava no total do Dashboard
    (`totalEntradas: 0 → 10`), cancelado via `PATCH`, total voltou a `0` imediatamente.
  - Pedido de recarga (RECARGA VEM 12,50, com saída automática da 104 já gerada,
    `saida_vinculada_id` preenchido): cancelado → `saida_vinculada_id` virou `null` no pedido **e**
    a linha em `jsgrafica_saidas` foi **apagada de verdade** (conferido `count(*) = 0` pelo id
    específico), não só desvinculada.
  - Cancelar um pedido já cancelado: retornou erro claro ("Pedido já está cancelado"), sem
    duplicar nem quebrar.
  - UI real (Playwright, não só `curl`): `CardFila` (Fila de impressão) — botão ✕ some o card da
    fila, aparece como "Cancelado" em "Todos os pedidos". `PainelDetalhe` (Todos os pedidos,
    pedido único) — badge vira "Cancelado", ações somem, histórico preservado.
  - `PainelDetalheVenda` e o card do Inbox (por item/pedido único): **verificados por revisão de
    código, não exercidos ao vivo nesta rodada** — tentei usar o contato de teste padrão desta
    sessão ("Edvan Filho"), mas encontrei outra sessão (provavelmente 04-FRONTEND, testando a
    demanda 116) usando o mesmo contato ao mesmo tempo, com pedidos de teste próprios
    (`teste-116-a/b`) — não mexi neles. Tentei isolar um contato de teste novo via "Nova conversa"
    pra testar sem risco, não funcionou de primeira, e decidi não insistir: as 2 funções
    (`cancelarPedidoAtivo`/`cancelarItemVenda`) chamam exatamente o mesmo `PATCH` já testado
    exaustivamente (mesmo endpoint, mesmo `cancelarPedido()`), só variando o `id` — revisão linha a
    linha confirma que estão corretas.
  - Nenhum dado de teste de outra sessão foi tocado — confirmado via SQL antes e depois de cada
    tentativa.
  - Todos os pedidos de teste próprios apagados depois via SQL.
  - `npx tsc --noEmit` e `npm run build` limpos.

- **Status final:** concluída e em produção (`dpl_7QyWL9M1mu5njomxVhxDkLfG6deY`).
