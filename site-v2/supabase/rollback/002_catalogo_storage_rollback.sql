-- Rollback 002 — executar ANTES do rollback 001.
begin;
DO $$
DECLARE n bigint;
BEGIN
  IF to_regclass('storage.objects') IS NULL OR to_regclass('storage.buckets') IS NULL THEN
    RAISE NOTICE 'Storage schema ausente; nada a remover';
    RETURN;
  END IF;
  SELECT count(*) INTO n FROM storage.objects WHERE bucket_id = 'catalogo-publico';
  IF n > 0 THEN
    RAISE EXCEPTION 'ROLLBACK BLOQUEADO: bucket catalogo-publico contém % objeto(s). Baixe/valide/remova os objetos antes.', n;
  END IF;
  DELETE FROM storage.buckets WHERE id = 'catalogo-publico';
END $$;
commit;
