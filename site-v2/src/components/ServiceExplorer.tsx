"use client";

import { useMemo, useState } from "react";
import type { Service } from "@/lib/services";
import { ServiceCard } from "./ServiceCard";

const GROUP_LABELS: Record<Service["group"], string> = {
  graficos: "Serviços gráficos",
  digitais: "Serviços digitais",
};

export function ServiceExplorer({ services }: { services: Service[] }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<"" | Service["group"]>("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return services.filter((service) => {
      if (group && service.group !== group) return false;
      if (!normalized) return true;
      return `${service.name} ${service.description}`.toLocaleLowerCase("pt-BR").includes(normalized);
    });
  }, [services, query, group]);

  return (
    <>
      <div className="catalog-controls" aria-label="Busca e filtro de serviços">
        <label>
          <span>Buscar</span>
          <input value={query} onChange={(e: { target: { value: string } }) => setQuery(e.target.value)} placeholder="Nome ou termo do serviço" />
        </label>
        <label>
          <span>Área</span>
          <select value={group} onChange={(e: { target: { value: string } }) => setGroup(e.target.value as "" | Service["group"])}>
            <option value="">Todas</option>
            <option value="graficos">Serviços gráficos</option>
            <option value="digitais">Serviços digitais</option>
          </select>
        </label>
      </div>
      {filtered.length ? (
        (["graficos", "digitais"] as const)
          .filter((g) => !group || group === g)
          .map((g) => {
            const items = filtered.filter((service) => service.group === g);
            if (!items.length) return null;
            return (
              <section className="store-section container" key={g}>
                <div className="store-section-title"><div><h2>{GROUP_LABELS[g]}</h2></div></div>
                <div className="grid three">
                  {items.map((service) => <ServiceCard key={service.name} service={service} />)}
                </div>
              </section>
            );
          })
      ) : (
        <section className="empty-state" role="status">
          <h2>Nenhum resultado</h2>
          <p>Ajuste a busca ou o filtro pra ver outros serviços.</p>
        </section>
      )}
    </>
  );
}
