import type { Metadata } from "next";
import { CatalogExplorer } from "@/components/CatalogExplorer";
import { PromoBanner, type PromoSlide } from "@/components/PromoBanner";
import { getCatalogProducts } from "@/lib/catalog/data";
import { mapCatalogProductToStorefront } from "@/lib/catalog/storefront";
import { buildWhatsAppUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Produtos",
  description: "Catálogo de produtos aprovados da JS Gráfica, prontos pra pedir.",
  alternates: { canonical: "/produtos" },
};

const slides: PromoSlide[] = [
  {
    eyebrow: "Catálogo",
    title: "Produtos aprovados, prontos pra pedir.",
    text: "Preço e prazo claros. O catálogo só mostra o que já foi aprovado pra venda.",
    ctaLabel: "Pedir pelo WhatsApp",
    ctaHref: buildWhatsAppUrl("Olá! Vim pelo site da JS Gráfica e quero ver os produtos do catálogo."),
    image: "/images/servicos/impressao.jpg",
  },
  {
    eyebrow: "Sob encomenda",
    title: "Também fazemos personalizados.",
    text: "Topo de bolo, ímã, caneca e camiseta do jeito que você quiser.",
    ctaLabel: "Ver personalizados",
    ctaHref: "/personalizados",
    image: "/images/produtos/topo-bolo-cr.jpg",
  },
  {
    eyebrow: "Precisa de outra coisa?",
    title: "Impressão, xerox e mais serviços.",
    text: "Encadernação, plastificação, consulta online e recarga de celular também são com a gente.",
    ctaLabel: "Ver serviços",
    ctaHref: "/servicos",
    image: "/images/servicos/xerox.jpg",
  },
];

export default async function ProductsPage() {
  const allProducts = await getCatalogProducts();
  const products = allProducts.filter((product) => mapCatalogProductToStorefront(product)?.area !== "personalizados");
  return (
    <>
      <PromoBanner slides={slides} breadcrumbs={[{ label: "Início", href: "/" }, { label: "Produtos" }]} />
      <section className="section"><div className="container"><CatalogExplorer products={products} /></div></section>
    </>
  );
}
