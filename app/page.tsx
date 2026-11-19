import Link from "next/link";
import { CalendarDays, CalendarRange, ChartNoAxesCombined, Clock3, Globe2, LayoutDashboard, Scissors } from "lucide-react";
import { Brand } from "@/components/shared";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Globe2, title: "Portal de agendamento", text: "Seus clientes escolhem serviço, profissional e horário em poucos passos." },
  { icon: CalendarRange, title: "Agenda da equipe", text: "Veja os atendimentos do dia ou da semana, com filtros por profissional." },
  { icon: ChartNoAxesCombined, title: "Indicadores do negócio", text: "Acompanhe o volume de agendamentos, os clientes e a receita estimada." },
];

const examples = [
  { person: "Camila Duarte", service: "Corte & styling", time: "09:00", color: "violet" },
  { person: "Rafa Santos", service: "Escova modeladora", time: "11:00", color: "rose" },
  { person: "Marina Costa", service: "Manicure", time: "14:00", color: "mint" },
];

export default function Home() {
  return <>
    <header className="site-header"><div className="wrap site-nav">
      <Brand />
      <nav aria-label="Principal">
        <Link className="nav-text" href="#recursos">Recursos</Link>
        <Link className="nav-text" href="/estudio">Studio Bloom</Link>
        <Button asChild variant="outline" size="small"><Link href="/login">Entrar</Link></Button>
      </nav>
    </div></header>
    <main>
      <section className="wrap landing-hero">
        <div className="hero-copy">
          <span className="eyebrow"><span /> Agendamentos para pequenos negócios</span>
          <h1>Cuide do seu negócio.<br /><em>Organize sua agenda.</em></h1>
          <p>Ofereça agendamento online aos seus clientes e gerencie a agenda, os serviços e a equipe em um só lugar.</p>
          <div className="action-row">
            <Button asChild><Link href="/demo/painel"><LayoutDashboard size={17} /> Explorar demonstração</Link></Button>
            <Button asChild variant="outline"><Link href="/estudio"><CalendarDays size={17} /> Visitar Studio Bloom</Link></Button>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="visual-grid" />
          <div className="preview">
            <div className="preview-top"><span className="preview-logo"><CalendarDays size={17} /></span><strong>Studio Bloom</strong><span className="preview-demo">Demonstração</span></div>
            <div className="preview-body">
              <div className="preview-title"><div><span>AGENDA DA EQUIPE</span><b>Atendimentos do dia</b></div><CalendarRange size={22} /></div>
              {examples.map((entry) => <div className="preview-entry" key={entry.person}>
                <span className="preview-hour"><Clock3 size={13} />{entry.time}</span>
                <span className={"preview-avatar " + entry.color}>{entry.person.split(" ").map((word) => word[0]).join("")}</span>
                <div><strong>{entry.person}</strong><small>{entry.service}</small></div><span className="status confirmed">Confirmado</span>
              </div>)}
            </div>
          </div>
          <div className="visual-note"><span><CalendarDays size={18} /></span><div><strong>Reserva confirmada</strong><small>Corte & styling · 09:00</small></div></div>
        </div>
      </section>
      <section className="features-band" id="recursos"><div className="wrap">
        <div className="features-heading"><span className="kicker">DO AGENDAMENTO À GESTÃO</span><h2>Uma agenda para clientes e equipe</h2></div>
        <div className="feature-grid">{features.map(({ icon: Icon, title, text }) =>
          <article key={title} className="panel feature"><span className="feature-icon"><Icon size={23} /></span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </div></section>
      <section className="wrap landing-cta"><div><h2>Experimente com o Studio Bloom</h2><p>Faça uma reserva fictícia e veja o atendimento aparecer no painel da equipe.</p></div>
        <Button asChild><Link href="/agendar"><Scissors size={17} /> Simular agendamento</Link></Button>
      </section>
    </main>
  </>;
}
