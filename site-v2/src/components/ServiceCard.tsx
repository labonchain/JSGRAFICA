import Link from "next/link";
import type { Service } from "@/lib/services";

export function ServiceCard({ service }: { service: Service }) {
  return (
    <article className="card service-card">
      {service.image ? (
        <Link href={`/servicos/${service.slug}`} className="service-card-image" aria-label={`Ver ${service.name}`}>
          <img src={service.image} alt={service.name} loading="lazy" />
        </Link>
      ) : (
        <span className="service-icon" aria-hidden="true">{service.icon}</span>
      )}
      <h3><Link href={`/servicos/${service.slug}`}>{service.name}</Link></h3>
      <p>{service.description}</p>
      <Link href={`/servicos/${service.slug}`} className="text-link">
        Ver serviço →
      </Link>
    </article>
  );
}
