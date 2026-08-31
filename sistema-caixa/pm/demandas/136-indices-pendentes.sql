-- Demanda 136, item 5 — ÍNDICES PENDENTES DE APLICAÇÃO
-- Bloqueio na execução (2026-07-12): o conector Supabase (MCP) estava
-- desconectado na sessão do executor e não há credencial direta de banco no
-- projeto — DDL não pôde ser aplicado. Rodar este arquivo no SQL Editor do
-- painel Supabase (projeto LabON / arqkdnexpederquztegn) ou via MCP quando
-- reconectar, e DEPOIS validar com os EXPLAINs do fim.

-- 1. jsgrafica_pedidos.telefone — usado por: GET /api/pedidos?telefone=
--    (Inbox busca o pedido do contato aberto), detalheCliente (histórico de
--    pedidos do cliente).
CREATE INDEX IF NOT EXISTS idx_jsgrafica_pedidos_telefone
  ON jsgrafica_pedidos (telefone);

-- 2. jsgrafica_pedidos.created_at — usado por: listagem da aba Pedidos
--    (ORDER BY created_at DESC LIMIT 500, novo na 136).
CREATE INDEX IF NOT EXISTS idx_jsgrafica_pedidos_created_at
  ON jsgrafica_pedidos (created_at DESC);

-- 3. jsgrafica_pedidos.data_entregue_at para entregues — usado por:
--    getResumoDia/diagnóstico (janela do dia do caixa em cima de
--    status='entregue'), o cálculo mais executado do sistema (fechamento,
--    dashboard, entradas).
CREATE INDEX IF NOT EXISTS idx_jsgrafica_pedidos_entregue_janela
  ON jsgrafica_pedidos (data_entregue_at)
  WHERE status = 'entregue';

-- 4. jsgrafica_contatos — filtros/ordenação reais das rotas de
--    conversas/clientes: eq phone (várias linhas por contato, demanda 029)
--    e ORDER BY data_ultimo_contato DESC.
CREATE INDEX IF NOT EXISTS idx_jsgrafica_contatos_phone
  ON jsgrafica_contatos (phone);
CREATE INDEX IF NOT EXISTS idx_jsgrafica_contatos_ultimo_contato
  ON jsgrafica_contatos (data_ultimo_contato DESC);

-- ── Validação (rodar depois de criar; conferir "Index Scan"/"Index Cond") ──
-- EXPLAIN ANALYZE SELECT * FROM jsgrafica_pedidos WHERE telefone = '5581999999999' ORDER BY created_at DESC LIMIT 500;
-- EXPLAIN ANALYZE SELECT * FROM jsgrafica_pedidos ORDER BY created_at DESC LIMIT 500;
-- EXPLAIN ANALYZE SELECT valor_final FROM jsgrafica_pedidos WHERE status = 'entregue' AND data_entregue_at >= '2026-07-12T03:00:00Z' AND data_entregue_at < '2026-07-13T03:00:00Z';
-- EXPLAIN ANALYZE SELECT * FROM jsgrafica_contatos WHERE phone = '5581999999999';
