import "server-only";
import type { Database } from "./database";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Business, Workspace } from "../model";
import { businessSlug, config } from "./config";

export function publicClient() {
  const settings = config();
  return settings ? createClient<Database>(settings.url, settings.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  }) : null;
}

export async function sessionClient() {
  const settings = config();
  if (!settings) return null;
  const store = await cookies();
  return createServerClient<Database>(settings.url, settings.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try { values.forEach(({ name, value, options }) => store.set(name, value, options)); }
        catch { /* Proxy refreshes cookies during page rendering. */ }
      },
    },
  });
}

export async function adminContext() {
  const db = await sessionClient();
  if (!db) return { db: null, business: null, signedIn: false };
  const { data } = await db.auth.getClaims();
  if (!data?.claims.sub) return { db, business: null, signedIn: false };
  const { data: business, error } = await db.from("businesses")
    .select("id, slug, name, description, timezone, buffer_minutes, public_booking")
    .eq("slug", businessSlug()).maybeSingle<Business>();
  if (error) throw new Error("Não foi possível carregar o estabelecimento.");
  return { db, business, signedIn: true };
}

type Session = NonNullable<Awaited<ReturnType<typeof sessionClient>>>;

async function rows<T>(db: Session, business: Business, table: Exclude<keyof Database["public"]["Tables"], "businesses">, fields: string, order = ["id"]): Promise<T[]> {
  const pageSize = 500;
  const result: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    let query = db.from(table).select(fields).eq("business_id", business.id);
    for (const field of order) query = query.order(field);
    const { data, error } = await query.range(offset, offset + pageSize - 1);
    if (error) throw new Error("Não foi possível carregar os dados do painel.");
    result.push(...(data as unknown as T[]));
    if (data.length < pageSize) return result;
  }
}

export async function getWorkspace(db: Session, business: Business): Promise<Workspace> {
  const [services, professionals, clients, appointments, professional_services, availability_rules, blocked_periods] = await Promise.all([
    rows<Workspace["services"][number]>(db, business, "services", "id, name, description, duration_minutes, price_cents, active"),
    rows<Workspace["professionals"][number]>(db, business, "professionals", "id, name, specialty, active"),
    rows<Workspace["clients"][number]>(db, business, "clients", "id, name, email, phone"),
    rows<Workspace["appointments"][number]>(db, business, "appointments", "id, professional_id, service_id, client_id, starts_at, ends_at, busy_until, price_cents, status"),
    rows<Workspace["professional_services"][number]>(db, business, "professional_services", "professional_id, service_id", ["professional_id", "service_id"]),
    rows<Workspace["availability_rules"][number]>(db, business, "availability_rules", "professional_id, weekday, opens_at, closes_at"),
    rows<Workspace["blocked_periods"][number]>(db, business, "blocked_periods", "id, professional_id, starts_at, ends_at, reason"),
  ]);
  return { business, services, professionals, clients, appointments, professional_services, blocked_periods,
    availability_rules: availability_rules.map((rule) => ({ ...rule, opens_at: rule.opens_at.slice(0, 5), closes_at: rule.closes_at.slice(0, 5) })),
  };
}
