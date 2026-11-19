import { TZDate } from "@date-fns/tz";
import { addDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Slot, SlotQuery, Workspace } from "./model";

const minute = 60_000;
export const defaultZone = "America/Sao_Paulo";
export const labels = { confirmed: "Confirmado", completed: "Concluído", cancelled: "Cancelado" };
export const weekdays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export function dayIn(value: Date | string, zone: string) {
  return format(new TZDate(new Date(value).getTime(), zone), "yyyy-MM-dd");
}

export function dateLabel(day: string, pattern: string) {
  return format(parseISO(day), pattern, { locale: ptBR });
}

export function startOfWeekKey(day: string) {
  return shiftDay(day, -((parseISO(day).getDay() + 6) % 7));
}

export function shiftDay(day: string, amount: number) {
  return format(addDays(parseISO(day), amount), "yyyy-MM-dd");
}

export function localInstant(day: string, time: string, zone: string) {
  const [year, month, date] = day.split("-").map(Number);
  const [hour, minutes] = time.split(":").map(Number);
  return new TZDate(year, month - 1, date, hour, minutes, zone).toISOString();
}

export function timeLabel(value: Date | string, zone: string) {
  return format(new TZDate(new Date(value).getTime(), zone), "HH:mm");
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return Date.parse(aStart) < Date.parse(bEnd) && Date.parse(bStart) < Date.parse(aEnd);
}

export function getSlots(data: Workspace, query: SlotQuery, now = new Date()): Slot[] {
  const { day, serviceId, professionalId, ignoreId } = query;
  const { timezone, buffer_minutes } = data.business;
  const today = dayIn(now, timezone);
  if (day < today || day > shiftDay(today, 60)) return [];
  const service = data.services.find((entry) => entry.active && entry.id === serviceId);
  const professional = data.professionals.find((entry) => entry.active && entry.id === professionalId);
  if (!service || !professional || !data.professional_services.some((entry) =>
    entry.professional_id === professionalId && entry.service_id === serviceId)) return [];

  const weekday = parseISO(day).getDay();
  const office = data.availability_rules.find((entry) => entry.weekday === weekday && entry.professional_id === null);
  const shift = data.availability_rules.find((entry) => entry.weekday === weekday && entry.professional_id === professionalId);
  if (!office || !shift) return [];
  const opening = [office.opens_at, shift.opens_at].sort().at(-1)!;
  const closing = [office.closes_at, shift.closes_at].sort()[0];
  const last = Date.parse(localInstant(day, closing, timezone)) - service.duration_minutes * minute;
  const taken = data.appointments.filter((entry) => entry.professional_id === professionalId && entry.id !== ignoreId && entry.status !== "cancelled");
  const blocks = data.blocked_periods.filter((entry) => entry.professional_id === professionalId);
  const available: Slot[] = [];
  for (let start = Date.parse(localInstant(day, opening, timezone)); start <= last; start += 15 * minute) {
    if (start <= +now) continue;
    const end = start + service.duration_minutes * minute;
    const starts_at = new Date(start).toISOString();
    const ends_at = new Date(end).toISOString();
    const busy_until = new Date(end + buffer_minutes * minute).toISOString();
    if (taken.some((entry) => overlaps(starts_at, busy_until, entry.starts_at, entry.busy_until)) ||
        blocks.some((entry) => overlaps(starts_at, busy_until, entry.starts_at, entry.ends_at))) continue;
    available.push({ starts_at, ends_at, busy_until, price_cents: service.price_cents });
  }
  return available;
}
