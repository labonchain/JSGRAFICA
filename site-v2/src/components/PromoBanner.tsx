"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Crumb } from "./Breadcrumbs";

export type PromoSlide = {
  eyebrow: string;
  title: string;
  text: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
};

export function PromoBanner({ slides, breadcrumbs }: { slides: PromoSlide[]; breadcrumbs?: Crumb[] }) {
  const [index, setIndex] = useState(0);
  const hoveredRef = useRef(false);

  useEffect(() => {
    if (slides.length < 2) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      if (!hoveredRef.current) setIndex((current) => (current + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) return null;

  return (
    <section
      className="promo-banner"
      aria-roledescription="carrossel"
      onMouseEnter={() => { hoveredRef.current = true; }}
      onMouseLeave={() => { hoveredRef.current = false; }}
    >
      <div className="promo-banner-media" aria-hidden="true">
        {slides.map((slide, i) => (
          <img key={slide.title} src={slide.image} alt="" className={i === index ? "active" : ""} loading={i === 0 ? "eager" : "lazy"} />
        ))}
      </div>

      <div className="promo-banner-inner">
        <div className="container promo-banner-content">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="promo-banner-crumbs" aria-label="Breadcrumb">
              <ol>
                {breadcrumbs.map((item, i) => (
                  <li key={`${item.label}-${i}`}>
                    {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <div className="promo-banner-track">
            {slides.map((slide, i) => (
              <div className={i === index ? "promo-banner-slide active" : "promo-banner-slide"} key={slide.title} aria-hidden={i === index ? undefined : true}>
                <div className="eyebrow">{slide.eyebrow}</div>
                {i === 0 ? <h1>{slide.title}</h1> : <h2>{slide.title}</h2>}
                <p>{slide.text}</p>
                {slide.ctaHref.startsWith("http") ? (
                  <a href={slide.ctaHref} className="button primary" target="_blank" rel="noopener noreferrer">{slide.ctaLabel}</a>
                ) : (
                  <Link href={slide.ctaHref} className="button primary">{slide.ctaLabel}</Link>
                )}
              </div>
            ))}
          </div>
          {slides.length > 1 && (
            <div className="promo-banner-dots" role="tablist" aria-label="Selecionar slide">
              {slides.map((slide, i) => (
                <button
                  key={slide.title}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Ir para slide ${i + 1}: ${slide.title}`}
                  className={i === index ? "active" : ""}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {slides.length > 1 && (
        <div className="promo-banner-nav">
          <button type="button" aria-label="Slide anterior" onClick={() => setIndex((current) => (current - 1 + slides.length) % slides.length)}>‹</button>
          <button type="button" aria-label="Próximo slide" onClick={() => setIndex((current) => (current + 1) % slides.length)}>›</button>
        </div>
      )}
    </section>
  );
}
