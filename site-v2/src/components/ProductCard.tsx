import Link from "next/link";
import type { CatalogProduct } from "@/lib/catalog/types";
import { formatModePrice, labelMode, titleCase } from "@/lib/catalog/format";
import { mapCatalogProductToStorefront } from "@/lib/catalog/storefront";

export function ProductCard({ product }: { product: CatalogProduct }) {
  const cover = product.assets.find((asset) => asset.tipo === "CAPA") ?? product.assets[0];
  const firstMode = product.modalidades.find((mode) => mode.ativo);
  const displayName = titleCase(product.nome);
  const eyebrow = mapCatalogProductToStorefront(product)?.group ?? product.categoria;
  return (
    <article className="card product-card">
      <Link href={`/produtos/${product.slug}`} className="product-image-wrap" aria-label={`Ver ${displayName}`}>
        {cover ? (
          <img
            src={cover.public_url}
            alt={cover.alt_text}
            width={cover.largura ?? 800}
            height={cover.altura ?? 800}
            loading="lazy"
          />
        ) : (
          <div className="image-placeholder" aria-hidden="true">JS</div>
        )}
      </Link>
      <div className="product-card-body">
        <div className="eyebrow">{eyebrow}</div>
        <h3><Link href={`/produtos/${product.slug}`}>{displayName}</Link></h3>
        <p>{product.resumo_curto}</p>
        {firstMode && (
          <div className="product-meta">
            <span>{labelMode(firstMode.tipo)}</span>
            <strong>{formatModePrice(firstMode)}</strong>
          </div>
        )}
        <Link href={`/produtos/${product.slug}`} className="text-link">Ver produto →</Link>
      </div>
    </article>
  );
}
