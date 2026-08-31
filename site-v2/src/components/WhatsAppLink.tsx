import type { AnchorHTMLAttributes, PropsWithChildren } from "react";
import { buildWhatsAppUrl } from "@/lib/site";

type Props = PropsWithChildren<{
  message: string;
  className?: string;
}> & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

export function WhatsAppLink({ message, className = "button whatsapp", children, ...props }: Props) {
  return (
    <a href={buildWhatsAppUrl(message)} className={className} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
}
