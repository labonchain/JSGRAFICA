"use client";

import { useMemo, useState } from "react";
import type { StorefrontItem } from "@/lib/catalog/storefront-types";
import { formatStorefrontPrice } from "@/lib/catalog/storefront-format";
import { titleCase } from "@/lib/catalog/format";
import { buildWhatsAppUrl } from "@/lib/site";

export function CoucheSelector({ items }: { items: StorefrontItem[] }) {
  const formats = useMemo(() => Array.from(new Set(items.map((item) => item.attributes?.format).filter(Boolean))) as string[], [items]);
  const weights = useMemo(() => Array.from(new Set(items.map((item) => item.attributes?.weight).filter(Boolean))) as string[], [items]);
  const sidesOptions = useMemo(() => Array.from(new Set(items.map((item) => item.attributes?.sides).filter(Boolean))) as string[], [items]);

  const [format, setFormat] = useState(formats[0] ?? "A4");
  const [weight, setWeight] = useState(weights[0] ?? "90g");
  const [sides, setSides] = useState(sidesOptions[0] ?? "só frente");

  const selected = items.find((item) =>
    item.attributes?.format === format
    && item.attributes?.weight === weight
    && item.attributes?.sides === sides,
  );

  return (
    <section className="store-variant-panel" aria-label="Seleção de variante Papel Couchê">
      <VariantStep label="1. Formato" values={formats} selected={format} onSelect={setFormat} />
      <VariantStep label="2. Gramatura" values={weights} selected={weight} onSelect={setWeight} />
      <VariantStep label="3. Impressão" values={sidesOptions} selected={sides} onSelect={setSides} />
      {selected ? (
        <div className="store-variant-result" aria-live="polite">
          <small>{selected.code}</small>
          <h2>{titleCase(selected.name)}</h2>
          <strong>{formatStorefrontPrice(selected)}</strong>
          <a
            className="button whatsapp"
            target="_blank"
            rel="noopener noreferrer"
            href={buildWhatsAppUrl(`Olá! Vim pelo site da JS Gráfica e quero pedir ${titleCase(selected.name)} (${selected.code}). Valor: ${formatStorefrontPrice(selected)}.`)}
          >
            Pedir pelo WhatsApp
          </a>
        </div>
      ) : (
        <div className="store-catalog-empty" role="status">Essa combinação não está disponível no momento.</div>
      )}
    </section>
  );
}

function VariantStep({ label, values, selected, onSelect }: { label: string; values: string[]; selected: string; onSelect: (value: string) => void }) {
  return (
    <div className="store-variant-step">
      <b>{label}</b>
      <div>
        {values.map((value) => (
          <button key={value} type="button" className={selected === value ? "active" : ""} onClick={() => onSelect(value)}>
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
