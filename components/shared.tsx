import Link from "next/link";
import { CalendarDays, Flower2, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

export function Brand({ studio = false, label, href }: { studio?: boolean; label?: string; href?: string }) {
  const Icon = studio ? Flower2 : CalendarDays;
  return <Link href={href ?? (studio ? "/estudio" : "/")} className={studio ? "brand brand-studio" : "brand"}>
    <span className="brand-mark"><Icon size={20} strokeWidth={2.1} /></span>
    <span>{label ?? (studio ? "Studio Bloom" : "AgendaFlow")}</span>
  </Link>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty"><span className="empty-icon"><CalendarDays size={21} /></span><strong>{title}</strong>{children && <p>{children}</p>}</div>;
}

export function Loading({ children = "Carregando…" }: { children?: ReactNode }) {
  return <div className="loading" role="status"><LoaderCircle size={19} className="animate-spin" />{children}</div>;
}

export function Alert({ children }: { children: ReactNode }) {
  return children ? <p className="error-message" role="alert">{children}</p> : null;
}
