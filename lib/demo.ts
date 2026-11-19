import type { Appointment, BookingInput, Client, Manage, Result, Workspace } from "./model";
import { dayIn, defaultZone, getSlots, localInstant, overlaps, shiftDay } from "./schedule";

const id = (group: number, item: number) => `${group}0000000-0000-4000-8000-${String(item).padStart(12, "0")}`;
const services = [
  { id: id(2, 1), name: "Corte & styling", description: "Corte personalizado, lavagem e finalização.", duration_minutes: 60, price_cents: 12000, active: true },
  { id: id(2, 2), name: "Escova modeladora", description: "Finalização com movimento e brilho.", duration_minutes: 45, price_cents: 7500, active: true },
  { id: id(2, 3), name: "Hidratação profunda", description: "Tratamento para maciez e revitalização dos fios.", duration_minutes: 60, price_cents: 15000, active: true },
  { id: id(2, 4), name: "Manicure", description: "Cuidado das unhas e esmaltação.", duration_minutes: 45, price_cents: 5500, active: true },
];
const professionals = [
  { id: id(3, 1), name: "Lia Martins", specialty: "Corte e finalização", active: true },
  { id: id(3, 2), name: "Nina Rocha", specialty: "Tratamentos capilares", active: true },
  { id: id(3, 3), name: "Bia Alves", specialty: "Especialista em unhas", active: true },
];
export const demoContacts: Client[] = ["Camila Duarte", "Rafa Santos", "Marina Costa", "Luiza Ribeiro", "Júlia Mendes", "Dani Lima", "Alex Souza", "Helena Dias"].map((name, index) => ({
  id: id(4, index + 1), name, email: `cliente${index + 1}@example.com`, phone: `(00) 90000-000${index + 1}`,
}));
const competencies = [[0, 1], [1, 2], [3]];
const buffer = 15;

/**
 * Gera um workspace sintético relativo ao dia em São Paulo.
 * @param now - Relógio que define o dia-base e o status dos atendimentos.
 * @returns Catálogo, agenda e expediente fictícios, prontos para a simulação.
 */
export function makeDemo(now = new Date()): Workspace {
  const today = dayIn(now, defaultZone);
  const hours = [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opens_at: "09:00", closes_at: weekday === 6 ? "16:00" : "18:00" }));
  const appointments: Appointment[] = [];
  for (let offset = -13; offset <= 6; offset++) {
    const day = shiftDay(today, offset);
    if (new Date(day + "T12:00:00Z").getUTCDay() === 0) continue;
    const count = offset === 0 ? 3 : 1 + Math.abs(offset * 7 + 1) % 4;
    for (let index = 0; index < count; index++) {
      const professional = (index + Math.abs(offset)) % professionals.length;
      const service = services[competencies[professional][(index + Math.abs(offset)) % competencies[professional].length]];
      const start = Date.parse(localInstant(day, ["09:00", "11:00", "14:00", "15:00"][index], defaultZone));
      const end = start + service.duration_minutes * 60_000;
      appointments.push({
        id: id(5, (offset + 14) * 10 + index), professional_id: professionals[professional].id, service_id: service.id,
        client_id: demoContacts[(index + Math.abs(offset) * 2) % demoContacts.length].id,
        starts_at: new Date(start).toISOString(), ends_at: new Date(end).toISOString(),
        busy_until: new Date(end + buffer * 60_000).toISOString(), price_cents: service.price_cents,
        status: offset === -2 && index === 0 ? "cancelled" : end < +now ? "completed" : "confirmed",
      });
    }
  }

  return {
    business: { id: id(1, 1), slug: "studio-bloom", name: "Studio Bloom",
      description: "Cortes, finalizações, tratamentos capilares e unhas, com atendimento marcado.",
      timezone: defaultZone, public_booking: true, buffer_minutes: buffer },
    services, professionals, clients: demoContacts, appointments,
    professional_services: competencies.flatMap((entries, index) => entries.map((service) => ({
      professional_id: professionals[index].id, service_id: services[service].id,
    }))),
    availability_rules: [null, ...professionals.map((person) => person.id)].flatMap((professional_id) =>
      hours.map((hour) => ({ ...hour, professional_id }))),
    blocked_periods: [],
  };
}

/**
 * Revalida o horário contra o snapshot atual e associa um perfil fictício.
 * @param data - Workspace demonstrativo antes da operação.
 * @param input - Seleção e contato já validados pelo schema de reserva.
 * @param now - Referência para aplicar o limite de tempo.
 * @returns Novo workspace e reserva, ou uma falha de domínio. A persistência ocorre no store.
 */
