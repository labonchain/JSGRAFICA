import Link from "next/link";
import { WhatsAppLink } from "./WhatsAppLink";

export function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label="JS Gráfica, página inicial">
          JS <span>Gráfica</span>
        </Link>
        <nav className="desktop-nav" aria-label="Navegação principal">
          <Link href="/produtos">Produtos</Link>
          <Link href="/servicos">Serviços</Link>
          <Link href="/personalizados">Personalizados</Link>
        </nav>
        <details className="mobile-nav">
          <summary aria-label="Abrir ou fechar menu"><span className="mobile-menu-open">Menu</span><span className="mobile-menu-close">Fechar ×</span></summary>
          <div className="mobile-nav-panel">
            <Link href="/">Início</Link>
            <Link href="/produtos">Produtos</Link>
            <Link href="/servicos">Serviços</Link>
            <Link href="/personalizados">Personalizados</Link>
          </div>
        </details>
        <WhatsAppLink message="Olá! Vim pelo site da JS Gráfica e preciso de atendimento." className="button whatsapp header-cta">
          WhatsApp
        </WhatsAppLink>
      </div>
    </header>
  );
}
