"use client";

import { useRef } from "react";
import type { Service } from "@/lib/services";
import { ServiceCard } from "./ServiceCard";

export function ServiceCarousel({ services }: { services: Service[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scrollByCards(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const item = track.querySelector<HTMLElement>(".service-carousel-item");
    const amount = (item?.offsetWidth ?? 280) + 20;
    track.scrollBy({ left: amount * direction, behavior: "smooth" });
  }

  return (
    <div className="service-carousel">
      <div className="service-carousel-track" ref={trackRef}>
        {services.map((service) => (
          <div className="service-carousel-item" key={service.name}>
            <ServiceCard service={service} />
          </div>
        ))}
      </div>
      <div className="service-carousel-nav">
        <button type="button" aria-label="Ver serviços anteriores" onClick={() => scrollByCards(-1)}>‹</button>
        <button type="button" aria-label="Ver mais serviços" onClick={() => scrollByCards(1)}>›</button>
      </div>
    </div>
  );
}
