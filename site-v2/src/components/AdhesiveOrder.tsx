"use client";

import { useMemo, useState } from "react";
import type { StorefrontItem } from "@/lib/catalog/storefront-types";
import { formatStorefrontPrice } from "@/lib/catalog/storefront-format";
import { titleCase } from "@/lib/catalog/format";
import { buildWhatsAppUrl } from "@/lib/site";

export function AdhesiveOrder({ items }: { items: StorefrontItem[] }) {
  const options = useMemo(() => items.filter((item) => item.attributes?.format === "A4" && item.attributes?.weight === "192g"), [items]);
  const [selectedCode, setSelectedCode] = useState(options[0]?.code ?? "");
  const [quantity, setQuantity] = useState(1);
  const selected = options.find((item) => item.code === selectedCode) ?? options[0];

  if (!selected) {
    return <div className="store-catalog-empty" role="status">As opções A4 192g não estão disponíveis no momento.</div>;
  }

  return (
    <section className="store-order-panel" aria-label="Opções do serviço">
      <fieldset>
        <legend>Acabamento / opção</legend>
        {options.map((item) => (
          <label key={item.code}>
            <input type="radio" name="adhesive-option" checked={selected.code === item.code} onChange={() => setSelectedCode(item.code)} />
            <span><span>{item.attributes?.cut ?? item.name}</span><b>{formatStorefrontPrice(item)}</b></span>
          </label>
        ))}
      </fieldset>
      <label className="store-quantity-field">
        Quantidade a informar
        <input type="number" min="1" value={quantity} onChange={(event: { target: { value: string } }) => setQuantity(Math.max(1, Number(event.target.value) || 1))} />
      </label>
      <div className="store-order-total"><span>Valor unitário</span><strong>{formatStorefrontPrice(selected)}</strong></div>
      <a
        className="button whatsapp full"
        target="_blank"
        rel="noopener noreferrer"
        href={buildWhatsAppUrl(`Olá! Vim pelo site da JS Gráfica e quero pedir ${titleCase(selected.name)} (${selected.code}), quantidade ${quantity}. Valor unitário: ${formatStorefrontPrice(selected)}.`)}
      >
        Pedir pelo WhatsApp
      </a>
    </section>
  );
}
