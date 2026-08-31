"use client";

import { useMemo, useState } from "react";
import type { CatalogProduct, CatalogMode } from "@/lib/catalog/types";
import { formatModePrice, labelMode } from "@/lib/catalog/format";

function waUrl(number: string, message: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function ProductDecision({ product, whatsappNumber }: { product: CatalogProduct; whatsappNumber: string }) {
  const active = product.modalidades.filter((mode) => mode.ativo);
  const [selectedId, setSelectedId] = useState(active[0]?.id ?? 0);
  const selected = useMemo<CatalogMode | undefined>(() => active.find((mode) => mode.id === selectedId) ?? active[0], [active, selectedId]);
  if (!selected) return null;

  const hasChoice = active.length > 1;
  const baseMessage = selected.whatsapp_mensagem?.trim() || `Olá! Vim pelo site e quero saber mais sobre ${product.nome} (${product.sku}).`;
  const defaultMessage = `${baseMessage} Valor: ${formatModePrice(selected)}.`;

  return (
    <section className="decision-panel" aria-labelledby="modalidades-title">
      {hasChoice && (
        <>
          <h2 id="modalidades-title">Escolha uma opção</h2>
          <div className="mode-tabs" role="group" aria-label="Opções disponíveis">
            {active.map((mode) => (
              <button key={mode.id} type="button" className={mode.id === selected.id ? "mode-button active" : "mode-button"} onClick={() => setSelectedId(mode.id)}>
                {labelMode(mode.tipo)}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="mode-detail">
        <strong className="price">{formatModePrice(selected)}</strong>
        <p><b>Prazo:</b> {selected.prazo}</p>
        {selected.orcamento_obrigatorio && <p className="notice">Este pedido exige orçamento antes da confirmação.</p>}
        <a className="button whatsapp full" href={waUrl(whatsappNumber, defaultMessage)} target="_blank" rel="noopener noreferrer">
          Pedir pelo WhatsApp
        </a>
      </div>
    </section>
  );
}
