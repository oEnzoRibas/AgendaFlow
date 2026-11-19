import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkspaceView } from "@/components/admin/workspace";
import { isSection, sections } from "@/lib/sections";

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params;
  return { title: isSection(section) ? sections[section] + " · Demonstração" : "Demonstração" };
}

export default async function DemoPage({ params, searchParams }: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ dia?: string; reserva?: string }>;
}) {
  const { section } = await params;
  if (!isSection(section)) notFound();
  const query = await searchParams;
  return <WorkspaceView section={section} initialDay={query.dia} initialBooking={query.reserva} />;
}
