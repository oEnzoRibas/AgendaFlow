"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarRange, ExternalLink, Flower2, LayoutDashboard, LogIn,
  LogOut, RotateCcw, Scissors, Settings2, UserRound, UsersRound,
} from "lucide-react";
import { manage, signOut } from "@/app/actions";
import { simulateManagement } from "@/lib/demo";
import { changeDemo, resetDemo, useDemo } from "@/lib/demo-store";
import { manageSchema, type Manage, type Result, type Workspace } from "@/lib/model";
import { sections, type Section } from "@/lib/sections";
import { Brand, Loading } from "../shared";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Overview } from "./overview";
import { Agenda } from "./agenda";
import { Clients, Professionals, Services, Settings } from "./directory";

const icons = { painel: LayoutDashboard, agenda: CalendarRange, clientes: UsersRound,
  servicos: Scissors, profissionais: UserRound, configuracoes: Settings2 };

export type Save = (command: Manage) => Promise<Result>;

/**
 * Renderiza a seção administrativa e encaminha comandos para a demo ou para o servidor.
 * @param props - Seção atual, agenda opcional e workspace previamente autorizado no modo conectado.
 */
export function WorkspaceView({ liveData, section, initialDay, initialBooking }: {
  liveData?: Workspace; section: Section; initialDay?: string; initialBooking?: string;
}) {
  const demoData = useDemo();
  const demo = !liveData;
  const data = liveData ?? demoData;
  const base = demo ? "/demo" : "/admin";
  const [reset, setReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function save(command: Manage): Promise<Result> {
    const parsed = manageSchema.safeParse(command);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
    try {
      if (!demo) return await manage(parsed.data, section);
      return await changeDemo((data) => {
        const result = simulateManagement(data, parsed.data);
        return result.ok ? { ok: true, value: { data: result.value, value: null } } : result;
      });
    } catch { return { ok: false, error: "Não foi possível salvar. Tente novamente." }; }
  }

  const subtitles = {
    painel: "Acompanhe os atendimentos e os números do seu negócio.",
    agenda: "Consulte os horários da equipe e gerencie os agendamentos.",
    clientes: "Organize os contatos e consulte o histórico de atendimentos.",
    servicos: "Defina os serviços, os valores e a duração de cada atendimento.",
    profissionais: "Gerencie a equipe, os serviços oferecidos e a disponibilidade.",
    configuracoes: "Ajuste os dados do salão e as regras de agendamento.",
  };
  const bookingLink = demo ? "/agendar" : "/agendar?modo=real";
  return <div className="admin-shell">
    <aside className="sidebar">
      <div className="side-brand"><Brand /></div>
      <div className="side-workspace"><span><Flower2 size={19} /></span><div><strong>{data?.business.name ?? "Studio Bloom"}</strong>
        <small>{demo ? "Área de demonstração" : "Área administrativa"}</small></div></div>
      <nav className="side-nav" aria-label="Painel">
        {(Object.keys(sections) as Section[]).map((name) => {
          const Icon = icons[name];
          return <Link href={base + "/" + name} key={name} aria-current={name === section ? "page" : undefined}><Icon size={18} />{sections[name]}</Link>;
        })}
      </nav>
      <div className="side-bottom">
        {demo ? <><button className="side-link" type="button" onClick={() => setReset(true)}><RotateCcw size={17} /> Reiniciar demonstração</button>
          <Link className="side-link" href="/login"><LogIn size={17} /> Login administrativo</Link></>
          : <form action={signOut}><button className="side-link" type="submit"><LogOut size={17} /> Encerrar sessão</button></form>}
      </div>
    </aside>
    <div className="admin-area">
      <header className="admin-top"><div><span>{data?.business.name ?? "Studio Bloom"}</span>{demo && <span className="mode-pill">Demonstração</span>}</div>
        <Button asChild variant="outline" size="small"><Link href={bookingLink}><ExternalLink size={15} /> Portal de agendamento</Link></Button>
      </header>
      <main className="admin-content" key={section}>
        <div className="admin-heading"><h1>{sections[section]}</h1><p>{subtitles[section]}</p></div>
        {demo && <p className="demo-notice">Dados fictícios. As alterações ficam neste navegador e são reiniciadas diariamente.</p>}
        {!data ? <Loading /> : section === "painel" ? <Overview data={data} base={base} /> :
          section === "agenda" ? <Agenda data={data} demo={demo} save={save} initialDay={initialDay} initialBooking={initialBooking} /> :
          section === "clientes" ? <Clients data={data} save={save} demo={demo} /> :
          section === "servicos" ? <Services data={data} save={save} /> :
          section === "profissionais" ? <Professionals data={data} save={save} /> :
          <Settings data={data} save={save} />}
      </main>
    </div>
    {reset && <Dialog title="Reiniciar demonstração?" description="Os dados fictícios voltarão ao estado inicial deste dia." close={() => setReset(false)}>
      <div className="action-row dialog-actions"><Button variant="outline" onClick={() => setReset(false)}>Voltar</Button>
        <Button variant="danger" disabled={resetting} onClick={async () => {
          setResetting(true);
          try { await resetDemo(); setReset(false); } finally { setResetting(false); }
        }}>Reiniciar dados fictícios</Button></div>
    </Dialog>}
  </div>;
}
