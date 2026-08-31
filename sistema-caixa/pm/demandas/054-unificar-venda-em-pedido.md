# 054 — Unificar Venda em Pedido (Inbox e PDV de balcão)

Status: aprovada
Criada em: 2026-07-04
Aprovada em: 2026-07-04
Concluída em: —
Chat executor: 03 - APP JS GRAFICA

## Contexto
Decisão do Edvam, depois de discussão com o PM: **não existe diferença real entre "venda" e
"pedido"** — uma venda é só um pedido que já nasceu pronto. Daqui pra frente, tudo vira pedido,
não importa se veio do WhatsApp (Inbox) ou do balcão (PDV). `jsgrafica_vendas` para de receber
linha nova, mas continua existindo intacta com o histórico (~3.700 linhas) — não vamos migrar
retroativamente.

## Objetivo
Um único fluxo de registro de transação (`jsgrafica_pedidos`), usado tanto pra pedido via
WhatsApp quanto pra venda de balcão — a venda de balcão só nasce direto em status "Entregue"
(é instantânea, não precisa da etapa de produção).

## Escopo
- Incluído:
  1. **Painel do Inbox** (`components/TelaInbox.tsx`): remover a seção "Lançar Venda" —
     fica só "Pedido desta conversa" (criado na demanda 045).
  2. **PDV principal** (a tela hoje chamada "Lançar Venda" no admin e no PDV — `app/page.tsx` e
     `app/pdv/page.tsx`): renomear a aba pra **"Pedidos Balcão"**. Ao confirmar, em vez de
     gravar em `jsgrafica_vendas`, grava em `jsgrafica_pedidos` com:
     - `status = 'entregue'` direto (sem passar pelas etapas confirmado/produção/pronto — é
       instantâneo, cliente leva na hora), `data_entregue_at = agora`.
     - `telefone`: se o operador vincular um contato (busca "Vincular contato (opcional)" já
       existente na tela), usa o telefone real; senão, usa o sentinel `'balcao'` — **mesma
       convenção que já existe hoje** pra vendas anônimas/fila de impressão (não inventar valor
       novo).
     - `pedido_criado_por` = operador logado (Edvam/Zu/Gabi).
     - Se o carrinho tiver mais de um produto, cada item vira uma linha própria em
       `jsgrafica_pedidos` (mesmo padrão de granularidade que `jsgrafica_vendas` já tinha —
       uma linha por produto, não uma linha por "carrinho inteiro").
  3. Sem mensagem automática nenhuma nesse fluxo (balcão não tem WhatsApp pra avisar) — os
     textos de status automático (demanda 046) só valem pra pedido com telefone real.
- Fora de escopo: migrar as ~3.700 linhas históricas de `jsgrafica_vendas` pra `jsgrafica_pedidos`
  (não fazer isso); mudar a estrutura de `jsgrafica_pedidos` (schema já serve).

## Critérios de aceite
- [ ] Painel do Inbox não mostra mais "Lançar Venda", só "Pedido desta conversa"
- [ ] Aba renomeada pra "Pedidos Balcão" no admin e no PDV
- [ ] Venda de balcão sem contato vinculado grava em `jsgrafica_pedidos` com `telefone='balcao'`,
      `status='entregue'`
- [ ] Venda de balcão com contato vinculado grava com o telefone real
- [ ] Carrinho com múltiplos produtos gera uma linha por produto
- [ ] `jsgrafica_vendas` não recebe nenhuma linha nova depois do deploy (conferir)

## Riscos e cuidados
Não apagar nem alterar nada em `jsgrafica_vendas` — só parar de escrever nela daqui pra frente.
Dashboard (demanda 055, depende desta) vai precisar somar as duas fontes.

## Referências
`components/TelaInbox.tsx`, `app/page.tsx`, `app/pdv/page.tsx`, `app/api/vendas/route.ts` (rota
atual, referência do que vira `jsgrafica_pedidos`), `app/api/pedidos/route.ts` (rota de destino).
Demanda 045/046 (padrão de pedido já construído).

## Relato de execução

