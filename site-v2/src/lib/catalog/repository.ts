import "server-only";
import { getCatalogProductBySlugResult, getCatalogProductsResult } from "./data";
import { mapCatalogProductToStorefront, mapCatalogProductsToStorefront } from "./storefront";
import type { StorefrontCatalogSnapshot, StorefrontItem } from "./storefront-types";
import { siteConfig } from "@/lib/site";

const fixtureRequested = process.env.CATALOG_QA_FIXTURE === "1";

function fixtureForbiddenInProduction() {
  return fixtureRequested && siteConfig.stage === "production";
}

async function loadFixture(): Promise<StorefrontItem[]> {
  const fixture = await import("../../../qa/fixtures/storefront-v040");
  return fixture.storefrontFixtureV040;
}

export async function getStorefrontCatalog(): Promise<StorefrontCatalogSnapshot> {
  if (fixtureForbiddenInProduction()) {
    return {
      state: "error",
      source: "rpc",
      items: [],
      message: "Fixture de QA recusada em ambiente production.",
    };
  }

  if (fixtureRequested) {
    return {
      state: "ready",
      source: "fixture",
      items: await loadFixture(),
      message: "Fixture isolada de QA baseada no recorte aprovado do v0.4.0.",
    };
  }

  const result = await getCatalogProductsResult();
  if (result.status === "unconfigured") {
    return {
      state: "unconfigured",
      source: "rpc",
      items: [],
      message: result.message,
    };
  }
  if (result.status === "error") {
    return {
      state: "error",
      source: "rpc",
      items: [],
      message: result.message,
    };
  }

  const items = mapCatalogProductsToStorefront(result.data);
  return {
    state: items.length ? "ready" : "empty",
    source: "rpc",
    items,
    message: items.length ? undefined : "Nenhum item público compatível foi retornado pelo read-model.",
  };
}

export async function getStorefrontItemBySlug(slug: string): Promise<StorefrontItem | null> {
  if (fixtureForbiddenInProduction()) return null;
  if (fixtureRequested) {
    const fixture = await loadFixture();
    return fixture.find((item) => item.slug === slug) ?? null;
  }
  const result = await getCatalogProductBySlugResult(slug);
  if (result.status !== "ready" || !result.data) return null;
  return mapCatalogProductToStorefront(result.data);
}

export function filterStorefrontArea(items: StorefrontItem[], area: StorefrontItem["area"]) {
  if (area === "impressoes") {
    return items.filter((item) => item.area === "impressoes" || item.group === "Papel Fotográfico");
  }
  return items.filter((item) => item.area === area);
}

export function filterStorefrontGroup(items: StorefrontItem[], group: string) {
  return items.filter((item) => item.group === group);
}
