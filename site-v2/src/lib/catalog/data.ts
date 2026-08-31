import "server-only";
import type { CatalogProduct } from "./types";

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

type ListFilters = {
  categoria?: string | null;
  modalidade?: string | null;
  destaque?: boolean | null;
};

export type CatalogRpcStatus = "ready" | "unconfigured" | "error";
export type CatalogRpcResult<T> = {
  status: CatalogRpcStatus;
  data: T;
  message?: string;
};

export function isCatalogRpcConfigured() {
  return Boolean(supabaseUrl && publishableKey);
}

async function callRpc<T>(name: string, body: Record<string, unknown>): Promise<CatalogRpcResult<T | null>> {
  if (!isCatalogRpcConfigured()) {
    return {
      status: "unconfigured",
      data: null,
      message: "Catálogo indisponível no momento.",
    };
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: {
        apikey: publishableKey!,
        Authorization: `Bearer ${publishableKey!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      next: { revalidate: 60 },
    });
    if (!response.ok) {
      console.error(`[catalog] RPC ${name} failed: ${response.status}`);
      return {
        status: "error",
        data: null,
        message: `Falha de leitura do catálogo (${response.status}).`,
      };
    }
    return { status: "ready", data: (await response.json()) as T };
  } catch (error) {
    console.error(`[catalog] RPC ${name} network error`, error);
    return {
      status: "error",
      data: null,
      message: "Falha de comunicação com o catálogo.",
    };
  }
}

export async function getCatalogProductsResult(filters: ListFilters = {}): Promise<CatalogRpcResult<CatalogProduct[]>> {
  const result = await callRpc<unknown>("jsgrafica_catalogo_listar", {
    p_categoria: filters.categoria ?? null,
    p_modalidade: filters.modalidade ?? null,
    p_destaque: filters.destaque ?? null,
  });
  if (result.status !== "ready") return { ...result, data: [] };
  if (!Array.isArray(result.data)) {
    return { status: "error", data: [], message: "Resposta inválida da RPC jsgrafica_catalogo_listar." };
  }
  return { status: "ready", data: result.data as CatalogProduct[] };
}

export async function getCatalogProductBySlugResult(slug: string): Promise<CatalogRpcResult<CatalogProduct | null>> {
  const result = await callRpc<unknown>("jsgrafica_catalogo_por_slug", { p_slug: slug });
  if (result.status !== "ready") return { ...result, data: null };
  if (!result.data) return { status: "ready", data: null };
  if (Array.isArray(result.data) || typeof result.data !== "object") {
    return { status: "error", data: null, message: "Resposta inválida da RPC jsgrafica_catalogo_por_slug." };
  }
  return { status: "ready", data: result.data as CatalogProduct };
}

// API compatível com v0.3.0 para as rotas já existentes.
export async function getCatalogProducts(filters: ListFilters = {}): Promise<CatalogProduct[]> {
  return (await getCatalogProductsResult(filters)).data;
}

export async function getCatalogProductBySlug(slug: string): Promise<CatalogProduct | null> {
  return (await getCatalogProductBySlugResult(slug)).data;
}
