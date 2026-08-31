import type { StorefrontCatalogSnapshot } from "@/lib/catalog/storefront-types";

export function StorefrontSourceState({ snapshot }: { snapshot: StorefrontCatalogSnapshot }) {
  if (snapshot.state === "ready") {
    if (snapshot.source !== "fixture") return null;
    return (
      <div className="store-source-note" role="note">
        <strong>Modo de teste</strong>
        <span>Esta página está mostrando dados de exemplo, não o catálogo real.</span>
      </div>
    );
  }

  const title = snapshot.state === "error" ? "Catálogo temporariamente indisponível" : snapshot.state === "unconfigured" ? "Catálogo indisponível no momento" : "Nenhum item disponível";
  return (
    <section className="empty-state store-source-state" role={snapshot.state === "error" ? "alert" : "status"}>
      <h2>{title}</h2>
      <p>{snapshot.message || "A JS Gráfica só mostra itens já aprovados pra venda."}</p>
    </section>
  );
}
