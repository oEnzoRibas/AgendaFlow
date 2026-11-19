import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/database";
import { dayIn, localInstant, shiftDay, timeLabel } from "../lib/schedule";

const url = process.env.AGENDAFLOW_TEST_SUPABASE_URL ?? "";
const key = process.env.AGENDAFLOW_TEST_PUBLISHABLE_KEY ?? "";
const adminKey = process.env.AGENDAFLOW_TEST_SECRET_KEY ?? "";

test("Supabase: autenticação, isolamento, disponibilidade, concorrência e gestão", async () => {
  assert.match(url, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/, "Use apenas um Supabase local.");
  assert.ok(key && adminKey, "Informe as chaves do Supabase local no ambiente do teste.");

  const authOptions = { auth: { persistSession: false, autoRefreshToken: false } };
  const root = createClient<Database>(url, adminKey, authOptions);
  const visitor = createClient<Database>(url, key, authOptions);
  const owner = createClient<Database>(url, key, authOptions);
  const stranger = createClient<Database>(url, key, authOptions);
  const users: string[] = [];
  const id = crypto.randomUUID();
  const service = crypto.randomUUID();
  const professional = crypto.randomUUID();
  const slug = "qa-" + id;
  const zone = "America/Sao_Paulo";
  const day = shiftDay(dayIn(new Date(), zone), 7);
  const at = (time: string) => localInstant(day, time, zone);
  const query = { p_slug: slug, p_service: service, p_professional: professional, p_day: day };
  const password = "QA!" + crypto.randomUUID();

  async function login(client: typeof owner, alias: string) {
    const email = alias + "-" + id + "@example.com";
    const { data: { user }, error } = await root.auth.admin.createUser({ email, password, email_confirm: true });
    assert.ifError(error);
    assert.ok(user);
    users.push(user.id);
    assert.ifError((await client.auth.signInWithPassword({ email, password })).error);
    assert.equal((await client.auth.getClaims()).data?.claims.sub, user.id);
    return user.id;
  }

  const createBooking = (time: string, email: string) => visitor.rpc("create_booking", {
    p_slug: slug, p_service: service, p_professional: professional,
    p_start: at(time), p_name: "Cliente fictício", p_email: email, p_phone: "(00) 90000-0000",
  });

  try {
    const ownerId = await login(owner, "dona");
    await login(stranger, "outra");
    assert.ifError((await root.from("businesses").insert({
      id, slug, owner_id: ownerId, name: "Studio de teste", timezone: zone, public_booking: true, buffer_minutes: 15,
    })).error);
    assert.ifError((await root.from("services").insert({
      id: service, business_id: id, name: "Corte de teste", duration_minutes: 60, price_cents: 12000,
    })).error);
    assert.ifError((await root.from("professionals").insert({ id: professional, business_id: id, name: "Lia Teste" })).error);
    assert.ifError((await root.from("professional_services").insert({ business_id: id, service_id: service, professional_id: professional })).error);
    const weekday = new Date(day + "T12:00:00Z").getUTCDay();
    assert.ifError((await root.from("availability_rules").insert([
      { business_id: id, professional_id: null, weekday, opens_at: "09:00", closes_at: "17:00" },
      { business_id: id, professional_id: professional, weekday, opens_at: "10:00", closes_at: "18:00" },
    ])).error);

    const catalog = await visitor.rpc("booking_catalog", { p_slug: slug });
    assert.ifError(catalog.error);
    assert.equal(catalog.data?.services[0].id, service);
    assert.ok(catalog.data && !Object.hasOwn(catalog.data.business, "owner_id"));

    const slots = await visitor.rpc("available_slots", query);
    assert.ifError(slots.error);
    assert.equal(timeLabel(slots.data![0].starts_at, zone), "10:00");
    assert.equal(timeLabel(slots.data!.at(-1)!.starts_at, zone), "16:00");
    const past = await visitor.rpc("available_slots", { ...query, p_day: shiftDay(day, -14) });
    assert.ifError(past.error);
    assert.deepEqual(past.data, []);
    assert.equal((await createBooking("09:30", "fora@example.com")).error?.code, "23P01");
    assert.equal((await createBooking("10:00", "invalido")).error?.code, "22023");

    const simultaneous = await Promise.all([
      createBooking("11:00", "cliente-1@example.com"), createBooking("11:00", "cliente-2@example.com"),
    ]);
    const booked = simultaneous.flatMap((item) => item.data ? [item.data] : []);
    assert.equal(booked.length, 1);
    assert.equal(simultaneous.find((item) => item.error)?.error?.code, "23P01");
    assert.equal((await createBooking("12:00", "intervalo@example.com")).error?.code, "23P01");

    const mine = await owner.from("appointments").select("id").eq("business_id", id);
    assert.ifError(mine.error);
    assert.deepEqual(mine.data, [{ id: booked[0].id }]);
    const clients = await owner.from("clients").select("id").eq("business_id", id);
    assert.ifError(clients.error);
    assert.equal(clients.data?.length, 1);
    const others = await stranger.from("appointments").select("id").eq("business_id", id);
    assert.ifError(others.error);
    assert.deepEqual(others.data, []);
    assert.equal((await visitor.from("clients").select("id")).error?.code, "42501");
    assert.equal((await owner.from("businesses").update({ buffer_minutes: 120 }).eq("id", id)).error?.code, "42501");
    assert.equal((await owner.from("appointments").update({ status: "cancelled" }).eq("id", booked[0].id)).error?.code, "42501");

    const cancel = { p_business: id, p_action: "appointment", p_data: { id: booked[0].id, operation: "cancelled" } };
    assert.equal((await stranger.rpc("manage_agenda", cancel)).error?.code, "42501");
    const withoutIgnore = await visitor.rpc("available_slots", { ...query, p_ignore: booked[0].id });
    assert.ifError(withoutIgnore.error);
    assert.deepEqual(withoutIgnore.data, []);

    const block = (start: string, end: string) => owner.rpc("manage_agenda", { p_business: id, p_action: "block", p_data: {
      professional_id: professional, starts_at: at(start), ends_at: at(end), reason: "Pausa fictícia",
    } });
    assert.equal((await block("11:30", "12:00")).error?.code, "23P01");
    assert.ifError((await block("14:00", "14:30")).error);
    assert.equal((await createBooking("13:30", "bloqueio@example.com")).error?.code, "23P01");

    const reschedule = await owner.rpc("manage_agenda", { ...cancel, p_data: {
      ...cancel.p_data, operation: "reschedule", starts_at: at("15:00"),
    } });
    assert.ifError(reschedule.error);
    assert.ifError((await createBooking("11:00", "novo@example.com")).error);
    assert.ifError((await owner.rpc("manage_agenda", cancel)).error);
    assert.ifError((await createBooking("15:00", "liberado@example.com")).error);
  } finally {
    const purge = await root.from("businesses").delete().eq("id", id);
    await Promise.all(users.map((user) => root.auth.admin.deleteUser(user)));
    assert.ifError(purge.error);
  }
});
