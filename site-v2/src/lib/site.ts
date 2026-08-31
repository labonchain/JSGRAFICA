const env = process.env;

export const siteConfig = {
  name: "JS Gráfica",
  title: "JS Gráfica Rápida, Ibura, Recife",
  description:
    "Gráfica rápida no Ibura, Recife. Serviços gráficos, serviços digitais e catálogo de produtos aprovados da JS Gráfica.",
  siteUrl: (env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  stage: env.NEXT_PUBLIC_SITE_STAGE || "preview",
  whatsappNumber: env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5581986108547",
  instagramUrl: env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/js.grafica/",
  instagramHandle: env.NEXT_PUBLIC_INSTAGRAM_HANDLE || "@js.grafica",
  locationLabel: env.NEXT_PUBLIC_LOCATION_LABEL || "Ibura, Recife, PE",
  storageBucket: env.NEXT_PUBLIC_CATALOG_STORAGE_BUCKET || "catalogo-publico",
};

export function buildWhatsAppUrl(message: string) {
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
