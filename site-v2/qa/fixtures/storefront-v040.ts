import type { StorefrontItem } from "@/lib/catalog/storefront-types";
import fixture from "./storefront-v040.json";

/**
 * QA FIXTURE ONLY — generated mechanically from the approved v0.4.0 storefront snapshot.
 * Never use as a production fallback. The canonical production source remains the read-only RPC layer.
 */
export const storefrontFixtureV040 = fixture as StorefrontItem[];
