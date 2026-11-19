export function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

export const businessSlug = () => process.env.AGENDAFLOW_BUSINESS_SLUG || "studio-bloom";
