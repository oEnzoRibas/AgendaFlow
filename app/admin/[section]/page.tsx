import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "@/app/actions";
import { WorkspaceView } from "@/components/admin/workspace";
import { Brand } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { adminContext, getWorkspace } from "@/lib/supabase/server";
import { isSection, sections } from "@/lib/sections";

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params;
  return { title: isSection(section) ? sections[section] : "Administração", robots: { index: false, follow: false } };
}

export default async function AdminPage({ params, searchParams }: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ dia?: string; reserva?: string }>;
}) {
  const { section } = await params;
  if (!isSection(section)) notFound();
  const { db, business, signedIn } = await adminContext();
  if (!db || !signedIn) redirect("/login");
  if (!business) return <main className="wrap loading-page"><section className="panel page-empty">
    <Brand /><h1>Acesso ao estabelecimento</h1><p>Esta conta ainda não está vinculada ao estabelecimento configurado.</p>
    <div className="action-row"><form action={signOut}><Button type="submit">Sair</Button></form>
      <Button asChild variant="outline"><Link href="/demo/painel">Explorar demonstração</Link></Button></div>
  </section></main>;
  const query = await searchParams;
  const data = await getWorkspace(db, business);
  return <WorkspaceView section={section} liveData={data} initialDay={query.dia} initialBooking={query.reserva} />;
}
