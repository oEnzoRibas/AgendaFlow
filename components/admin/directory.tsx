"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Ban, Clock3, Pencil, Plus, Search, Trash2, UsersRound } from "lucide-react";
import { type Block, type Client, type Hours, type Manage, type Professional, type Service, type Workspace } from "@/lib/model";
import { dateLabel, dayIn, labels, localInstant, money, timeLabel, weekdays } from "@/lib/schedule";
import { Alert, Empty } from "../shared";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import type { Save } from "./workspace";

type DirectoryProps = { data: Workspace; save: Save };
type Editor = { close: () => void; save: Save };
const field = (form: FormData, key: string) => String(form.get(key) ?? "");
const number = (form: FormData, key: string) => field(form, key) === "" ? NaN : Number(field(form, key));
const sortName = <T extends { name: string }>(entries: T[]) =>
  [...entries].sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));
const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();

function Form({ submit, save, close, children, button = "Salvar alterações", note = "" }: {
  submit: (form: FormData) => Manage; save: Save; close?: () => void; children: ReactNode;
  button?: string; note?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    setSuccess("");
    try {
      const result = await save(submit(form));
      if (result.ok) { if (close) close(); else setSuccess("Alterações salvas."); }
      else setError(result.error);
    } catch (failure) {
      setError(failure instanceof RangeError ? "Escolha um horário válido no fuso do salão." : "Não foi possível salvar.");
    } finally { setPending(false); }
  }

  return <form className="field-stack editor-form" onSubmit={handle}>
    {children}
    {note && <p className="muted">{note}</p>}
    <Alert>{error}</Alert>
    {success && <p className="success-message" role="status">{success}</p>}
    <div className="action-row dialog-actions">
      {close && <Button type="button" disabled={pending} variant="outline" onClick={close}>Voltar</Button>}
      <Button type="submit" disabled={pending}>{pending ? "Salvando…" : button}</Button>
    </div>
  </form>;
}

function readHours(form: FormData): Hours[] {
  return weekdays.flatMap((_, weekday) => form.has("day-" + weekday) ? [{
    weekday, opens_at: field(form, "open-" + weekday), closes_at: field(form, "close-" + weekday),
  }] : []);
}

function HoursEditor({ initial }: { initial: Hours[] }) {
  const [open, setOpen] = useState(() => new Set(initial.map((entry) => entry.weekday)));
  return <fieldset className="hours-editor">
    <legend>Horários semanais</legend>
    {[1, 2, 3, 4, 5, 6, 0].map((weekday) => {
      const entry = initial.find((item) => item.weekday === weekday);
      const enabled = open.has(weekday);
      return <div className="hours-row" key={weekday}>
        <label className="check-line"><input type="checkbox" name={"day-" + weekday} checked={enabled} onChange={(event) => {
          const next = new Set(open);
          if (event.target.checked) next.add(weekday); else next.delete(weekday);
          setOpen(next);
        }} />{weekdays[weekday]}</label>
        <input type="time" name={"open-" + weekday} aria-label={"Abertura de " + weekdays[weekday]} defaultValue={entry?.opens_at ?? "09:00"} disabled={!enabled} required={enabled} />
        <input type="time" name={"close-" + weekday} aria-label={"Fechamento de " + weekdays[weekday]} defaultValue={entry?.closes_at ?? "18:00"} disabled={!enabled} required={enabled} />
      </div>;
    })}
  </fieldset>;
}

function State({ active, feminine = false }: { active: boolean; feminine?: boolean }) {
  return <span className={"status " + (active ? "active" : "inactive")}>{active ? (feminine ? "Ativa" : "Ativo") : (feminine ? "Inativa" : "Inativo")}</span>;
}

