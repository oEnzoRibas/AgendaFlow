import { Brand, Empty } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Booking } from "@/components/booking";
import { businessSlug } from "@/lib/supabase/config";
import { publicClient } from "@/lib/supabase/server";
import type { Catalog } from "@/lib/model";
import Link from "next/link";

export const metadata = { title: "Agendamento online" };

export default async function BookingPage({ searchParams }: { searchParams: Promise<{ modo?: string; servico?: string }> }) {
  const params = await searchParams;
  const live = params.modo === "real";
  const db = live ? publicClient() : null;
  const result = db ? await db.rpc("booking_catalog", { p_slug: businessSlug() }) : null;
  return <>
    <header className="site-header"><div className="wrap site-nav"><Brand studio label={result?.data?.business.name} href={live ? "/estudio?modo=real" : "/estudio"} />
      <Button variant="outline" size="small" asChild><Link href={live ? "/estudio?modo=real" : "/estudio"}>Ver salão</Link></Button>
    </div></header>
    <main className="wrap booking-page">
      {live && !result?.data ? <div className="panel page-empty"><Empty title="Agendamento online indisponível">
        {result?.error ? "Não foi possível consultar o salão. Tente novamente em instantes." : "Você pode testar o fluxo no salão fictício."}</Empty>
        <Button asChild><Link href="/agendar">Testar demonstração</Link></Button></div>
        : <Booking liveCatalog={result?.data ?? undefined} initialService={params.servico} />}
    </main>
  </>;
}
