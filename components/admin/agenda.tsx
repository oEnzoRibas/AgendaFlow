"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { dayKey, type Appointment, type Status, type Workspace } from "@/lib/model";
import { dateLabel, dayIn, labels, money, shiftDay, startOfWeekKey, timeLabel } from "@/lib/schedule";
import { Alert, Empty, Loading } from "../shared";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { useSlots } from "../use-slots";
import type { Save } from "./workspace";

/**
 * Agrupa atendimentos por data civil no fuso do salão e aplica os filtros do painel.
 * @param props - Workspace, função de mutação, modo e referência opcional para abrir detalhes.
 */
export function Agenda({ data, save, demo, initialDay, initialBooking }: {
  data: Workspace; save: Save; demo: boolean; initialDay?: string; initialBooking?: string;
}) {
  const zone = data.business.timezone;
  const today = dayIn(new Date(), zone);
  const [day, setDay] = useState(() => dayKey.safeParse(initialDay).data ?? today);
  const [view, setView] = useState<"day" | "week">("day");
  const [professional, setProfessional] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [selected, setSelected] = useState(initialBooking);
  const appointment = data.appointments.find((entry) => entry.id === selected);
  const week = startOfWeekKey(day);
  const days = view === "week" ? Array.from({ length: 7 }, (_, index) => shiftDay(week, index)) : [day];
  const matching = data.appointments.filter((entry) => (!professional || entry.professional_id === professional) && (!status || status === entry.status))
    .sort((first, second) => Date.parse(first.starts_at) - Date.parse(second.starts_at));
  const delta = view === "day" ? 1 : 7;

  return <>
    <section className="panel agenda-panel" aria-label="Calendário de atendimentos">
      <div className="agenda-toolbar">
        <div className="agenda-date">
          <Button size="icon" variant="outline" aria-label={view === "day" ? "Dia anterior" : "Semana anterior"} onClick={() => setDay(shiftDay(day, -delta))}><ChevronLeft size={18} /></Button>
          <Button size="icon" variant="outline" aria-label={view === "day" ? "Próximo dia" : "Próxima semana"} onClick={() => setDay(shiftDay(day, delta))}><ChevronRight size={18} /></Button>
          <Button variant="outline" size="small" onClick={() => setDay(today)}>Hoje</Button>
          <label className="date-picker"><CalendarDays size={17} /><input type="date" aria-label="Ir para data" value={day} onChange={(event) => {
            const next = dayKey.safeParse(event.target.value); if (next.success) setDay(next.data);
          }} /></label>
        </div>
        <div className="view-switch" aria-label="Visualização da agenda">
          <button type="button" aria-pressed={view === "day"} onClick={() => setView("day")}>Dia</button>
          <button type="button" aria-pressed={view === "week"} onClick={() => setView("week")}>Semana</button>
        </div>
      </div>
      <div className="agenda-filters">
        <h2>{view === "day" ? dateLabel(day, "EEEE, dd 'de' MMMM") : dateLabel(week, "dd/MM") + " a " + dateLabel(days[6], "dd/MM/yyyy")}</h2>
        <div><select aria-label="Filtrar por profissional" value={professional} onChange={(event) => setProfessional(event.target.value)}>
          <option value="">Todos os profissionais</option>{data.professionals.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select>
          <select aria-label="Filtrar por status" value={status} onChange={(event) => setStatus(event.target.value as Status | "")}>
            <option value="">Todos os status</option>{Object.entries(labels).map(([value, title]) => <option value={value} key={value}>{title}</option>)}</select></div>
      </div>
      <div className={view === "week" ? "week-grid" : "day-agenda"}>
        {days.map((date) => {
          const entries = matching.filter((entry) => dayIn(entry.starts_at, zone) === date);
          return <section key={date} className="agenda-day" aria-label={dateLabel(date, "EEEE, dd/MM")}>
            {view === "week" && <h3 className={date === today ? "is-today" : ""}><span>{dateLabel(date, "EEE")}</span>{dateLabel(date, "dd/MM")}</h3>}
            {entries.length ? entries.map((item) => <button type="button" className={"agenda-entry " + item.status} key={item.id} onClick={() => setSelected(item.id)}>
              <span className="entry-hours"><Clock3 size={15} />{timeLabel(item.starts_at, zone)}–{timeLabel(item.ends_at, zone)}</span>
              <span><strong>{data.clients.find((entry) => entry.id === item.client_id)?.name}</strong>
                <small>{data.services.find((entry) => entry.id === item.service_id)?.name}</small></span>
              <small className="entry-person">{data.professionals.find((entry) => entry.id === item.professional_id)?.name}</small>
              <span className={"status " + item.status}>{labels[item.status]}</span>
            </button>) : view === "day" ? <Empty title="Nenhum atendimento neste dia">Altere os filtros ou consulte outra data.</Empty> : <p className="week-empty">Sem reservas</p>}
          </section>;
        })}
      </div>
    </section>
    {appointment && <Details appointment={appointment} data={data} demo={demo} save={save} close={() => setSelected(undefined)} />}
  </>;
}

function Details({ appointment, data, demo, save, close }: {
  appointment: Appointment; data: Workspace; demo: boolean; save: Save; close: () => void;
}) {
  const zone = data.business.timezone;
  const [operation, setOperation] = useState<"details" | "reschedule" | "cancelled">("details");
  const now = new Date();
  const today = dayIn(now, zone);
  const bookedDay = dayIn(appointment.starts_at, zone);
  const [day, setDay] = useState(bookedDay < today ? today : bookedDay);
  const [slot, setSlot] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const availability = useSlots(operation === "reschedule" ? { day, professionalId: appointment.professional_id,
    serviceId: appointment.service_id, ignoreId: appointment.id } : null, demo ? data : null, true);
  const customer = data.clients.find((entry) => entry.id === appointment.client_id);
  const service = data.services.find((entry) => entry.id === appointment.service_id);
  const person = data.professionals.find((entry) => entry.id === appointment.professional_id);

  async function submit(action: "reschedule" | "cancelled" | "completed") {
    setPending(true);
    setError("");
    const id = appointment.id;
    const result = await save({ action: "appointment", data: action === "reschedule" ?
      { id, operation: action, starts_at: slot } : { id, operation: action } });
    setPending(false);
    if (result.ok) { setOperation("details"); setSlot(""); }
    else { setError(result.error); if (action === "reschedule") { setSlot(""); availability.refresh(); } }
  }

  return <Dialog title="Detalhes do agendamento" description={service?.name ?? "Atendimento"} close={close}>
    <dl className="receipt appointment-details">
      <div><dt>Cliente</dt><dd>{customer?.name}</dd></div><div><dt>Profissional</dt><dd>{person?.name}</dd></div>
      <div><dt>Horário</dt><dd>{dateLabel(bookedDay, "dd/MM/yyyy")} · {timeLabel(appointment.starts_at, zone)}–{timeLabel(appointment.ends_at, zone)}</dd></div>
      <div><dt>Valor</dt><dd>{money(appointment.price_cents)}</dd></div><div><dt>Status</dt><dd><span className={"status " + appointment.status}>{labels[appointment.status]}</span></dd></div>
    </dl>
    <Alert>{error}</Alert>
    {operation === "reschedule" && <div className="field-stack">
      <label>Nova data<input type="date" min={today} max={shiftDay(today, 60)} value={day} onChange={(event) => {
        const next = dayKey.safeParse(event.target.value);
        if (next.success) { setDay(next.data); setSlot(""); }
      }} /></label>
      {availability.loading ? <Loading /> : availability.error ? <><Alert>{availability.error}</Alert>
        <Button variant="outline" onClick={availability.refresh}>Atualizar horários</Button></> :
        <label>Novo horário<select value={slot} onChange={(event) => setSlot(event.target.value)}>
          <option value="">{availability.slots.length ? "Selecione um horário" : "Sem horários nesta data"}</option>
          {availability.slots.map((entry) => <option key={entry.starts_at} value={entry.starts_at}>{timeLabel(entry.starts_at, zone)}</option>)}
        </select></label>}
      <div className="action-row dialog-actions"><Button variant="outline" onClick={() => setOperation("details")} disabled={pending}>Voltar</Button>
        <Button onClick={() => submit("reschedule")} disabled={pending || !slot || availability.loading}>{pending ? "Salvando…" : "Salvar remarcação"}</Button></div>
    </div>}
    {operation === "cancelled" && <><p>O cancelamento libera o horário para novas reservas.</p>
      <div className="action-row dialog-actions"><Button variant="outline" onClick={() => setOperation("details")} disabled={pending}>Voltar</Button>
        <Button variant="danger" onClick={() => submit("cancelled")} disabled={pending}>{pending ? "Cancelando…" : "Confirmar cancelamento"}</Button></div></>}
    {operation === "details" && appointment.status === "confirmed" && <div className="action-row dialog-actions">
      <Button variant="outline" disabled={pending} onClick={() => { setError(""); setOperation("reschedule"); }}>Remarcar</Button>
      {Date.parse(appointment.starts_at) <= +now && <Button variant="outline" disabled={pending} onClick={() => submit("completed")}>Marcar como concluído</Button>}
      <Button variant="danger" disabled={pending} onClick={() => { setError(""); setOperation("cancelled"); }}>Cancelar agendamento</Button>
    </div>}
  </Dialog>;
}