### O que foi feito
- **`components/TelaInbox.tsx`**: removida por completo a seção "Lançar Venda" (estado do
  carrinho, categorias, modal de quantidade, entrada avulsa, `confirmarVenda`) — o painel
  direito agora termina em "Pedido desta conversa" (da demanda 045), que passou a ocupar o
  espaço restante (`flex-1`/rola por conta própria) em vez de dividir espaço com o mini-PDV.
  `produtosDB`/`grupos` (catálogo) foram mantidos — ainda alimentam o fluxo de "Criar pedido".
- **`app/page.tsx`** e **`app/pdv/page.tsx`** (admin e PDV — implementações praticamente
  duplicadas, mesmo tratamento nos dois): aba renomeada de "Lançar Venda" pra **"Pedidos
  Balcão"**. `confirmarVenda` agora grava um `POST /api/pedidos` por item do carrinho (mesma
  granularidade que `jsgrafica_vendas` tinha) em vez de `POST /api/vendas`. Removido também o
  modal antigo "Precisa ir para impressão?" (`vendaFinalizada`/`adicionarAFila`) — ficou
  redundante: ele existia pra oferecer criar um pedido *depois* da venda, e agora toda venda já
  nasce pedido direto, então perguntar de novo seria duplicar o registro.
- **`app/api/pedidos/route.ts`** (POST): novo branch pra `body.origemBalcao` — grava
  `telefone` (real, se veio de "Vincular contato", senão `'balcao'` — mesmo sentinel que já
  existia), `pedido_criado_por` = operador logado de verdade (Edvam/Zu/Gabi, não mais a string
  fixa `'balcao'` que o fluxo antigo usava), `status='entregue'` e `data_entregue_at=agora`
  direto (sem produção). Removido o branch antigo de "fila de impressão" (só o `adicionarAFila`
  chamava, e ele foi removido).

### Achado fora do escopo — corrigido no processo
Ao testar o novo branch, a gravação falhava com `violates check constraint
"pagamento_tipo_valido"` — o valor `pagamento_tipo: 'balcao'` (copiado do branch antigo que eu
estava substituindo) **nunca foi um valor válido** (a constraint só aceita `pre_producao`/
`pos_producao`/`flexivel`). Ou seja, **o fluxo antigo de "fila de impressão" nunca conseguia
gravar de verdade** — sempre dava erro 500 silencioso (o front só ignorava a resposta). Não é
regressão desta demanda; troquei pro valor válido `pos_producao` (balcão paga na hora, sem
etapa de produção separada) e registrado aqui pra constar.

### Testes realizados
- `npx tsc --noEmit` e `npm run build` — limpos.
- Local via `curl` em `POST /api/pedidos` com `origemBalcao`: sem contato → grava
  `telefone='balcao'`; com contato (`telefone`+`nomeCliente`) → grava telefone real. Ambos com
  `status='entregue'`, `data_entregue_at` preenchido.
- Playwright local (`admin.localhost:3000`, login real): aba renomeada confirmada ("Pedidos
  Balcão" existe, "Lançar Venda" não existe mais em lugar nenhum — 0 ocorrências). Adicionado
  produto real (Xerox Preto e Branco A4) ao carrinho, confirmado venda — feedback "R$ 0,45
  registrado!", "Entradas do dia" no header atualizou ao vivo (R$3,50 → R$3,95), modal antigo de
  fila de impressão **não apareceu** (confirmado ausente). Conferido no banco: linha gravada em
  `jsgrafica_pedidos` com `telefone='balcao'`, `pedido_criado_por='Edvam'` (nome real do
  operador logado), `status='entregue'`.
- Abri uma conversa real no Inbox ("Edvan Filho") — painel direito confirmado: sem "Lançar
  Venda", só "Pedido desta conversa" com botão "Criar pedido".
- Confirmado `jsgrafica_vendas` continua em **3.700 linhas** antes e depois de todos os testes
  (nenhuma linha nova) — histórico intacto, tabela realmente parou de crescer.
- Dados de teste apagados do banco depois de confirmar (não ficou lixo em produção).

### Status final
**Concluída e deployada** (`dpl_y8wxFZAjhYH2zN3Vs3Vnp3uA8CEa`), testado local e confirmado em
produção.
