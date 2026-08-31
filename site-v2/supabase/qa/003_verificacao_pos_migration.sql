-- QA SQL pós-aplicação — somente leitura.
-- Deve retornar PASS em todas as linhas de check ou valores coerentes.

SELECT 'table_publicacao' AS check_name, to_regclass('public.jsgrafica_catalogo_publicacao') IS NOT NULL AS pass
UNION ALL SELECT 'table_modalidades', to_regclass('public.jsgrafica_catalogo_modalidades') IS NOT NULL
UNION ALL SELECT 'table_assets', to_regclass('public.jsgrafica_catalogo_assets') IS NOT NULL
UNION ALL SELECT 'view_private', to_regclass('private.jsgrafica_catalogo_publico') IS NOT NULL
UNION ALL SELECT 'rpc_listar', to_regprocedure('public.jsgrafica_catalogo_listar(text,text,boolean)') IS NOT NULL
UNION ALL SELECT 'rpc_slug', to_regprocedure('public.jsgrafica_catalogo_por_slug(text)') IS NOT NULL;

SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname='public' AND tablename IN ('jsgrafica_catalogo_publicacao','jsgrafica_catalogo_modalidades','jsgrafica_catalogo_assets')
ORDER BY tablename;

SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema='public'
  AND table_name IN ('jsgrafica_catalogo_publicacao','jsgrafica_catalogo_modalidades','jsgrafica_catalogo_assets')
  AND grantee IN ('anon','authenticated')
ORDER BY table_name, grantee, privilege_type;
-- Esperado: zero linhas.

SELECT routine_name, grantee, privilege_type
FROM information_schema.role_routine_grants
WHERE routine_schema='public'
  AND routine_name IN ('jsgrafica_catalogo_listar','jsgrafica_catalogo_por_slug')
  AND grantee IN ('anon','authenticated')
ORDER BY routine_name, grantee;
-- Esperado: EXECUTE para anon/authenticated.

SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets WHERE id='catalogo-publico';

SELECT public.jsgrafica_catalogo_listar(NULL,NULL,NULL) AS catalogo_publico;
-- Esperado inicialmente: [] se nenhum SKU estiver elegível.
