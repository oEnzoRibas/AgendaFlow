import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { config as supabaseConfig } from "@/lib/supabase/config";

/**
 * Refresca a sessão Supabase nas rotas de login e administração.
 * Propaga cookies para o render atual e para o navegador. A autorização do painel é verificada na rota e no banco.
 * @param request - Requisição que corresponde ao matcher.
 * @returns Resposta com cookies atualizados quando necessário e cache privado desabilitado.
 */
export async function proxy(request: NextRequest) {
  const settings = supabaseConfig();
  let response = NextResponse.next({ request });
  if (settings) {
    const db = createServerClient(settings.url, settings.key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    await db.auth.getClaims();
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/admin/:path*", "/login"] };
