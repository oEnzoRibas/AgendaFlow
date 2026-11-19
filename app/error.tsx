"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="wrap loading-page"><section className="panel page-empty">
    <h1>Algo saiu do esperado</h1><p>Ocorreu um erro ao carregar esta página.</p>
    <div className="action-row"><Button onClick={reset}>Tentar de novo</Button><Button asChild variant="outline"><Link href="/">Página inicial</Link></Button></div>
  </section></main>;
}
