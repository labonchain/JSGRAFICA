# 139 — Jornada do pedido (Fase 2/5): "tipo de entrega" vira pergunta explícita nos 2 canais

Status: concluída — aguardando validação do PM/Edvam em produção antes da Fase 3
Criada em: 2026-07-09
Aprovada em: 2026-07-09
Concluída em: 2026-07-09
Chat executor: 03 - APP JS GRAFICA

## Contexto — plano geral (retomando após Fase 1 validada)
Fase 1 (demandas 137/138) concluída e validada: forma de pagamento e "quando paga" viraram
escolha explícita, capturada num popup na criação do pedido, nos 2 canais. **Nenhum comportamento
de produção/confirmação mudou ainda** — é só captura.

Mapeamento da jornada atual (repetido da 137, ainda válido): **balcão já pergunta "tipo de
entrega"** (`statusEntrega`, 'aguardando_retirada' ou implícito 'entregue', demanda 066) — mas o
**Inbox não tem esse conceito na criação** — todo pedido do Inbox nasce como `confirmado` e só
decide entregue vs aguardando_retirada perto do fim da esteira (`pronto` → escolhe uma das duas).

## Objetivo desta demanda (Fase 2)
Existe um campo por pedido que registra o **tipo de entrega escolhido na criação**
('imediata'/'retirada') — capturado nos 2 canais, com o Inbox ganhando essa pergunta pela
primeira vez — **sem alterar nenhum comportamento hoje existente** (a esteira de status continua
igual; o campo novo só é gravado, ninguém ainda decide nada em cima dele — isso é Fase 5).

## Escopo
- Incluído:
  1. Novo campo em `jsgrafica_pedidos` — ex. `tipo_entrega_escolhido` ('imediata' | 'retirada'),
     nullable, sem CHECK que quebre linha existente.
  2. **Inbox**: adicionar a pergunta "Tipo de entrega?" (Imediata / Retira depois) no MESMO modal
     que a 138 já criou (forma de pagamento) — indo antes das perguntas de pagamento, seguindo a
     ordem natural que o Edvam descreveu (tipo de entrega → forma de pagamento). Opcional, sem
     default, mesma filosofia da Fase 1.
  3. **Balcão (os 2, `app/page.tsx` e `app/pdv/page.tsx`)**: gravar o campo novo **derivado** do
     `statusEntrega` que já existe hoje (`'aguardando_retirada'` → `'retirada'`, senão →
     `'imediata'`) — sem adicionar pergunta nova aqui, já que o balcão já pergunta isso.
  4. Gravar em toda criação de pedido daqui pra frente, sem exigir preenchimento em nenhum outro
     lugar do sistema.
- Fora de escopo: qualquer mudança na esteira de status, na trava de produção, ou em qual
  pipeline (curta do balcão vs longa do Inbox) um pedido segue — isso é Fase 5. Esta demanda só
  captura o dado.

## Critérios de aceite
- [x] Campo novo existe, nullable, sem afetar histórico
- [x] Pergunta "Tipo de entrega?" aparece no modal do Inbox (138), antes das perguntas de
      pagamento
- [x] Balcão grava o campo novo derivado do `statusEntrega` existente, sem pergunta duplicada
- [x] Nenhum comportamento existente mudou — esteira de status, produção e confirmação continuam
      exatamente como hoje (regressão testada explicitamente, mesmo padrão da 137)

## Riscos e cuidados
Mesmo baixo risco da Fase 1 — só adiciona campo/pergunta. Testar regressão nos 2 canais.

## Referências
Demanda 137/138 (Fase 1, mesmo padrão e mesmo modal a reaproveitar no Inbox). Esta conversa
(2026-07-09) — mapeamento da jornada atual e decisão de seguir a ordem das fases.

## Relato de execução

### O que foi feito
- **Migration** (`add_tipo_entrega_escolhido_pedidos`): `tipo_entrega_escolhido`
  ('imediata'/'retirada'), nullable com CHECK (não afeta linha existente — todas ficam null).
- **API**: o mesmo helper da 137 (`camposEscolhaPagamento`, nos 2 branches do POST) passou a
  normalizar também `tipoEntregaEscolhido` — valor inválido vira null, nunca derruba a criação.
- **Inbox**: pergunta "Tipo de entrega (opcional)" (Imediata / Retira depois) adicionada no MESMO
  modal da 138, **antes** das perguntas de pagamento (ordem natural que o Edvam descreveu).
  Opcional, sem default, clicar de novo desmarca — mesma filosofia da Fase 1. Uma escolha por
  venda, gravada em todos os itens; resets junto com os demais estados.
- **Balcões (os 2, `app/page.tsx` e `app/pdv/page.tsx`)**: campo **derivado** do `statusEntrega`
  que o modal da 066 já pergunta (`'aguardando_retirada'` → `'retirada'`, senão `'imediata'`) —
  **nenhuma pergunta nova/duplicada** no balcão, como pedido.

### Testes realizados (sintéticos apagados no fim)
- **Balcão via API**: `statusEntrega: 'entregue'` → `'imediata'` gravado (junto com os campos da
  137 intactos); `'aguardando_retirada'` → `'retirada'`; valor inválido ("expressa") → null.
- **Inbox via UI (Playwright, conversa real do Edvan Filho)**: ordem dos labels no modal medida —
  `["Tipo de entrega (opcional)", "Forma de pagamento (opcional)", "Pagar quando? (opcional)"]`
  (entrega primeiro ✓); pedido real criado escolhendo Retira depois + Pix + Na retirada →
  banco gravou `('retirada','pix','retirada')`.
- **Regressão explícita da esteira** (mesmo padrão da 137): o pedido criado percorreu
  Confirmado → Em produção → Pronto → Entregue pela UI normalmente, **incluindo o modal de
  pagamento pendente da 113 disparando no lugar certo** (produto `flexivel` ao marcar Entregue) e
  gravando `forma_pagamento: 'Dinheiro'`/`pagamento_confirmado: true` como sempre — esteira,
  produção e confirmação intocadas.
- `npx tsc --noEmit` e `npm run build` limpos.

### Status final
Concluída e em produção (`dpl_9XJXXLmsqMy6WsKrXdVRP2EmrXRE`, deploy compartilhado com a 140).
**Parado aqui — Fase 3 só com confirmação explícita do PM.**
