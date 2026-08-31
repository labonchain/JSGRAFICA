# Supabase — ordem de execução

1. `migrations/001_catalogo_publico.sql`
2. configurar `app.settings.supabase_url` conforme runbook
3. `migrations/002_catalogo_storage.sql`
4. `qa/003_verificacao_pos_migration.sql`

Rollback, se autorizado e seguro:
1. `rollback/002_catalogo_storage_rollback.sql`
2. `rollback/001_catalogo_publico_rollback.sql`

Nunca aplicar este pacote em conta não confirmada da JS Gráfica.
