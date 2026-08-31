-- JS Gráfica SITE V2 — v2A
-- Migration 002: bucket Storage dedicado a derivados WEB aprovados.
-- Nenhuma credencial é gravada aqui.

begin;

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL THEN
    RAISE EXCEPTION 'PRECHECK FAIL: schema Storage do Supabase não encontrado';
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'catalogo-publico',
  'catalogo-publico',
  true,
  10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/avif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Não cria políticas de INSERT/UPDATE/DELETE para anon/authenticated.
-- Bucket público permite entrega dos derivados aprovados via URL pública;
-- upload fica reservado ao executor/admin pela plataforma correta.

commit;
