"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Clock3, Scissors } from "lucide-react";
import { useDemo } from "@/lib/demo-store";
import type { Catalog } from "@/lib/model";
import { money } from "@/lib/schedule";
import { Brand } from "./shared";
import { Button } from "./ui/button";

export function Studio({ initial, live, failed }: { initial: Catalog | null; live: boolean; failed: boolean }) {
  const demo = useDemo();
  const catalog = (live ? initial : demo ?? initial);
  const venue = catalog?.business.name ?? "Studio Bloom";
  const services = catalog?.business.public_booking ? catalog.services.filter((service) => service.active) : [];
  const link = live ? "/agendar?modo=real" : "/agendar";
  const studioLink = live ? "/estudio?modo=real" : "/estudio";
  return <>
    <header className="site-header"><div className="wrap site-nav"><Brand studio label={venue} href={studioLink} /><nav aria-label="Studio">
      <Link className="nav-text" href="/">AgendaFlow</Link><Button asChild size="small"><Link href={link}>Agendar horário</Link></Button>
    </nav></div></header>
    <main className="wrap studio-page">
      <section className="studio-hero">
        <div className="studio-copy">
          <span className="kicker">{live ? "AGENDA ONLINE" : "SALÃO DEMONSTRATIVO"}</span>
          <h1>{venue}</h1>
          <p>{catalog?.business.description || "Consulte os serviços e horários do salão."}</p>
          <Button asChild><Link href={link}><CalendarDays size={18} /> Escolher serviço e horário</Link></Button>
        </div>
        <div className="studio-image"><Image src="/studio-bloom.webp" alt="Interior do salão com espelhos em arco e cadeiras de atendimento" fill priority sizes="(max-width: 760px) 100vw, 58vw" /></div>
      </section>
      <section className="studio-services" aria-labelledby="catalogo"><span className="kicker">CATÁLOGO</span><h2 id="catalogo">Serviços do salão</h2>
        {services.length ? <div className="studio-grid">{services.map((service) =>
          <article className="panel feature" key={service.id}>
            <span className="feature-icon"><Scissors size={21} /></span>
            <h3>{service.name}</h3><p>{service.description}</p>
            <div className="studio-price"><strong>{money(service.price_cents)}</strong><span><Clock3 size={16} /> {service.duration_minutes} min</span></div>
            <Button variant="outline" asChild><Link href={link + (live ? "&" : "?") + "servico=" + service.id}>Agendar {service.name}</Link></Button>
          </article>)}</div> : <p>{failed ? "Não foi possível carregar o catálogo." : "O catálogo online está indisponível."}</p>}
      </section>
    </main>
  </>;
}