export function Clients({ data, save, demo }: DirectoryProps & { demo: boolean }) {
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<Client | "new" | null>(null);
  const [history, setHistory] = useState<Client>();
  const hits = sortName(data.clients.filter((item) => normalize(item.name + " " + item.email + " " + item.phone).includes(normalize(search))));
  const zone = data.business.timezone;
  const visits = data.appointments.filter((entry) => entry.client_id === history?.id)
    .sort((first, second) => Date.parse(second.starts_at) - Date.parse(first.starts_at));
  return <>
    <section className="panel directory-panel">
      <div className="section-heading"><div><h2>Lista de clientes</h2><p>{data.clients.length} {data.clients.length === 1 ? "cliente cadastrado" : "clientes cadastrados"}</p></div>
        <Button onClick={() => setEditor("new")}><Plus size={17} /> Novo cliente</Button></div>
      <label className="search-field"><Search size={17} /><input aria-label="Buscar cliente" placeholder="Buscar por nome, e-mail ou telefone" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      {hits.length ? <div className="table-wrap"><table><thead><tr><th scope="col">Cliente</th><th scope="col">Telefone</th><th scope="col">Agendamentos</th><th scope="col">Ações</th></tr></thead>
        <tbody>{hits.map((client) => <tr key={client.id}><td><strong>{client.name}</strong><small>{client.email}</small></td><td>{client.phone}</td>
          <td>{data.appointments.filter((entry) => entry.client_id === client.id).length}</td>
          <td><div className="action-row"><Button size="small" variant="outline" onClick={() => setHistory(client)}>Histórico</Button>
            <Button size="icon" variant="ghost" aria-label={"Editar " + client.name} onClick={() => setEditor(client)}><Pencil size={16} /></Button></div></td>
        </tr>)}</tbody></table></div> : <Empty title={search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}>{search ? "Tente buscar com outro termo." : "Cadastre um cliente ou aguarde a primeira reserva."}</Empty>}
    </section>
    {editor && <ClientEditor entry={editor === "new" ? undefined : editor} save={save} demo={demo} close={() => setEditor(null)} />}
    {history && <Dialog title="Histórico do cliente" description={history.name} close={() => setHistory(undefined)}>
      {visits.length ? <div className="history-list">{visits.map((entry) => <div key={entry.id} className="today-entry">
        <UsersRound size={18} /><div><strong>{data.services.find((service) => service.id === entry.service_id)?.name}</strong>
          <small>{dateLabel(dayIn(entry.starts_at, zone), "dd/MM/yyyy")} · {timeLabel(entry.starts_at, zone)}</small></div>
        <span className={"status " + entry.status}>{labels[entry.status]}</span></div>)}</div> : <Empty title="Sem agendamentos" />}
    </Dialog>}
  </>;
}

function ClientEditor({ entry, close, save, demo }: Editor & { entry?: Client; demo: boolean }) {
  return <Dialog title={entry ? "Editar cliente" : "Novo cliente"} description={demo ? "Use um nome fictício. O sistema preenche os dados de contato." : "Preencha o nome e os dados de contato."} close={close}>
    <Form close={close} save={save} submit={(form) => ({ action: "client", data: {
      id: entry?.id, name: field(form, "name"),
      email: demo ? entry?.email ?? ("demo-" + crypto.randomUUID().slice(0, 8) + "@example.com") : field(form, "email"),
      phone: demo ? entry?.phone ?? "(00) 90000-0000" : field(form, "phone"),
    } })}>
      <label>{demo ? "Nome fictício" : "Nome completo"}<input name="name" defaultValue={entry?.name} autoComplete={demo ? "off" : "name"} required minLength={2} maxLength={100} /></label>
      {!demo && <><label>E-mail<input name="email" type="email" defaultValue={entry?.email} autoComplete="email" required maxLength={254} /></label>
        <label>Telefone<input name="phone" type="tel" defaultValue={entry?.phone} autoComplete="tel" required maxLength={24} /></label></>}
    </Form>
  </Dialog>;
}

export function Services({ data, save }: DirectoryProps) {
  const [editor, setEditor] = useState<Service | "new" | null>(null);
  return <>
    <div className="directory-actions"><Button onClick={() => setEditor("new")}><Plus size={17} /> Novo serviço</Button></div>
    {data.services.length ? <div className="directory-grid">{sortName(data.services).map((service) => <article key={service.id} className="panel directory-card">
      <div className="section-heading"><h2>{service.name}</h2><State active={service.active} /></div>
      <p>{service.description}</p>
      <div className="directory-meta"><span><Clock3 size={16} />{service.duration_minutes} min</span><strong>{money(service.price_cents)}</strong></div>
      <Button variant="outline" size="small" onClick={() => setEditor(service)}><Pencil size={15} /> Editar serviço</Button>
    </article>)}</div> : <div className="panel"><Empty title="Nenhum serviço cadastrado">Adicione um serviço para abrir horários no portal.</Empty></div>}
    {editor && <ServiceEditor entry={editor === "new" ? undefined : editor} save={save} close={() => setEditor(null)} />}
  </>;
}

