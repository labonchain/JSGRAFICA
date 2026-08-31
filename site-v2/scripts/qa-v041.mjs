import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const checks = [];
const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });

const requiredRoutes = [
  "src/app/produtos-servicos/page.tsx",
  "src/app/produtos-servicos/impressoes/page.tsx",
  "src/app/produtos-servicos/impressoes/papel-couche/page.tsx",
  "src/app/produtos-servicos/fotos/page.tsx",
  "src/app/produtos-servicos/acabamentos/page.tsx",
  "src/app/produtos-servicos/acabamentos/encadernacao/page.tsx",
  "src/app/produtos-servicos/servicos-digitais/page.tsx",
  "src/app/produtos-servicos/produto/impressao-papel-adesivo-a4-192g/page.tsx",
  "src/app/personalizados/page.tsx",
  "src/app/servicos/page.tsx",
];
for (const route of requiredRoutes) add(`rota portada: ${route}`, exists(route));

const repository = read("src/lib/catalog/repository.ts");
const data = read("src/lib/catalog/data.ts");
const catalogList = read("src/components/StorefrontCatalogList.tsx");
const fixture = read("qa/fixtures/storefront-v040.ts");
const fixtureJson = read("qa/fixtures/storefront-v040.json");
const source = [repository, data, catalogList, read("src/components/CoucheSelector.tsx"), read("src/components/AdhesiveOrder.tsx")].join("\n");

add("repository server-only", /import\s+"server-only"/.test(repository));
add("RPC listar preservada", /jsgrafica_catalogo_listar/.test(data));
add("RPC por slug preservada", /jsgrafica_catalogo_por_slug/.test(data));
add("fixture explicitamente opt-in", /CATALOG_QA_FIXTURE\s*===\s*"1"/.test(repository));
add("fixture recusada em production", /siteConfig\.stage\s*===\s*"production"/.test(repository) && /Fixture de QA recusada/.test(repository));
add("sem fallback silencioso para fixture", !/catch[\s\S]{0,400}loadFixture/.test(repository));
add("busca implementada", /setQuery/.test(catalogList) && /Buscar produto ou serviço/.test(catalogList));
add("filtro implementado", /setGroup/.test(catalogList));
add("ordenação implementada", /price-asc/.test(catalogList) && /price-desc/.test(catalogList));
add("seletor Couchê implementado", exists("src/components/CoucheSelector.tsx") && /Gramatura/.test(read("src/components/CoucheSelector.tsx")));
add("detalhe Papel Adesivo implementado", exists("src/components/AdhesiveOrder.tsx") && /Quantidade a informar/.test(read("src/components/AdhesiveOrder.tsx")));
add("WhatsApp contextual usa helper canônico", /buildWhatsAppUrl/.test(source));
add("itens internos ausentes da fixture", !/Recebimento de empréstimo|Vendas não registradas/i.test(fixtureJson));
add("fixture marcada QA only", /QA FIXTURE ONLY/.test(fixture) && /Never use as a production fallback/.test(fixture));
add("nenhuma service_role no frontend portado", !/service[_-]?role/i.test(source));

const forbidden = [".openai", "build", "db", "drizzle", "worker", "vite.config.ts"];
for (const entry of forbidden) add(`infra Sites não portada: ${entry}`, !exists(entry));

function gitDiff(target) {
  return execFileSync("git", ["diff", "--", target], { cwd: root, encoding: "utf8" });
}
add("migrations/supabase sem alteração", gitDiff("supabase").trim() === "");
add("baseline rollback sem alteração", gitDiff("rollback").trim() === "");

for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"} — ${check.name}`);
const failed = checks.filter((check) => !check.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passaram.`);
if (failed.length) process.exit(1);
