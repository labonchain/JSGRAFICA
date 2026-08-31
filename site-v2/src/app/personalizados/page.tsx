import type { Metadata } from "next";
import { PromoBanner, type PromoSlide } from "@/components/PromoBanner";
import { StorefrontCatalogList } from "@/components/StorefrontCatalogList";
import { StorefrontSourceState } from "@/components/StorefrontSourceState";
import { filterStorefrontArea, getStorefrontCatalog } from "@/lib/catalog/repository";
import { buildWhatsAppUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Personalizados e Comunicação Visual",
  description: "Personalizados, criação, topos de bolo, adesivos, banners e comunicação visual da JS Gráfica.",
  alternates: { canonical: "/personalizados" },
};

const slides: PromoSlide[] = [
  {
    eyebrow: "Personalizados / Comunicação Visual",
    title: "Sua ideia, do seu jeito",
    text: "Escolha uma oferta pública e envie o pedido para personalização ou orçamento pelo WhatsApp contextual.",
    ctaLabel: "Pedir pelo WhatsApp",
    ctaHref: buildWhatsAppUrl("Olá! Vim pelo site da JS Gráfica e quero fazer um personalizado."),
    image: "/images/produtos/caneca.jpg",
  },
  {
    eyebrow: "Sob encomenda",
    title: "Topo de bolo, ímã, caneca e camiseta.",
    text: "Banner, lona e adesivo também entram na lista de personalizados.",
    ctaLabel: "Pedir pelo WhatsApp",
    ctaHref: buildWhatsAppUrl("Olá! Vim pelo site da JS Gráfica e quero saber mais sobre os personalizados."),
    image: "/images/produtos/topo-bolo-sr.jpg",
  },
  {
    eyebrow: "Não tem a arte pronta?",
    title: "A gente cria pra você.",
    text: "Criação de arte, seguida da impressão ou do acabamento que você precisar.",
    ctaLabel: "Ver serviços",
    ctaHref: "/servicos",
    image: "/images/produtos/criar-arte.jpg",
  },
];

export default async function PersonalizedPage() {
  const snapshot = await getStorefrontCatalog();
  const items = filterStorefrontArea(snapshot.items, "personalizados");
  return (
    <>
      <PromoBanner slides={slides} breadcrumbs={[{ label: "Início", href: "/" }, { label: "Personalizados" }]} />
      <section className="store-section store-catalog-section container">
        <StorefrontSourceState snapshot={snapshot} />
        {snapshot.state === "ready" && <StorefrontCatalogList items={items} searchPlaceholder="Buscar personalizado ou comunicação visual..." />}
      </section>
    </>
  );
}
