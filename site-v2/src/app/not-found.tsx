import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section"><div className="container empty-state"><h1>Página não encontrada</h1><p>O endereço pode ter mudado ou o produto pode não estar liberado para publicação.</p><Link className="button primary" href="/">Voltar ao início</Link></div></section>
  );
}
