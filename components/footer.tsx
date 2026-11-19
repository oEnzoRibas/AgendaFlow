"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UsersRound } from "lucide-react";
import { Brand } from "./shared";

const developerUrl = "https://github.com/oEnzoRibas";

/** Mantém o crédito em todas as rotas e preserva os atalhos do rodapé da landing. */
export function Footer() {
  const isHome = usePathname() === "/";

  return <footer className={isHome ? "site-footer" : "site-footer site-footer-compact"}>
    <div className="wrap">
      {isHome && <><Brand /><span>Plataforma demonstrativa de agendamentos</span></>}
      <p className="developer-credit" lang="en">
        Developed by <a href={developerUrl} target="_blank" rel="noopener noreferrer">oEnzoRibas</a>
      </p>
      {isHome && <Link href="/demo/clientes"><UsersRound size={16} /> Clientes da demonstração</Link>}
    </div>
  </footer>;
}
