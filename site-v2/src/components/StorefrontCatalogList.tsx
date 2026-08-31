"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { StorefrontItem } from "@/lib/catalog/storefront-types";
import { formatStorefrontPrice } from "@/lib/catalog/storefront-format";
import { titleCase } from "@/lib/catalog/format";
import { buildWhatsAppUrl } from "@/lib/site";

type SortMode = "az" | "za" | "price-asc" | "price-desc";

type Props = {
  items: StorefrontItem[];
  groups?: string[];
  emptyText?: string;
  searchPlaceholder?: string;
  compact?: boolean;
};

function comparePrice(a: StorefrontItem, b: StorefrontItem, direction: 1 | -1) {
  if (a.price == null && b.price == null) return a.name.localeCompare(b.name, "pt-BR");
  if (a.price == null) return 1;
  if (b.price == null) return -1;
  return (a.price - b.price) * direction;
}

export function StorefrontCatalogList({
  items,
  groups,
  emptyText = "Nenhum item encontrado.",
  searchPlaceholder = "Buscar produto ou serviço...",
  compact = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("Todos");
  const [sort, setSort] = useState<SortMode>("az");

  const availableGroups = useMemo(
    () => groups ?? Array.from(new Set(items.map((item) => item.group))),
    [groups, items],
  );

  const shown = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    const next = items.filter((item) => {
      if (group !== "Todos" && item.group !== group) return false;
      if (!normalized) return true;
      return `${item.name} ${item.meta ?? ""} ${item.code} ${item.group}`
        .toLocaleLowerCase("pt-BR")
        .includes(normalized);
    });
    return [...next].sort((a, b) => {
      if (sort === "az") return a.name.localeCompare(b.name, "pt-BR");
      if (sort === "za") return b.name.localeCompare(a.name, "pt-BR");
      if (sort === "price-asc") return comparePrice(a, b, 1);
      return comparePrice(a, b, -1);
    });
  }, [items, query, group, sort]);

  return (
    <div className={compact ? "store-catalog-live compact" : "store-catalog-live"}>
      <div className="catalog-controls" aria-label="Busca e filtros">
        <label>
          <span>Buscar</span>
          <input
            value={query}
            onChange={(event: { target: { value: string } }) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
          />
        </label>
        <label>
          <span>Filtrar</span>
          <select value={group} onChange={(event: { target: { value: string } }) => setGroup(event.target.value)}>
            <option>Todos</option>
            {availableGroups.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          <span>Ordenar</span>
          <select value={sort} onChange={(event: { target: { value: string } }) => setSort(event.target.value as SortMode)}>
            <option value="az">Nome A–Z</option>
            <option value="za">Nome Z–A</option>
            <option value="price-asc">Menor preço</option>
            <option value="price-desc">Maior preço</option>
          </select>
        </label>
      </div>

      <p className="store-result-count" aria-live="polite">
        {shown.length} {shown.length === 1 ? "item" : "itens"}
      </p>

      <div className="store-product-grid">
        {shown.map((item) => (
          <article className="store-product-card" key={item.code}>
            <div className={item.image ? "store-product-cover has-image" : "store-product-cover"} aria-hidden="true">
              {item.image && <img src={item.image.url} alt="" loading="lazy" />}
              <span>{item.group}</span>
              <b>{titleCase(item.name)}</b>
              {item.meta && <small>{item.meta}</small>}
            </div>
            <div className="store-product-info">
              <small>{item.code}</small>
              <strong>{formatStorefrontPrice(item)}</strong>
              <div>
                {item.href && <Link className="button primary store-button" href={item.href}>Ver detalhes</Link>}
                <a
                  className="button secondary store-button"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={buildWhatsAppUrl(`Olá! Vim pelo site da JS Gráfica e quero pedir ${titleCase(item.name)} (${item.code}). Valor: ${formatStorefrontPrice(item)}.`)}
                >
                  Pedir este serviço
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>

      {!shown.length && <div className="store-catalog-empty">{emptyText}</div>}
    </div>
  );
}
