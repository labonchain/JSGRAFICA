import type { CatalogMode, CatalogProduct } from "./types";
import type { StorefrontArea, StorefrontAttributes, StorefrontItem } from "./storefront-types";

const INTERNAL_NAMES = new Set([
  "recebimento de emprestimo",
  "vendas nao registradas",
]);

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();
}

function activeMode(product: CatalogProduct): CatalogMode | undefined {
  return product.modalidades.find((mode) => mode.ativo);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function firstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function extractAttributes(product: CatalogProduct): StorefrontAttributes {
  const physical = isRecord(product.especificacao_fisica) ? product.especificacao_fisica : {};
  const haystack = normalize(`${product.nome} ${product.resumo_curto}`);
  const format = firstString(physical, ["formato", "tamanho_final", "tamanho", "formato_final"])
    ?? (haystack.match(/\ba[34]\b/i)?.[0]?.toUpperCase());
  const weight = firstString(physical, ["gramatura", "peso"])
    ?? (haystack.match(/\b(?:90|180|192|230|250|300)\s*g\b/i)?.[0]?.replace(/\s+/g, ""));
  const sides = firstString(physical, ["frente_verso", "lados", "impressao"])
    ?? (haystack.includes("frente e verso") ? "frente e verso" : haystack.includes("so frente") ? "só frente" : undefined);
  const cut = firstString(physical, ["corte", "recorte", "acabamento"])
    ?? (haystack.includes("sem recorte") ? "sem recorte" : haystack.includes("com recorte") ? "com recorte" : undefined);
  const material = firstString(physical, ["material", "papel"]);
  const finish = firstString(physical, ["acabamento"]);
  return { format, weight, sides, cut, material, finish };
}

function classify(product: CatalogProduct): { area: StorefrontArea; group: string } | null {
  const name = normalize(product.nome);
  if (INTERNAL_NAMES.has(name)) return null;
  const text = normalize([product.nome, product.categoria, product.familia ?? "", ...(product.tags ?? [])].join(" "));

  if (/\brecarga\b/.test(text)) return { area: "recargas", group: "Recargas" };
  if (/encadern/.test(text)) return { area: "acabamentos", group: "Encadernação" };
  if (/plastific/.test(text)) return { area: "acabamentos", group: "Plastificação" };
  if (/foto 3[×x]4|foto 10[×x]15|foto 15[×x]20|foto 20[×x]29|polaroid|papel foto|fotograf/.test(text)) {
    return { area: "fotos", group: /papel foto|fotograf/.test(text) && !/^foto\b/.test(name) ? "Papel Fotográfico" : "Fotos" };
  }
  if (/papel couche|couche/.test(text)) return { area: "impressoes", group: "Papel Couchê" };
  if (/papel adesivo/.test(text) && !/leitoso|transparente/.test(text)) return { area: "impressoes", group: "Papel Adesivo" };
  if (/papel cartao/.test(text)) return { area: "impressoes", group: "Papel Cartão" };
  if (/panfleto|cartao de visita/.test(text)) return { area: "impressoes", group: "Panfletos e Cartões" };
  if (/xerox|impressao p&b|impressao preto e branco/.test(text)) return { area: "impressoes", group: "Documentos / Xerox" };
  if (/impressao colorida|xerox colorida/.test(text)) return { area: "impressoes", group: "Coloridas" };
  if (/banner|lona/.test(text)) return { area: "personalizados", group: "Comunicação Visual" };
  if (/adesivo leitoso|adesivo transparente/.test(text)) return { area: "personalizados", group: "Adesivos" };
  if (/topo de bolo/.test(text)) return { area: "personalizados", group: "Festas e Comemorações" };
  if (/criar arte/.test(text)) return { area: "personalizados", group: "Criação" };
  if (/ima com calendario/.test(text)) return { area: "personalizados", group: "Ímãs" };
  if (/\brifa\b/.test(text)) return { area: "personalizados", group: "Talões e Rifas" };
  if (/caneca|camisa/.test(text)) return { area: "personalizados", group: "Canecas e Camisas" };
  if (/acesso|envio de documentos|scanner|agendamento|curriculo|antecedente|digitacao|cadastro|matricula|b\.o\.|consulta cpf|scpc|serasa|cartorio|conta gov|2.? via/.test(text)) {
    if (/consulta|scpc|serasa|cartorio/.test(text)) return { area: "digitais", group: "Consultas" };
    if (/cadastro|matricula|b\.o\./.test(text)) return { area: "digitais", group: "Cadastros" };
    if (/gov|2.? via/.test(text)) return { area: "digitais", group: "GOV e 2ª via" };
    if (/agendamento|curriculo|antecedente|digitacao/.test(text)) return { area: "digitais", group: "Atendimento Digital" };
    return { area: "digitais", group: "Documentos" };
  }
  if (/caneta|envelope|lapis|papel oficio|papel pautado|pasta.*documentos|carteira para rg/.test(text)) {
    return { area: "papelaria", group: "Papelaria / Conveniência" };
  }
  if (/\bdigital\b|arquivo digital/.test(text)) return { area: "produtos-digitais", group: product.categoria || "Produtos Digitais" };
  return null;
}

function metadata(product: CatalogProduct, attributes: StorefrontAttributes) {
  const parts = [attributes.format, attributes.weight, attributes.sides, attributes.cut].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  return product.resumo_curto || undefined;
}

function routeFor(product: CatalogProduct) {
  return product.slug ? `/produtos/${product.slug}` : undefined;
}

export function mapCatalogProductToStorefront(product: CatalogProduct): StorefrontItem | null {
  const classification = classify(product);
  if (!classification) return null;
  const mode = activeMode(product);
  if (!mode) return null;
  const attributes = extractAttributes(product);
  const cover = product.assets.find((asset) => asset.tipo === "CAPA") ?? product.assets[0];
  return {
    code: product.sku,
    slug: product.slug || null,
    name: product.nome,
    price: mode.preco,
    priceMode: mode.modo_preco,
    area: classification.area,
    group: classification.group,
    href: routeFor(product),
    meta: metadata(product, attributes),
    summary: product.resumo_curto,
    quoteRequired: mode.orcamento_obrigatorio,
    attributes,
    image: cover ? { url: cover.public_url, alt: cover.alt_text } : undefined,
  };
}

export function mapCatalogProductsToStorefront(products: CatalogProduct[]) {
  return products.map(mapCatalogProductToStorefront).filter((item): item is StorefrontItem => Boolean(item));
}

export function isInternalPublicName(name: string) {
  return INTERNAL_NAMES.has(normalize(name));
}
