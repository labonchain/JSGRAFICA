# 113 — Forma de pagamento e confirmação no pedido do Inbox + fluxo de pagamento na retirada

Status: concluída
Criada em: 2026-07-08
Aprovada em: 2026-07-08
Concluída em: 2026-07-08
Chat executor: 03 - APP JS GRAFICA

## Contexto
Itens 8-9 do backlog. Hoje o pedido feito pelo Inbox só tem a timeline de status (confirmado →
produção → pronto → aguardando retirada → entregue) — sem nada de forma de pagamento nem
confirmação de pagamento, diferente do Balcão (que já tem isso desde a demanda 066).

O Edvam explicou o fluxo real: cliente pede pelo Inbox e pode **pagar na hora** (ex. Pix
antecipado, já cobre casos "pre_producao") **ou pagar só na retirada** (Pix, cartão ou dinheiro
presencial). Se paga na hora, já resolve ali (fluxo de confirmação de Pix já existe, demanda 062).
Se vai pagar na retirada, o pedido precisa ficar sinalizado "pagamento pendente/a receber" até a
entrega — e quando o cliente retira e paga, alguém dá entrada informando a forma de pagamento
usada naquele momento.

## Objetivo
Todo pedido do Inbox tem forma de pagamento e status de pagamento visíveis e editáveis, com o
mesmo rigor que o Balcão já tem.

## Escopo
- Incluído:
  1. Card de pedido no Inbox ganha campo de forma de pagamento (Dinheiro/Cartão/Pix) e status
     (pago / pendente) — reaproveitar os mesmos componentes/padrão visual já usados no Balcão
     (066), não inventar novo.
  2. Se o produto for `pagamento_tipo: 'pre_producao'` (exige Pix antecipado) — fluxo já existe
     (demanda 062), sem mudança.
  3. Se for `flexivel` (paga na entrega): ao marcar "Entregue" com pagamento ainda pendente, já
     existe o modal de confirmação (demanda 072) — mas hoje ele só confirma "pago ou não", sem
     capturar a forma de pagamento usada. Ampliar esse modal pra também perguntar a forma de
     pagamento no momento da confirmação (Dinheiro/Cartão/Pix), gravando em `forma_pagamento` no
     pedido — mesma coluna que o Balcão já usa.
- Fora de escopo: mudar o fluxo de Pix antecipado (062) ou o modal de confirmação em si além de
  adicionar o campo de forma de pagamento.

## Critérios de aceite
- [x] Pedido do Inbox mostra forma de pagamento e status (pago/pendente) visualmente
- [x] Ao confirmar entrega com pagamento pendente, pede a forma de pagamento usada e grava
- [x] Sem regressão no fluxo de Pix antecipado (062) nem no modal existente (072)

## Riscos e cuidados
Mexe em telas de alta frequência (Inbox, confirmação de entrega) — testar com pedido sintético
dos dois tipos (pre_producao e flexivel) antes de considerar concluído. Aguardar o 03-APP
terminar a demanda 105 (e a 112, se rodar antes) antes de começar.

## Referências
`components/TelaInbox.tsx`, `components/TelaPedidos.tsx` (`ModalConfirmarPagamento`, demanda
072), demanda 066 (padrão de forma de pagamento no Balcão), demanda 062 (Pix antecipado).

## Relato de execução

- **🔴 Achado crítico antes de implementar**: o modal "Pagamento pendente" (demanda 072) já
  existia e já era chamado ao marcar "Entregue" com `pre_producao` não confirmado — mas
  **`pagamento_confirmado` nunca era gravado de verdade nesse fluxo**. O `PATCH /api/pedidos`
  genérico só mudava `status`; `pagamento_confirmado` só era setado na CRIAÇÃO do pedido (balcão).
  Ou seja: o operador clicava "Confirmar" achando que estava marcando como pago, mas o campo
  ficava `false` pra sempre. Corrigido junto — confirmar a forma de pagamento e marcar como pago
  viraram a mesma ação atômica no PATCH.

