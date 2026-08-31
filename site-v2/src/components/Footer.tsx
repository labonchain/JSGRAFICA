import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div><strong>JS Gráfica</strong><p>{siteConfig.locationLabel}</p></div>
        <nav aria-label="Rodapé">
          <Link href="/produtos">Produtos</Link>
          <Link href="/servicos">Serviços</Link>
          <Link href="/personalizados">Personalizados</Link>
        </nav>
        <a href={siteConfig.instagramUrl} target="_blank" rel="noopener noreferrer">{siteConfig.instagramHandle}</a>
      </div>
    </footer>
  );
}
