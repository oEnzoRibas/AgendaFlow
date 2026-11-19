import { Studio } from "@/components/studio";
import { makeDemo } from "@/lib/demo";
import { publicClient } from "@/lib/supabase/server";
import { businessSlug } from "@/lib/supabase/config";

export const metadata = { title: "Studio Bloom" };

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ modo?: string }> }) {
  const live = (await searchParams).modo === "real";
  const db = live ? publicClient() : null;
  const result = db ? await db.rpc("booking_catalog", { p_slug: businessSlug() }) : null;
  if (live) return <Studio initial={result?.data ?? null} live failed={Boolean(result?.error)} />;
  const { business, services, professionals, professional_services } = makeDemo();
  return <Studio initial={{ business, services, professionals, professional_services }} live={false} failed={false} />;
}
