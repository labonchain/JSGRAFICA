import type { MetadataRoute } from "next";
import { getCatalogProducts } from "@/lib/catalog/data";
import { mapCatalogProductToStorefront } from "@/lib/catalog/storefront";
import { siteConfig } from "@/lib/site";

function categorySlug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const staticPaths = [
  "",
  "/servicos",
  "/produtos",
  "/personalizados",
  "/contato",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getCatalogProducts();
  const base = staticPaths.map((path) => ({
    url: `${siteConfig.siteUrl}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : .7,
  }));
  const productRoutes = products.map((p) => ({ url: `${siteConfig.siteUrl}/produtos/${p.slug}`, changeFrequency: "weekly" as const, priority: .8 }));
  const nonPersonalized = products.filter((p) => mapCatalogProductToStorefront(p)?.area !== "personalizados");
  const categories = [...new Set(nonPersonalized.map((p) => p.categoria))].map((c) => ({ url: `${siteConfig.siteUrl}/produtos/categoria/${categorySlug(c)}`, changeFrequency: "weekly" as const, priority: .65 }));
  return [...base, ...categories, ...productRoutes];
}
