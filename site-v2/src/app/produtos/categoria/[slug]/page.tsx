import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductCard } from "@/components/ProductCard";
import { getCatalogProducts } from "@/lib/catalog/data";
import { mapCatalogProductToStorefront } from "@/lib/catalog/storefront";

async function getNonPersonalizedProducts() {
  const all = await getCatalogProducts();
  return all.filter((product) => mapCatalogProductToStorefront(product)?.area !== "personalizados");
}

function normalizeCategorySlug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const all = await getNonPersonalizedProducts();
  const first = all.find((p) => normalizeCategorySlug(p.categoria) === slug);
  if (!first) return { title: "Categoria" };
  return {
    title: first.categoria,
    description: `Produtos publicados da categoria ${first.categoria} na JS Gráfica.`,
    alternates: { canonical: `/produtos/categoria/${slug}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const all = await getNonPersonalizedProducts();
  const products = all.filter((p) => normalizeCategorySlug(p.categoria) === slug);
  if (!products.length) notFound();
  const category = products[0].categoria;
  return (
    <>
      <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Produtos", href: "/produtos" }, { label: category }]} />
      <section className="page-hero container"><div className="eyebrow">Categoria</div><h1>{category}</h1><p>Produtos aprovados da categoria {category}.</p></section>
      <section className="section"><div className="container"><div className="grid product-grid">{products.map((product) => <ProductCard key={product.sku} product={product} />)}</div></div></section>
    </>
  );
}
