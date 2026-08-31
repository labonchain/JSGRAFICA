import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contato",
  description: "Fale com a JS Gráfica pelo WhatsApp ou Instagram. Atendimento no Ibura, Recife.",
  alternates: { canonical: "/contato" },
};

export default function ContactPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Contato" }]} />
      <section className="page-hero container"><div className="eyebrow">Contato</div><h1>Fale com a JS Gráfica.</h1><p>Atendemos no Ibura, Recife. O jeito mais rápido de falar com a gente é pelo WhatsApp.</p></section>
      <section className="section"><div className="container contact-grid">
        <article className="card contact-card"><h2>WhatsApp</h2><p>Canal principal de atendimento e pedidos do site.</p><WhatsAppLink message="Olá! Vim pela página de contato do site da JS Gráfica." className="button whatsapp">Iniciar conversa</WhatsAppLink></article>
        <article className="card contact-card"><h2>Instagram</h2><p>{siteConfig.instagramHandle}</p><a href={siteConfig.instagramUrl} className="button secondary" target="_blank" rel="noopener noreferrer">Abrir Instagram</a></article>
        <article className="card contact-card"><h2>Localização</h2><p>{siteConfig.locationLabel}</p><p>Endereço completo e mapa chegam em breve.</p></article>
        <article className="card contact-card"><h2>Horários</h2><p>Horários de funcionamento chegam em breve.</p></article>
      </div></section>
    </>
  );
}
