import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, p))).digest("hex");
const checks = [];
const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });

const migration = read("supabase/migrations/001_catalogo_publico.sql");
const env = read(".env.example");
const sourceText = [
  "src/lib/catalog/data.ts", "src/lib/site.ts", "src/app/page.tsx", "src/app/produtos/page.tsx",
  "src/app/produtos/[slug]/page.tsx", "src/components/ProductDecision.tsx"
].map(read).join("\n");

add("package.json presente", exists("package.json"));
add("env example presente", exists(".env.example"));
add("Home presente", exists("src/app/page.tsx"));
add("Serviços presente", exists("src/app/servicos/page.tsx"));
add("Produtos presente", exists("src/app/produtos/page.tsx"));
add("Categoria dinâmica presente", exists("src/app/produtos/categoria/[slug]/page.tsx"));
add("Produto híbrido presente", exists("src/app/produtos/[slug]/page.tsx"));
add("Contato presente", exists("src/app/contato/page.tsx"));
add("robots presente", exists("src/app/robots.ts"));
add("sitemap presente", exists("src/app/sitemap.ts"));
add("migration 001 presente", exists("supabase/migrations/001_catalogo_publico.sql"));
add("migration 002 presente", exists("supabase/migrations/002_catalogo_storage.sql"));
add("rollback 001 presente", exists("supabase/rollback/001_catalogo_publico_rollback.sql"));
add("rollback 002 presente", exists("supabase/rollback/002_catalogo_storage_rollback.sql"));
add("QA SQL presente", exists("supabase/qa/003_verificacao_pos_migration.sql"));
add("RLS nas três tabelas", (migration.match(/ENABLE ROW LEVEL SECURITY/g) ?? []).length === 3);
add("sem grants diretos de SELECT para anon", !/GRANT\s+SELECT\s+ON\s+(TABLE\s+)?public\.jsgrafica_catalogo_/i.test(migration));
add("RPC listar security definer", /jsgrafica_catalogo_listar[\s\S]*SECURITY DEFINER/i.test(migration));
add("RPC slug security definer", /jsgrafica_catalogo_por_slug[\s\S]*SECURITY DEFINER/i.test(migration));
add("gate operacional ativo", /p\.ativo\s*=\s*true/.test(migration));
add("gate PRODUTOS ATIVO", /status_produto\s*=\s*'ATIVO'/.test(migration));
add("gate PUBLICADO", /status_publicacao\s*=\s*'PUBLICADO'/.test(migration));
add("gate modalidade ativa", /m\.ativo\s*=\s*true/.test(migration));
add("asset aprovado/publicável exigido", /a\.aprovado\s*=\s*true\s+AND\s+a\.publicavel\s*=\s*true/.test(migration));
add("service role ausente do runtime", !/service[_-]?role/i.test(sourceText));
add("env sem chave JWT típica", !/eyJ[a-zA-Z0-9_-]{10,}\./.test(env));
add("preview bloqueia indexação por padrão", /stage:\s*env\.NEXT_PUBLIC_SITE_STAGE\s*\|\|\s*"preview"/.test(read("src/lib/site.ts")) && /disallow:\s*"\/"/.test(read("src/app/robots.ts")));
add("baseline legacy index copiado", exists("rollback/legacy-production/index.html"));
add("baseline legacy vercel copiado", exists("rollback/legacy-production/vercel.json"));
add("runbook presente", exists("docs/RUNBOOK-CLAUDE-PM.md"));
add("manifesto presente", exists("docs/MANIFESTO.md"));

if (exists("qa/baseline-hashes.json")) {
  const baseline = JSON.parse(read("qa/baseline-hashes.json"));
  add("hash index legacy confere", baseline.index_html_sha256 === sha("rollback/legacy-production/index.html"));
  add("hash vercel legacy confere", baseline.vercel_json_sha256 === sha("rollback/legacy-production/vercel.json"));
}

for (const c of checks) console.log(`${c.ok ? "PASS" : "FAIL"} — ${c.name}`);
const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passaram.`);
if (failed.length) process.exit(1);
