import fs from "node:fs";

const items = JSON.parse(fs.readFileSync(new URL("../qa/fixtures/storefront-v040.json", import.meta.url), "utf8"));
const checks = [];
const add = (name, ok, detail = "") => checks.push({ name, ok: Boolean(ok), detail });

function search(query, pool = items) {
  const normalized = query.toLocaleLowerCase("pt-BR");
  return pool.filter((item) => `${item.name} ${item.meta ?? ""} ${item.code} ${item.group}`.toLocaleLowerCase("pt-BR").includes(normalized));
}

const adhesiveSearch = search("Adesivo A4");
add("busca Adesivo A4 retorna 2 opções", adhesiveSearch.length === 2, adhesiveSearch.map((item) => item.code).join(", "));

const couche = items.filter((item) => item.group === "Papel Couchê");
add("Couchê tem 12 variantes de QA", couche.length === 12, String(couche.length));
const selectedCouche = couche.find((item) => item.attributes?.format === "A3" && item.attributes?.weight === "300g" && item.attributes?.sides === "frente e verso");
add("Couchê A3/300g/frente e verso resolve prod-060", selectedCouche?.code === "prod-060" && selectedCouche?.price === 11.5, selectedCouche ? `${selectedCouche.code} ${selectedCouche.price}` : "não encontrado");

const adhesive = items.filter((item) => item.group === "Papel Adesivo" && item.attributes?.format === "A4" && item.attributes?.weight === "192g");
add("Papel Adesivo A4 192g tem sem/com recorte", adhesive.length === 2 && new Set(adhesive.map((item) => item.attributes?.cut)).size === 2, adhesive.map((item) => `${item.code}:${item.attributes?.cut}`).join(", "));
add("preços QA do adesivo preservados", adhesive.some((item) => item.code === "prod-011" && item.price === 6.5) && adhesive.some((item) => item.code === "prod-056" && item.price === 9), adhesive.map((item) => `${item.code}:${item.price}`).join(", "));

const prints = items.filter((item) => item.area === "impressoes");
const sortedPrints = [...prints].sort((a, b) => (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER));
add("ordenação por menor preço é determinística", sortedPrints[0]?.code === "prod-036" && sortedPrints[0]?.price === 0.45, `${sortedPrints[0]?.code}:${sortedPrints[0]?.price}`);

const encadernacao = items.filter((item) => item.group === "Encadernação");
add("Encadernação tem cinco faixas", encadernacao.length === 5, String(encadernacao.length));
const photos = items.filter((item) => item.area === "fotos");
add("Fotos contém sete opções no recorte QA", photos.length === 7, String(photos.length));
const digital = items.filter((item) => item.area === "digitais");
add("Serviços digitais/documentos presentes", digital.length === 10, String(digital.length));
const personalized = items.filter((item) => item.area === "personalizados");
add("Personalizados/comunicação visual presentes", personalized.length === 12, String(personalized.length));

const forbidden = items.filter((item) => /Recebimento de empréstimo|Vendas não registradas/i.test(item.name));
add("itens internos ausentes", forbidden.length === 0, forbidden.map((item) => item.name).join(", "));
add("fixture é recorte, não cópia dos 112 itens", items.length === 78, String(items.length));

for (const check of checks) console.log(`${check.ok ? "PASS" : "FAIL"} — ${check.name}${check.detail ? ` — ${check.detail}` : ""}`);
const failed = checks.filter((check) => !check.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks funcionais de fixture passaram.`);
if (failed.length) process.exit(1);
