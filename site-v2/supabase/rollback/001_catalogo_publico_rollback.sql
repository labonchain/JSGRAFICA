-- Rollback 001 — remove SOMENTE objetos criados pelo pacote SITE V2.
-- Não altera public.jsgrafica_produtos.
begin;

DROP FUNCTION IF EXISTS public.jsgrafica_catalogo_por_slug(text);
DROP FUNCTION IF EXISTS public.jsgrafica_catalogo_listar(text,text,boolean);
DROP VIEW IF EXISTS private.jsgrafica_catalogo_publico;
DROP TRIGGER IF EXISTS trg_catalogo_assets_integridade ON public.jsgrafica_catalogo_assets;
DROP TRIGGER IF EXISTS trg_catalogo_modalidades_integridade ON public.jsgrafica_catalogo_modalidades;
DROP TRIGGER IF EXISTS trg_catalogo_validar_publicacao ON public.jsgrafica_catalogo_publicacao;
DROP TRIGGER IF EXISTS trg_catalogo_assets_touch ON public.jsgrafica_catalogo_assets;
DROP TRIGGER IF EXISTS trg_catalogo_modalidades_touch ON public.jsgrafica_catalogo_modalidades;
DROP TRIGGER IF EXISTS trg_catalogo_publicacao_touch ON public.jsgrafica_catalogo_publicacao;
DROP FUNCTION IF EXISTS public.jsgrafica_catalogo_validar_integridade_filhos();
DROP FUNCTION IF EXISTS public.jsgrafica_catalogo_validar_publicacao();
DROP FUNCTION IF EXISTS public.jsgrafica_catalogo_touch_updated_at();
DROP TABLE IF EXISTS public.jsgrafica_catalogo_assets;
DROP TABLE IF EXISTS public.jsgrafica_catalogo_modalidades;
DROP TABLE IF EXISTS public.jsgrafica_catalogo_publicacao;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='private')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='private')
  THEN
    EXECUTE 'DROP SCHEMA private';
  END IF;
END $$;

commit;