export function simulateBooking(data: Workspace, input: BookingInput, now = new Date()): Result<{ data: Workspace; appointment: Appointment }> {
  if (!data.business.public_booking) return { ok: false, error: "O agendamento online está desativado." };
  const client = demoContacts.find((entry) => entry.email === input.contact.email);
  if (!client) return { ok: false, error: "Escolha um perfil fictício." };
  const slot = getSlots(data, {
    day: dayIn(input.startsAt, data.business.timezone), serviceId: input.serviceId, professionalId: input.professionalId,
  }, now).find((entry) => Date.parse(entry.starts_at) === Date.parse(input.startsAt));
  if (!slot) return { ok: false, error: "Esse horário não está mais disponível." };
  const appointment: Appointment = { ...slot, id: crypto.randomUUID(), status: "confirmed",
    client_id: client.id, service_id: input.serviceId, professional_id: input.professionalId };
  return { ok: true, value: { appointment, data: { ...data, appointments: [...data.appointments, appointment] } } };
}

function save<T extends { id: string }>(entries: T[], next: T) {
  return entries.some((entry) => entry.id === next.id) ? entries.map((entry) => entry.id === next.id ? next : entry) : [...entries, next];
}

/**
 * Aplica um comando validado ao workspace fictício.
 * @param data - Snapshot atual do navegador.
 * @param command - Mutação administrativa discriminada pelo campo action.
 * @param now - Referência para bloqueios e agendamentos.
 * @returns O novo estado; em caso de conflito ou entrada inválida, preserva o snapshot anterior.
 */
export function simulateManagement(data: Workspace, command: Manage, now = new Date()): Result<Workspace> {
  const ok = (value: Workspace): Result<Workspace> => ({ ok: true, value });
  const fail = (error: string): Result<Workspace> => ({ ok: false, error });
  switch (command.action) {
    case "client": {
      const entry = command.data;
      if (data.clients.some((client) => client.email === entry.email && client.id !== entry.id)) return fail("Já há um cliente com esse e-mail.");
      return ok({ ...data, clients: save(data.clients, { ...entry, id: entry.id ?? crypto.randomUUID() }) });
    }
    case "service": {
      const entry = command.data;
      return ok({ ...data, services: save(data.services, { ...entry, id: entry.id ?? crypto.randomUUID() }) });
    }
    case "professional": {
      const { hours, service_ids, ...entry } = command.data;
      const id = entry.id ?? crypto.randomUUID();
      return ok({ ...data, professionals: save(data.professionals, { ...entry, id }),
        professional_services: [...data.professional_services.filter((item) => item.professional_id !== id),
          ...service_ids.map((service_id) => ({ professional_id: id, service_id }))],
        availability_rules: [...data.availability_rules.filter((rule) => rule.professional_id !== id),
          ...hours.map((hour) => ({ ...hour, professional_id: id }))],
      });
    }
    case "settings": {
      const { hours, ...settings } = command.data;
      return ok({ ...data, business: { ...data.business, ...settings },
        availability_rules: [...data.availability_rules.filter((rule) => rule.professional_id !== null),
          ...hours.map((hour) => ({ ...hour, professional_id: null }))],
      });
    }
    case "block": {
      const block = command.data;
      if (Date.parse(block.starts_at) <= +now) return fail("Informe um período futuro.");
      if (!data.professionals.some((entry) => entry.id === block.professional_id)) return fail("Profissional indisponível.");
      if (data.appointments.some((entry) => entry.professional_id === block.professional_id && entry.status !== "cancelled" &&
        overlaps(entry.starts_at, entry.busy_until, block.starts_at, block.ends_at))) return fail("O bloqueio coincide com um agendamento.");
      return ok({ ...data, blocked_periods: [...data.blocked_periods, { ...block, id: crypto.randomUUID() }] });
    }
    case "unblock":
      return ok({ ...data, blocked_periods: data.blocked_periods.filter((entry) => entry.id !== command.data.id) });
    case "appointment": {
      const entry = data.appointments.find((item) => item.id === command.data.id);
      if (!entry || entry.status !== "confirmed") return fail("Agendamento indisponível para alteração.");
      const change = command.data;
      if (change.operation === "reschedule") {
        const slot = getSlots(data, { day: dayIn(change.starts_at, data.business.timezone), professionalId: entry.professional_id,
          serviceId: entry.service_id, ignoreId: entry.id }, now)
          .find((item) => Date.parse(item.starts_at) === Date.parse(change.starts_at));
        if (!slot) return fail("Esse horário não está mais disponível.");
        return ok({ ...data, appointments: save(data.appointments, { ...entry, ...slot, price_cents: entry.price_cents }) });
      }
      if (change.operation === "completed" && Date.parse(entry.starts_at) > +now) return fail("O atendimento ainda não começou.");
      return ok({ ...data, appointments: save(data.appointments, { ...entry, status: change.operation }) });
    }
  }
}
