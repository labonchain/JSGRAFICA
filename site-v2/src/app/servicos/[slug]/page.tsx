import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { getServiceBySlug, services } from "@/lib/services";

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return { title: "Serviço não encontrado" };
  return {
    title: service.name,
    description: service.description,
    alternates: { canonical: `/servicos/${service.slug}` },
  };
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();
  return (
    <>
      <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Serviços", href: "/servicos" }, { label: service.name }]} />
      <section className="section"><div className="container product-detail-grid">
        <div className="product-gallery">
          {service.image ? (
            <img src={service.image} alt={service.name} width={1200} height={750} loading="eager" />
          ) : (
            <div className="image-placeholder product-gallery-placeholder" aria-hidden="true">JS</div>
          )}
        </div>
        <div className="product-copy">
          <div className="eyebrow">Serviço</div>
          <h1>{service.name}</h1>
          <p>{service.description}</p>
          <section className="decision-panel">
            <div className="mode-detail">
              <p><b>Prazo:</b> confirmado no atendimento pelo WhatsApp.</p>
              <WhatsAppLink message={`Olá! Vim pelo site e preciso de ${service.whatsappContext}.`} className="button whatsapp full">
                Pedir pelo WhatsApp
              </WhatsAppLink>
            </div>
          </section>
        </div>
      </div></section>
    </>
  );
}
