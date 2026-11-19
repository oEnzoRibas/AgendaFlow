"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, CalendarRange, CircleDollarSign, UsersRound } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Workspace } from "@/lib/model";
import { dateLabel, dayIn, labels, money, shiftDay, timeLabel } from "@/lib/schedule";
import { Empty } from "../shared";
import { Button } from "../ui/button";

/**
 * Deriva as métricas a partir do workspace. A receita soma valores históricos de reservas não canceladas.
 * @param props - Dados disponíveis e prefixo de navegação do modo corrente.
 */
export function Overview({ data, base }: { data: Workspace; base: string }) {
  const [period, setPeriod] = useState(7);
  const zone = data.business.timezone;
  const today = dayIn(new Date(), zone);
  const included = data.appointments.filter((item) => item.status !== "cancelled");
  const todays = included.filter((item) => dayIn(item.starts_at, zone) === today)
    .sort((first, second) => Date.parse(first.starts_at) - Date.parse(second.starts_at));
  const totals = new Map<string, number>();
  for (const item of included) {
    const date = dayIn(item.starts_at, zone);
    totals.set(date, (totals.get(date) ?? 0) + 1);
  }
  const series = Array.from({ length: period }, (_, index) => {
    const day = shiftDay(today, index - period + 1);
    return { date: dateLabel(day, "dd/MM"), total: totals.get(day) ?? 0 };
  });
  const stats = [
    { label: "Total de agendamentos", value: data.appointments.length, icon: CalendarRange, note: "Todos os status" },
    { label: "Agendamentos hoje", value: todays.length, icon: CalendarDays, note: dateLabel(today, "EEEE, dd/MM") },
    { label: "Clientes cadastrados", value: data.clients.length, icon: UsersRound, note: "No estabelecimento" },
    { label: "Receita estimada", value: money(included.reduce((sum, item) => sum + item.price_cents, 0)),
      icon: CircleDollarSign, note: "Confirmados e concluídos" },
  ];
  return <>
    <div className="stats-grid">{stats.map(({ label, value, icon: Icon, note }) => <article key={label} className="panel stat">
      <div><span className="stat-title">{label}</span><span className="feature-icon"><Icon size={20} /></span></div>
      <strong>{value}</strong><small>{note}</small>
    </article>)}</div>
    <div className="overview-grid">
      <section className="panel overview-panel">
        <div className="section-heading"><div><h2>Agendamentos por período</h2><p>Confirmados e concluídos por dia</p></div>
          <select className="compact-select" aria-label="Período do gráfico" value={period} onChange={(event) => setPeriod(Number(event.target.value))}>
            <option value={7}>Últimos 7 dias</option><option value={14}>Últimos 14 dias</option><option value={30}>Últimos 30 dias</option>
          </select></div>
        <div className="chart" role="img" aria-label={series.map((entry) => entry.date + ", " + entry.total + " agendamentos").join("; ")}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={series} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
              <defs><linearGradient id="volume" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8753d5" stopOpacity={.30} /><stop offset="100%" stopColor="#8753d5" stopOpacity={.03} />
              </linearGradient></defs>
              <CartesianGrid stroke="#ece6f4" vertical={false} strokeDasharray="4 4" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#625a72" }} minTickGap={18} />
              <YAxis width={30} allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#625a72" }} />
              <Tooltip />
              <Area type="monotone" dataKey="total" name="Agendamentos" stroke="#6536bd" strokeWidth={2.5} fill="url(#volume)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="panel overview-panel today-panel">
        <div className="section-heading"><div><h2>Agenda de hoje</h2><p>{dateLabel(today, "dd 'de' MMMM")}</p></div></div>
        {todays.length ? <div className="today-list">{todays.slice(0, 5).map((item) => <Link className="today-entry" key={item.id} href={base + "/agenda?dia=" + today + "&reserva=" + item.id}>
          <span className="today-hour">{timeLabel(item.starts_at, zone)}</span><div><strong>{data.clients.find((entry) => entry.id === item.client_id)?.name}</strong>
            <small>{data.services.find((entry) => entry.id === item.service_id)?.name}</small></div><span className={"status " + item.status}>{labels[item.status]}</span>
        </Link>)}</div> : <Empty title="Sem atendimentos hoje" />}
        <Button asChild variant="outline"><Link href={base + "/agenda"}>Abrir agenda</Link></Button>
      </section>
    </div>
  </>;
}
