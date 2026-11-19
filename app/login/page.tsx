import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { Brand } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { adminContext } from "@/lib/supabase/server";
import { config } from "@/lib/supabase/config";

export const metadata = { title: "Login administrativo", robots: { index: false, follow: false } };

export default async function Login() {
  if (config() && (await adminContext()).business) redirect("/admin/painel");
  return <>
    <header className="site-header"><div className="site-nav wrap"><Brand /><Link className="nav-text" href="/">Página inicial</Link></div></header>
    <main className="wrap login-page">
      <section className="panel login-card"><span className="feature-icon"><LockKeyhole size={22} /></span>
        <h1>Acesso administrativo</h1><p>Entre com a conta vinculada ao seu estabelecimento.</p>
        <LoginForm enabled={Boolean(config())} />
        <div className="login-demo"><p>Conheça o painel do Studio Bloom com dados fictícios.</p>
          <Button asChild variant="outline"><Link href="/demo/painel">Acessar demonstração</Link></Button></div>
      </section>
    </main>
  </>;
}
