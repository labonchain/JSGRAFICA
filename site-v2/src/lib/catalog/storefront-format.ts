import type { StorefrontItem } from "./storefront-types";

export function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatStorefrontPrice(item: Pick<StorefrontItem, "price" | "priceMode">) {
  if (item.priceMode === "SOB_CONSULTA" || item.price == null) return "Sob consulta";
  const formatted = formatBRL(item.price);
  return item.priceMode === "A_PARTIR_DE" ? `A partir de ${formatted}` : formatted;
}
