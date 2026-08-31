import type { PriceMode } from "./types";

export type StorefrontArea =
  | "impressoes"
  | "fotos"
  | "acabamentos"
  | "personalizados"
  | "digitais"
  | "papelaria"
  | "recargas"
  | "produtos-digitais";

export type StorefrontAttributes = {
  format?: string;
  weight?: string;
  sides?: string;
  material?: string;
  finish?: string;
  cut?: string;
};

export type StorefrontItem = {
  code: string;
  slug: string | null;
  name: string;
  price: number | null;
  priceMode: PriceMode;
  area: StorefrontArea;
  group: string;
  href?: string;
  meta?: string;
  summary?: string;
  quoteRequired?: boolean;
  attributes?: StorefrontAttributes;
  image?: { url: string; alt: string };
};

export type StorefrontCatalogState = "ready" | "empty" | "error" | "unconfigured";
export type StorefrontCatalogSource = "rpc" | "fixture";

export type StorefrontCatalogSnapshot = {
  state: StorefrontCatalogState;
  source: StorefrontCatalogSource;
  items: StorefrontItem[];
  message?: string;
};