function ServiceEditor({ entry, close, save }: Editor & { entry?: Service }) {
  return <Dialog title={entry ? "Editar serviço" : "Novo serviço"} description="Serviços ativos aparecem no catálogo. Vincule um profissional para disponibilizar horários." close={close}>
    <Form save={save} close={close} submit={(form) => ({ action: "service", data: {
      id: entry?.id, name: field(form, "name"), description: field(form, "description"),
      price_cents: Math.round(number(form, "price") * 100), duration_minutes: number(form, "minutes"), active: form.has("active"),
    } })}>
      <label>Nome do serviço<input name="name" defaultValue={entry?.name} required minLength={2} maxLength={100} /></label>
      <label>Descrição<textarea name="description" defaultValue={entry?.description} maxLength={500} /></label>
      <div className="form-columns">
        <label>Preço em reais<input name="price" type="number" min={0} max={100000} step=".01" defaultValue={entry ? entry.price_cents / 100 : undefined} required /></label>
        <label>Duração em minutos<input name="minutes" type="number" min={5} max={480} defaultValue={entry?.duration_minutes ?? 45} required /></label>
      </div>
      <label className="check-line"><input type="checkbox" name="active" defaultChecked={entry?.active ?? true} /> Serviço ativo</label>
    </Form>
  </Dialog>;
}

export function Professionals({ data, save }: DirectoryProps) {
  const [editor, setEditor] = useState<Professional | "new" | null>(null);
  const [blocking, setBlocking] = useState<Professional>();
  const [removing, setRemoving] = useState<Block>();
  const zone = data.business.timezone;
  const now = new Date();
  const upcoming = data.blocked_periods.filter((item) => Date.parse(item.ends_at) > +now)
    .sort((first, second) => Date.parse(first.starts_at) - Date.parse(second.starts_at));
  const timestamp = (value: string) => dateLabel(dayIn(value, zone), "dd/MM/yyyy") + " " + timeLabel(value, zone);
  return <>
    <div className="directory-actions"><Button onClick={() => setEditor("new")}><Plus size={17} /> Novo profissional</Button></div>
    {data.professionals.length ? <div className="directory-grid">{sortName(data.professionals).map((person) => {
      const offered = data.professional_services.filter((item) => item.professional_id === person.id).map((item) =>
        data.services.find((service) => service.id === item.service_id)?.name).filter(Boolean);
      const days = data.availability_rules.filter((rule) => rule.professional_id === person.id).length;
      return <article key={person.id} className="panel directory-card">
        <div className="section-heading"><h2>{person.name}</h2><State active={person.active} /></div>
        <p>{person.specialty || "Especialidade não cadastrada"}</p>
        <div className="directory-meta"><span><Clock3 size={16} />{days} {days === 1 ? "dia por semana" : "dias por semana"}</span></div>
        <p className="offered">{offered.length ? offered.join(" · ") : "Sem serviços vinculados"}</p>
        <div className="action-row"><Button variant="outline" size="small" onClick={() => setEditor(person)}><Pencil size={15} /> Editar</Button>
          <Button variant="outline" size="small" onClick={() => setBlocking(person)}><Ban size={15} /> Bloquear horário</Button></div>
      </article>;
    })}</div> : <div className="panel"><Empty title="Nenhum profissional cadastrado" /></div>}
    <section className="panel directory-panel blocks-panel">
      <div className="section-heading"><div><h2>Bloqueios de disponibilidade</h2><p>Períodos futuros ou em andamento</p></div></div>
      {upcoming.length ? <div className="blocks-list">{upcoming.map((block) => <article key={block.id}>
        <div><strong>{data.professionals.find((person) => person.id === block.professional_id)?.name}</strong>
          <small>{timestamp(block.starts_at)} até {timestamp(block.ends_at)}{block.reason ? " · " + block.reason : ""}</small></div>
        <Button variant="ghost" size="icon" aria-label="Remover bloqueio" onClick={() => setRemoving(block)}><Trash2 size={17} /></Button>
      </article>)}</div> : <Empty title="Nenhum bloqueio agendado" />}
    </section>
    {editor && <ProfessionalEditor entry={editor === "new" ? undefined : editor} data={data} close={() => setEditor(null)} save={save} />}
    {blocking && <BlockEditor person={blocking} zone={zone} close={() => setBlocking(undefined)} save={save} />}
    {removing && <Dialog title="Remover bloqueio?" description="O horário voltará a seguir as regras de disponibilidade do profissional." close={() => setRemoving(undefined)}>
      <Form close={() => setRemoving(undefined)} save={save} button="Remover bloqueio" submit={() => ({ action: "unblock", data: { id: removing.id } })}>{null}</Form>
    </Dialog>}
  </>;
}

