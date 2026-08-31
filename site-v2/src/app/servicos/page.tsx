import type { Metadata } from "next";
import { PromoBanner, type PromoSlide } from "@/components/PromoBanner";
import { ServiceExplorer } from "@/components/ServiceExplorer";
import { services } from "@/lib/services";
import { buildWhatsAppUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Serviços",
  description: "Serviços de impressão, fotos, acabamentos, documentos, consultas e recargas da JS Gráfica.",
  alternates: { canonical: "/servicos" },
};

const slides: PromoSlide[] = [
  {
    eyebrow: "Atendimento da JS Gráfica",
    title: "Serviços",
    text: "Peça pelo WhatsApp qualquer um dos serviços abaixo, já com o pedido identificado.",
    ctaLabel: "Pedir pelo WhatsApp",
    ctaHref: buildWhatsAppUrl("Olá! Vim pelo site da JS Gráfica e quero saber mais sobre os serviços."),
    image: "/images/servicos/xerox.jpg",
  },
  {
    eyebrow: "Rápido, no Ibura",
    title: "Impressão, xerox e acabamento com prazo combinado.",
    text: "Encadernação e plastificação também saem no mesmo atendimento.",
    ctaLabel: "Pedir pelo WhatsApp",
    ctaHref: buildWhatsAppUrl("Olá! Vim pelo site da JS Gráfica e quero pedir um serviço de impressão."),
    image: "/images/servicos/impressao.jpg",
  },
  {
    eyebrow: "Também temos",
    title: "Produtos e personalizados prontos.",
    text: "Catálogo aprovado com preço e prazo já definidos, ou sob encomenda do seu jeito.",
    ctaLabel: "Ver produtos",
    ctaHref: "/produtos",
    image: "/images/produtos/camisa.jpg",
  },
];

export default function ServicesPage() {
  return (
    <>
      <PromoBanner slides={slides} breadcrumbs={[{ label: "Início", href: "/" }, { label: "Serviços" }]} />
      <ServiceExplorer services={services} />
    </>
  );
}
