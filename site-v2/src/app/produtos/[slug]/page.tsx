import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ProductDecision } from "@/components/ProductDecision";
import { getCatalogProductBySlug } from "@/lib/catalog/data";
import { siteConfig } from "@/lib/site";
import { titleCase } from "@/lib/catalog/format";

const SPEC_LABELS: Record<string, string> = {
  formato: "Formato",
  gramatura: "Gramatura",
  corte: "Corte",
  frente_verso: "Frente/verso",
  material: "Material",
  acabamento: "Acabamento",
};

function specLabel(key: string) {
  return SPEC_LABELS[key] ?? titleCase(key.replace(/_/g, " "));
}

function renderSpec(value: unknown) {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() ? <p>{value}</p> : null;
  if (Array.isArray(value)) {
    if (!value.length) return null;
    return <ul>{value.map((entry, i) => <li key={i}>{typeof entry === "string" ? entry : JSON.stringify(entry)}</li>)}</ul>;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v != null && v !== "");
    if (!entries.length) return null;
    return (
      <dl className="spec-list">
        {entries.map(([key, entryValue]) => (
          <div key={key}>
            <dt>{specLabel(key)}</dt>
            <dd>{typeof entryValue === "string" ? entryValue : JSON.stringify(entryValue)}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCatalogProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado" };
  const cover = product.assets.find((a) => a.tipo === "CAPA") ?? product.assets[0];
  return {
    title: product.seo_title || product.nome,
    description: product.seo_description || product.resumo_curto,
    alternates: { canonical: `/produtos/${product.slug}` },
    openGraph: {
      title: product.seo_title || product.nome,
      description: product.seo_description || product.resumo_curto,
      url: `/produtos/${product.slug}`,
      images: cover ? [{ url: cover.public_url, alt: cover.alt_text, width: cover.largura ?? undefined, height: cover.altura ?? undefined }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getCatalogProductBySlug(slug);
  if (!product) notFound();
  const displayName = titleCase(product.nome);
  const digitalSpec = renderSpec(product.especificacao_digital);
  const fisicaSpec = renderSpec(product.especificacao_fisica);
  const entregaSpec = renderSpec(product.entrega);
  const licencaSpec = renderSpec(product.licenca_direitos);
  return (
    <>
      <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Produtos", href: "/produtos" }, { label: displayName }]} />
      <section className="section"><div className="container product-detail-grid">
        <div className="product-gallery">
          {product.assets.length ? (
            product.assets.map((asset) => <img key={asset.id} src={asset.public_url} alt={asset.alt_text} width={asset.largura ?? 1000} height={asset.altura ?? 1000} loading={asset.tipo === "CAPA" ? "eager" : "lazy"} />)
          ) : (
            <div className="image-placeholder product-gallery-placeholder" aria-hidden="true">JS</div>
          )}
        </div>
        <div className="product-copy">
          <div className="eyebrow">{product.categoria} · {product.sku}</div>
          <h1>{displayName}</h1>
          <p>{product.resumo_curto}</p>
          <p>{product.descricao_publica}</p>
          <ProductDecision product={product} whatsappNumber={siteConfig.whatsappNumber} />
          <div className="spec-grid">
            {digitalSpec && <div className="spec-card"><h3>Especificação digital</h3>{digitalSpec}</div>}
            {fisicaSpec && <div className="spec-card"><h3>Especificação física</h3>{fisicaSpec}</div>}
            {entregaSpec && <div className="spec-card"><h3>Entrega</h3>{entregaSpec}</div>}
            {licencaSpec && <div className="spec-card"><h3>Licença e uso</h3>{licencaSpec}</div>}
          </div>
        </div>
      </div></section>
    </>
  );
}