function ProfessionalEditor({ entry, data, close, save }: Editor & { entry?: Professional; data: Workspace }) {
  const hours = data.availability_rules.filter((rule) => rule.professional_id === entry?.id);
  const assignments = new Set(data.professional_services.filter((item) => item.professional_id === entry?.id).map((item) => item.service_id));
  return <Dialog title={entry ? "Editar profissional" : "Novo profissional"} description="Defina os serviços e horários em que a pessoa atende." close={close}>
    <Form save={save} close={close} submit={(form) => ({ action: "professional", data: {
      id: entry?.id, name: field(form, "name"), specialty: field(form, "specialty"), active: form.has("active"),
      service_ids: form.getAll("services").map(String), hours: readHours(form),
    } })}>
      <label>Nome<input name="name" defaultValue={entry?.name} required minLength={2} maxLength={100} /></label>
      <label>Especialidade<input name="specialty" defaultValue={entry?.specialty} maxLength={100} /></label>
      <label className="check-line"><input type="checkbox" name="active" defaultChecked={entry?.active ?? true} /> Profissional ativo</label>
      <fieldset className="service-checks"><legend>Serviços oferecidos</legend>
        {data.services.length ? sortName(data.services).map((service) => <label className="check-line" key={service.id}>
          <input type="checkbox" name="services" value={service.id} defaultChecked={assignments.has(service.id)} />{service.name}</label>) : <p>Cadastre um serviço para vinculá-lo aqui.</p>}
      </fieldset>
      <HoursEditor initial={hours} />
    </Form>
  </Dialog>;
}

function zonedInput(value: string, zone: string) {
  const [day, time] = value.split("T");
  const instant = localInstant(day, time, zone);
  if (dayIn(instant, zone) !== day || timeLabel(instant, zone) !== time) throw new RangeError();
  return instant;
}

function BlockEditor({ person, zone, close, save }: Editor & { person: Professional; zone: string }) {
  return <Dialog title="Bloquear horário" description={person.name + " · " + zone} close={close}>
    <Form save={save} close={close} button="Salvar bloqueio" submit={(form) => ({ action: "block", data: {
      professional_id: person.id, starts_at: zonedInput(field(form, "start"), zone), ends_at: zonedInput(field(form, "end"), zone),
      reason: field(form, "reason"),
    } })}>
      <label>Início<input type="datetime-local" name="start" required /></label>
      <label>Fim<input type="datetime-local" name="end" required /></label>
      <label>Motivo (opcional)<input name="reason" maxLength={100} /></label>
    </Form>
  </Dialog>;
}

export function Settings({ data, save }: DirectoryProps) {
  const { business } = data;
  const hours = data.availability_rules.filter((rule) => rule.professional_id === null);
  return <section className="panel directory-panel settings-panel">
    <div className="section-heading"><div><h2>Estabelecimento</h2><p>Os horários de reserva seguem o fuso e o expediente abaixo.</p></div></div>
    <Form save={save} submit={(form) => ({ action: "settings", data: {
      name: field(form, "name"), description: field(form, "description"),
      timezone: field(form, "timezone"), buffer_minutes: number(form, "interval"), public_booking: form.has("public"), hours: readHours(form),
    } })}>
      <label>Nome do estabelecimento<input name="name" defaultValue={business.name} minLength={2} maxLength={100} required /></label>
      <label>Descrição pública<textarea name="description" defaultValue={business.description} maxLength={500} /></label>
      <div className="form-columns"><label>Fuso horário<input name="timezone" defaultValue={business.timezone} required placeholder="America/Sao_Paulo" maxLength={100} /></label>
        <label>Intervalo após atendimento (min)<input type="number" name="interval" min={0} max={120} defaultValue={business.buffer_minutes} required /></label></div>
      <label className="check-line"><input type="checkbox" name="public" defaultChecked={business.public_booking} /> Aceitar agendamentos online</label>
      <HoursEditor initial={hours} />
      <p className="muted">Alterações de horário, duração e intervalo se aplicam às próximas reservas.</p>
    </Form>
  </section>;
}
