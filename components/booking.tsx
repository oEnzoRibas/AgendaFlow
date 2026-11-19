"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Check, ChevronLeft, ChevronRight, CircleCheck, Clock3, Scissors, UserRound } from "lucide-react";
import Link from "next/link";
import { submitBooking } from "@/app/actions";
import { changeDemo, useDemo } from "@/lib/demo-store";
import { demoContacts, simulateBooking } from "@/lib/demo";
import { bookingSchema, contactSchema, type Catalog, type Confirmation, type Contact, type Service, type Workspace } from "@/lib/model";
import { dateLabel, dayIn, money, shiftDay, timeLabel } from "@/lib/schedule";
import { Alert, Empty, Loading } from "./shared";
import { Button } from "./ui/button";
import { useSlots } from "./use-slots";

const steps = ["Serviço", "Profissional", "Data e horário", "Identificação"];

export function Booking({ liveCatalog, initialService }: { liveCatalog?: Catalog; initialService?: string }) {
  const local = useDemo();
  const catalog = liveCatalog ?? local;
  if (!catalog) return <Loading>Preparando o agendamento…</Loading>;
  return <BookingFlow catalog={catalog} initialService={initialService} demo={liveCatalog ? null : local} />;
}

function BookingFlow({ catalog, demo, initialService }: { catalog: Catalog; demo: Workspace | null; initialService?: string }) {
  const { business } = catalog;
  const zone = business.timezone;
  const services = catalog.services.filter((item) => item.active);
  const [serviceId, setService] = useState(() => services.find((entry) => entry.id === initialService)?.id ?? "");
  const [professionalId, setProfessional] = useState("");
  const today = dayIn(new Date(), zone);
  const lastDay = shiftDay(today, 60);
  const [day, setDay] = useState(today);
  const [week, setWeek] = useState(today);
  const [startsAt, setStart] = useState("");
  const [step, setStep] = useState(serviceId ? 1 : 0);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{ booking: Confirmation; service: string; professional: string; contact: string }>();
  const form = useForm<Contact>({
    resolver: zodResolver(contactSchema),
    defaultValues: demo ? { name: demoContacts[0].name, email: demoContacts[0].email, phone: demoContacts[0].phone } : { name: "", email: "", phone: "" },
  });
  const people = catalog.professionals.filter((person) => person.active &&
    catalog.professional_services.some((entry) => entry.professional_id === person.id && entry.service_id === serviceId));
  const professional = people.find((person) => person.id === professionalId);
  const service = services.find((entry) => entry.id === serviceId);
  const access = useSlots(service && professional && step >= 2 && !receipt && business.public_booking ?
    { day, serviceId, professionalId } : null, demo);
  const { isSubmitting, errors } = form.formState;

  function go(next: number) {
    setError("");
    setStep(next);
  }

  async function confirm(contact: Contact) {
    if (!service || !professional) { setError("Escolha o serviço e o profissional novamente."); return; }
    const input = bookingSchema.safeParse({ serviceId, professionalId, startsAt, contact });
    if (!input.success) { setError("Confira os dados antes de confirmar."); return; }
    setError("");
    try {
      const result = demo ? await changeDemo((data) => {
        const result = simulateBooking(data, input.data);
        return result.ok ? { ok: true, value: { data: result.value.data, value: result.value.appointment } } : result;
      }) : await submitBooking(input.data);
      if (!result.ok) { setError(result.error); setStart(""); setStep(2); access.refresh(); return; }
      setReceipt({ booking: result.value, service: service.name, professional: professional.name, contact: contact.name });
    } catch { setError("Não foi possível confirmar. Tente novamente."); }
  }

  if (receipt) return <section className="panel confirmation">
    <span className="confirmation-icon"><CircleCheck size={38} /></span>
    <span className="kicker">{demo ? "RESERVA DEMONSTRATIVA" : business.name}</span>
    <h1>Agendamento confirmado!</h1>
    <p>{receipt.contact}, seu horário foi reservado no {business.name}.</p>
    <dl className="receipt">
      <div><dt>Serviço</dt><dd>{receipt.service}</dd></div><div><dt>Profissional</dt><dd>{receipt.professional}</dd></div>
      <div><dt>Data e horário</dt><dd>{dateLabel(dayIn(receipt.booking.starts_at, zone), "dd 'de' MMMM")} · {timeLabel(receipt.booking.starts_at, zone)}–{timeLabel(receipt.booking.ends_at, zone)}</dd></div>
      <div><dt>Valor</dt><dd>{money(receipt.booking.price_cents)}</dd></div>
      <div><dt>Referência</dt><dd className="reference">{receipt.booking.id}</dd></div>
    </dl>
    <div className="action-row">{demo && <Button asChild><Link href={"/demo/agenda?dia=" + dayIn(receipt.booking.starts_at, zone) + "&reserva=" + receipt.booking.id}>Ver na agenda</Link></Button>}
      <Button asChild variant={demo ? "outline" : "default"}><Link href={demo ? "/estudio" : "/estudio?modo=real"}>Voltar ao salão</Link></Button></div>
  </section>;

  if (!business.public_booking) return <div className="panel page-empty"><Empty title="Agendamento online pausado">O salão está com as reservas online desativadas.</Empty>
    {demo && <Button asChild><Link href="/demo/configuracoes">Abrir configurações</Link></Button>}</div>;

  return <>
    <div className="page-intro"><span className="kicker">{demo ? "DEMONSTRAÇÃO · " : ""}{business.name}</span>
      <h1>Agende seu atendimento</h1><p>Escolha como e quando você quer ser atendido.</p></div>
    <ol className="booking-steps" aria-label="Etapas do agendamento">
      {steps.map((label, index) => <li key={label} className={index === step ? "current" : index < step ? "done" : ""} aria-current={index === step ? "step" : undefined}>
        <span>{index < step ? <Check size={15} /> : index + 1}</span>{label}</li>)}
    </ol>
    <div className="booking-layout">
      <section className="panel booking-panel" aria-labelledby="step-title">
        <h2 id="step-title">{["Qual serviço você procura?", "Com quem você quer agendar?", "Quando você quer vir?", "Identifique-se"][step]}</h2>
        <Alert>{error}</Alert>
        {step === 0 && (services.length ? <div className="choice-list">{services.map((item) => <ServiceChoice key={item.id} service={item} selected={serviceId === item.id} select={() => {
          if (item.id !== serviceId) { setProfessional(""); setStart(""); } setService(item.id);
        }} />)}</div> : <Empty title="Nenhum serviço disponível" />)}
        {step === 1 && (people.length ? <div className="choice-list">{people.map((item) => <button className="choice" type="button" key={item.id} aria-pressed={professionalId === item.id} onClick={() => {
          if (item.id !== professionalId) setStart(""); setProfessional(item.id);
        }}><span className="choice-icon"><UserRound size={20} /></span><span><strong>{item.name}</strong><small>{item.specialty}</small></span><span className="choice-radio" /></button>)}</div>
          : <Empty title="Nenhum profissional disponível">Volte e escolha outro serviço.</Empty>)}
        {step === 2 && <>
          {!service || !professional ? <Empty title="Selecione novamente o serviço e o profissional" /> : <>
            <div className="date-controls">
              <strong className="capitalize">{dateLabel(week, "MMMM 'de' yyyy")}</strong>
              <div><Button type="button" variant="outline" size="icon" aria-label="Dias anteriores" disabled={week <= today} onClick={() => setWeek(shiftDay(week, -7) < today ? today : shiftDay(week, -7))}><ChevronLeft size={17} /></Button>
              <Button type="button" variant="outline" size="icon" aria-label="Próximos dias" disabled={shiftDay(week, 7) > lastDay} onClick={() => setWeek(shiftDay(week, 7))}><ChevronRight size={17} /></Button></div>
            </div>
            <div className="day-strip">{Array.from({ length: 7 }, (_, index) => shiftDay(week, index)).filter((value) => value <= lastDay).map((value) => <button key={value} type="button" aria-label={dateLabel(value, "EEEE, dd 'de' MMMM")} aria-pressed={day === value} onClick={() => { setDay(value); setStart(""); setError(""); }}>
              <span>{dateLabel(value, "EEEEEE")}</span><strong>{dateLabel(value, "dd")}</strong>
            </button>)}</div>
            <div className="time-heading"><h3>Horários disponíveis</h3><span>{business.timezone}</span></div>
            {access.loading ? <Loading>Consultando horários…</Loading> : access.error ? <>
              <Alert>{access.error}</Alert><Button type="button" variant="outline" onClick={access.refresh}>Tentar novamente</Button>
            </> : access.slots.length ? <div className="time-grid">{access.slots.map((slot) => <button key={slot.starts_at} type="button" aria-pressed={startsAt === slot.starts_at}
                onClick={() => { setStart(slot.starts_at); setError(""); }}>{timeLabel(slot.starts_at, zone)}</button>)}</div> : <Empty title="Sem horários neste dia">Escolha outra data para consultar a disponibilidade.</Empty>}
          </>}
        </>}
        {step === 3 && <form id="booking-contact" className="field-stack" onSubmit={form.handleSubmit(confirm)} noValidate>
          {demo ? <><p className="muted">Escolha um perfil fictício para concluir a demonstração.</p>
            <label>Perfil fictício<select value={form.watch("email")} onChange={(event) => {
              const profile = demoContacts.find((entry) => entry.email === event.target.value);
              if (profile) form.reset({ name: profile.name, email: profile.email, phone: profile.phone });
            }}>{demoContacts.map((entry) => <option key={entry.id} value={entry.email}>{entry.name}</option>)}</select></label>
          </> : <>
            <label>Nome completo<input autoComplete="name" {...form.register("name")} /><Alert>{errors.name?.message}</Alert></label>
            <label>E-mail<input type="email" autoComplete="email" {...form.register("email")} /><Alert>{errors.email?.message}</Alert></label>
            <label>Telefone<input type="tel" autoComplete="tel" placeholder="(11) 99999-9999" {...form.register("phone")} /><Alert>{errors.phone?.message}</Alert></label>
            <p className="muted">O salão usa esses dados para administrar seu atendimento.</p>
          </>}
        </form>}
        <div className="booking-nav">
          {step > 0 ? <Button type="button" variant="ghost" disabled={isSubmitting} onClick={() => go(step - 1)}>Voltar</Button> : <span />}
          {step < 3 ? <Button type="button" disabled={step === 0 ? !service : step === 1 ? !professional : !access.slots.some((slot) => slot.starts_at === startsAt)}
            key="continue" onClick={(event) => { event.preventDefault(); go(step + 1); }}>Continuar</Button>
            : <Button key="confirm" form="booking-contact" type="submit" disabled={isSubmitting}>{isSubmitting ? "Confirmando…" : "Confirmar agendamento"}</Button>}
        </div>
      </section>
      <aside className="panel booking-summary"><span className="feature-icon"><Scissors size={20} /></span><h2>Seu agendamento</h2>
        <dl><div><dt>Serviço</dt><dd>{service?.name || "A selecionar"}</dd></div>
          <div><dt>Profissional</dt><dd>{professional?.name || "A selecionar"}</dd></div>
          <div><dt>Data e horário</dt><dd>{startsAt ? dateLabel(day, "dd/MM") + " · " + timeLabel(startsAt, zone) : "A selecionar"}</dd></div>
          {service && <div><dt><Clock3 size={14} /> Duração</dt><dd>{service.duration_minutes} min</dd></div>}
          <div className="summary-total"><dt>Total</dt><dd>{service ? money(service.price_cents) : "—"}</dd></div>
        </dl>
      </aside>
    </div>
  </>;
}

function ServiceChoice({ service, selected, select }: { service: Service; selected: boolean; select: () => void }) {
  return <button className="choice" type="button" aria-pressed={selected} onClick={select}>
    <span className="choice-icon"><Scissors size={20} /></span>
    <span><strong>{service.name}</strong><small>{service.description}</small><small>{service.duration_minutes} min · {money(service.price_cents)}</small></span>
    <span className="choice-radio" />
  </button>;
}
