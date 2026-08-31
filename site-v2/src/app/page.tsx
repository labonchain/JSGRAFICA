import Link from "next/link";
import { ServiceCarousel } from "@/components/ServiceCarousel";
import { ProductCard } from "@/components/ProductCard";
import { getCatalogProducts } from "@/lib/catalog/data";
import { services } from "@/lib/services";
import { siteConfig } from "@/lib/site";

export default async function HomePage() {
  const featured = (await getCatalogProducts({ destaque: true })).slice(0, 3);
  const graficos = services.filter((s) => s.group === "graficos");
  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="eyebrow">{siteConfig.locationLabel}</div>
          <h1>Mais de 10 anos imprimindo os sonhos de quem mora no Ibura e região.</h1>
          <p>Impressão, xerox, fotos e serviços digitais e muito mais!</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading"><h2>O que você precisa agora?</h2></div>
          <div className="grid two">
            <article className="card intent-card"><h3>Preciso de um serviço</h3><p>Impressão, xerox, fotos, plastificação, encadernação e suporte digital.</p><Link href="/servicos">Ver serviços →</Link></article>
            <article className="card intent-card"><h3>Quero ver produtos</h3><p>Catálogo de produtos digitais, personalizados e impressos.</p><Link href="/produtos">Abrir catálogo →</Link></article>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <div className="section-heading"><h2>Gráfica rápida para necessidades reais do dia a dia.</h2></div>
          <ServiceCarousel services={graficos} />
          <p style={{ marginTop: 24 }}><Link href="/servicos" className="text-link">Ver todos os serviços →</Link></p>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-heading"><div className="eyebrow">Produtos</div><h2>Produtos sob medida e personalizados.</h2></div>
            <div className="grid product-grid">{featured.map((product) => <ProductCard key={product.sku} product={product} />)}</div>
          </div>
        </section>
      )}

      <section className="section alt" id="portfolio">
        <div className="container">
          <div className="section-heading"><div className="eyebrow">Como chegar</div><h2>Estamos no Ibura, Recife.</h2></div>
          <div className="map-embed">
            <iframe
              src="https://www.google.com/maps?q=JS+Gr%C3%A1fica+Ibura+Recife&output=embed"
              title="Mapa com a localização da JS Gráfica"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </>
  );
}
