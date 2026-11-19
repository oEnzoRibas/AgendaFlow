import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDemo, simulateBooking, simulateManagement } from "../lib/demo";
import { bookingSchema, manageSchema } from "../lib/model";
import { dayIn, getSlots, localInstant, shiftDay, timeLabel } from "../lib/schedule";

const now = new Date("2026-11-18T13:01:00.000Z");
const day = "2026-11-18";

function fixture() {
  const data = { ...makeDemo(now), appointments: [] };
  const service = data.services[0];
  const professional = data.professionals[0];
  const zone = data.business.timezone;
  const query = { serviceId: service.id, professionalId: professional.id, day };
  const at = (time: string) => localInstant(day, time, zone);
  return { data, service, professional, zone, query, at };
}

test("converte o horário do salão para um instante e mantém a data local", () => {
  const { zone, at } = fixture();
  assert.equal(new Date(at("10:15")).toISOString(), "2026-11-18T13:15:00.000Z");
  assert.equal(dayIn("2026-11-19T01:30:00Z", zone), day);
});

test("considera expediente, turno, duração, passado e horizonte", () => {
  const { data, zone, query, professional } = fixture();
  data.availability_rules = data.availability_rules.map((rule) => rule.professional_id === professional.id && rule.weekday === 3 ?
    { ...rule, opens_at: "10:00", closes_at: "12:00" } : rule);
  const slots = getSlots(data, query, now);
  assert.deepEqual(slots.map((item) => timeLabel(item.starts_at, zone)), ["10:15", "10:30", "10:45", "11:00"]);
  assert.deepEqual(getSlots(data, { ...query, day: shiftDay(day, -1) }, now), []);
  assert.deepEqual(getSlots(data, { ...query, day: shiftDay(day, 61) }, now), []);
  assert.deepEqual(getSlots(data, { ...query, day: "2026-11-22" }, now), []);
});

test("considera bloqueios e intervalo entre atendimentos, preservando limites adjacentes", () => {
  const { data, zone, query, professional, at } = fixture();
  data.blocked_periods.push({ id: crypto.randomUUID(), professional_id: professional.id,
    starts_at: at("13:00"), ends_at: at("13:30"), reason: "Pausa" });
  const times = getSlots(data, query, now).map((item) => timeLabel(item.starts_at, zone));
  assert.ok(times.includes("11:45"));
  assert.ok(!times.includes("12:00"));
  assert.ok(!times.includes("13:15"));
  assert.ok(times.includes("13:30"));
  assert.ok(times.includes("17:00"));
  assert.ok(!times.includes("17:15"));
});

test("rejeita profissional sem vínculo e serviço desativado", () => {
  const { data, query } = fixture();
  assert.deepEqual(getSlots(data, { ...query, professionalId: data.professionals[1].id }, now), []);
  data.services = data.services.map((service, index) => index === 0 ? { ...service, active: false } : service);
  assert.deepEqual(getSlots(data, query, now), []);
});

test("reserva, impede conflito, remarca e libera após cancelamento", () => {
  const { data, query, at } = fixture();
  const input = bookingSchema.parse({ professionalId: query.professionalId, serviceId: query.serviceId,
    startsAt: at("11:00"), contact: data.clients[0] });
  const booking = simulateBooking(data, input, now);
  assert.ok(booking.ok);
  const { appointment, data: reserved } = booking.value;
  assert.equal(simulateBooking(reserved, input, now).ok, false);
  assert.equal(simulateBooking(reserved, { ...input, startsAt: at("12:00") }, now).ok, false);
  assert.equal(simulateBooking(reserved, { ...input, startsAt: at("12:15") }, now).ok, true);
  const rescheduled = simulateManagement(reserved, { action: "appointment", data: {
    id: appointment.id, operation: "reschedule", starts_at: at("14:00"),
  } }, now);
  assert.ok(rescheduled.ok);
  assert.ok(simulateBooking(rescheduled.value, input, now).ok);
  const cancelled = simulateManagement(rescheduled.value, { action: "appointment", data: {
    id: appointment.id, operation: "cancelled",
  } }, now);
  assert.ok(cancelled.ok);
  assert.ok(simulateBooking(cancelled.value, { ...input, startsAt: at("14:00") }, now).ok);
});

test("valida identificação, fuso e a ordem de abertura e fechamento", () => {
  const { data, query, at } = fixture();
  const invalid = { ...data.clients[0], phone: "abc" };
  assert.equal(bookingSchema.safeParse({ ...query, startsAt: at("11:00"), contact: invalid }).success, false);
  const invalidHours = [{ weekday: 3, opens_at: "18:00", closes_at: "09:00" }];
  assert.equal(manageSchema.safeParse({ action: "settings", data: { ...data.business, hours: invalidHours } }).success, false);
});