- **🔴 Achado de escopo, corrigido**: a demanda partia do princípio de que o modal "já aparece"
  pra pedidos `flexivel` — mas a demanda 072 tinha **restringido esse modal só pra `pre_producao`**
  de propósito (na época, o modal só perguntava "confirma que recebeu?", pergunta redundante pra
  quem já paga na entrega por definição). Como o modal agora pergunta a forma de pagamento
  (não redundante mais), reabri `precisaConfirmarPagamento()` pra incluir `flexivel` também —
  sem isso, a 113 não faria nada de diferente na prática pro caso que ela mesma descreve.
  `pos_producao` (balcão) continua de fora — já captura a forma no momento da venda (066).

- **O que foi feito:**
  - `components/TelaPedidos.tsx`: `ModalConfirmarPagamento` ganhou seletor R$... (Dinheiro/Cartão/
    Pix) — `onConfirmar` agora recebe a forma escolhida. `precisaConfirmarPagamento()` passou a
    incluir `flexivel` (achado acima). As 3 telas que já usavam o modal (`PainelDetalhe`,
    `PainelDetalheVenda`, `CardFila`) tiveram `onMudar`/`executarAvanco` ampliados pra aceitar e
    repassar `formaPagamento` opcional.
  - `app/api/pedidos/route.ts` (`PATCH`): aceita `formaPagamento` opcional — quando presente,
    grava `forma_pagamento`, `pagamento_confirmado: true` e `pagamento_confirmado_at` **na mesma
    atualização** que muda o status (mesma correção do achado crítico acima).
  - `components/TelaInbox.tsx`: card de pedido (único e venda agrupada) ganhou linha de forma de
    pagamento + status (✓ Pago / Pendente), mesmo padrão visual do Balcão (066) — não existia
    nenhuma exibição de pagamento no card do Inbox antes. `executarAvancoPedido`/
    `executarAvancoItemVenda`/`confirmarAvancoPendente` ampliados pra aceitar e repassar
    `formaPagamento`, mesma mudança das 3 telas de `TelaPedidos.tsx`.
  - Nenhuma migration nova — `forma_pagamento`, `pagamento_confirmado_at` já existiam na tabela
    (usados só pelo Balcão até aqui).

- **Testes realizados e resultado (tudo sintético, apagado depois):**
  - Pedido `flexivel` via API: `PATCH` com `formaPagamento: "Pix"` gravou `forma_pagamento: "Pix"`,
    `pagamento_confirmado: true`, `pagamento_confirmado_at` preenchido, na mesma chamada que
    mudou o status pra `entregue`.
  - Avançar status sem `formaPagamento` (ex. pra `em_producao`): confirmado que os campos de
    pagamento continuam intocados (`null`/`false`) — sem efeito colateral em transições normais.
  - **UI real via Playwright**: pedido `flexivel` avançado até "Pronto" → clique em "Entregue" →
    modal "Pagamento pendente" **passou a aparecer** (não aparecia antes da 113) com os 3 botões
    R$/Cartão/Pix → escolhido "Cartão" → confirmado que o painel de detalhe passou a mostrar
    "flexivel · Cartão" e "✓ Pagamento confirmado".
  - Regressão do fluxo `pre_producao` (062): mesmo teste, produto `pre_producao` — modal continua
    aparecendo igual (nenhuma mudança de comportamento visível pro usuário, só o bug de fundo
    corrigido), escolhido "Pix", confirmado que grava certo.
  - Exibição no card do Inbox (pedido único e venda agrupada): **verificada por revisão de
    código, não exercida ao vivo nesta rodada** — mesmo obstáculo da demanda 112 (contato de
    teste padrão em uso por outra sessão concorrente, tentativa de isolar um novo contato via
    "Nova conversa" não deu certo de primeira) — a lógica de exibição é idêntica à já confirmada
    em "Todos os pedidos" (mesmos campos `forma_pagamento`/`pagamento_confirmado`, só renderizados
    num componente diferente).
  - Todos os pedidos de teste apagados depois via SQL.
  - `npx tsc --noEmit` e `npm run build` limpos.

- **Status final:** concluída e em produção (`dpl_BAZw6FhV3AfEEzx6pRzjP8oTXurR`).
