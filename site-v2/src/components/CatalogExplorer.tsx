"use client";

import { useMemo, useState } from "react";
import type { CatalogProduct, ProductModeType } from "@/lib/catalog/types";
import { labelMode } from "@/lib/catalog/format";
import { ProductCard } from "./ProductCard";

export function CatalogExplorer({ products }: { products: CatalogProduct[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [mode, setMode] = useState("");

  const categories = useMemo(() => [...new Set(products.map((p) => p.categoria))].sort(), [products]);
  const modes = useMemo(
    () => [...new Set(products.flatMap((p) => p.modalidades.filter((m) => m.ativo).map((m) => m.tipo)))].sort() as ProductModeType[],
    [products],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return products.filter((product) => {
      if (category && product.categoria !== category) return false;
      if (mode && !product.modalidades.some((m) => m.ativo && m.tipo === mode)) return false;
      if (!normalized) return true;
      return [product.nome, product.resumo_curto, product.categoria, ...(product.tags ?? [])]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(normalized);
    });
  }, [products, query, category, mode]);

  if (products.length === 0) {
    return (
      <section className="empty-state" role="status">
        <span className="empty-icon" aria-hidden="true">◇</span>
        <h2>Catálogo em preparação</h2>
        <p>Nenhum produto foi liberado para venda pública ainda. A JS Gráfica só exibe itens depois da autorização comercial e editorial.</p>
      </section>
    );
  }

  return (
    <>
      <div className="catalog-controls" aria-label="Busca e filtros do catálogo">
        <label>
          <span>Buscar</span>
          <input value={query} onChange={(e: { target: { value: string } }) => setQuery(e.target.value)} placeholder="Nome, categoria ou termo" />
        </label>
        <label>
          <span>Categoria</span>
          <select value={category} onChange={(e: { target: { value: string } }) => setCategory(e.target.value)}>
            <option value="">Todas</option>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>Tipo</span>
          <select value={mode} onChange={(e: { target: { value: string } }) => setMode(e.target.value)}>
            <option value="">Todos</option>
            {modes.map((item) => <option key={item} value={item}>{labelMode(item)}</option>)}
          </select>
        </label>
      </div>
      {filtered.length ? (
        <div className="grid product-grid">{filtered.map((product) => <ProductCard key={product.sku} product={product} />)}</div>
      ) : (
        <section className="empty-state" role="status">
          <h2>Nenhum resultado</h2>
          <p>Ajuste os filtros ou a busca para ver outros produtos publicados.</p>
        </section>
      )}
    </>
  );
}
