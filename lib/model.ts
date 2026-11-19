import { z } from "zod";

export const identity = z.uuid();
const name = z.string().trim().min(2, "Informe pelo menos 2 caracteres.").max(100);
const description = z.string().trim().max(500);
const hour = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const dayKey = z.iso.date();
export const instant = z.iso.datetime({ offset: true });
export const contactSchema = z.object({
  name,
  email: z.email("Informe um e-mail válido.").max(254).transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(24).regex(/^[0-9+() .-]+$/, "Informe um telefone válido.")
    .refine((phone) => /^\d{10,15}$/.test(phone.replace(/\D/g, "")), "Informe de 10 a 15 dígitos."),
});
export const slotQuery = z.object({ day: dayKey, serviceId: identity, professionalId: identity, ignoreId: identity.optional() });
export const bookingSchema = slotQuery.omit({ day: true, ignoreId: true }).extend({
  startsAt: instant,
  contact: contactSchema,
});
export const hoursSchema = z.array(z.object({
  weekday: z.number().int().min(0).max(6),
  opens_at: hour,
  closes_at: hour,
}).refine((entry) => entry.opens_at < entry.closes_at, "O fechamento deve ser depois da abertura."))
  .max(7).refine((hours) => new Set(hours.map((entry) => entry.weekday)).size === hours.length);

const editableId = identity.optional();
export const manageSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("client"), data: contactSchema.extend({ id: editableId }) }),
  z.object({ action: z.literal("service"), data: z.object({
    id: editableId, name, description, duration_minutes: z.number().int().min(5).max(480),
    price_cents: z.number().int().min(0).max(10000000), active: z.boolean(),
  }) }),
  z.object({ action: z.literal("professional"), data: z.object({
    id: editableId, name, specialty: z.string().trim().max(100), active: z.boolean(),
    service_ids: z.array(identity).max(200).transform((ids) => [...new Set(ids)]), hours: hoursSchema,
  }) }),
  z.object({ action: z.literal("settings"), data: z.object({
    name, description, public_booking: z.boolean(), buffer_minutes: z.number().int().min(0).max(120),
    timezone: z.string().max(100).refine((value) => {
      try { new Intl.DateTimeFormat("pt-BR", { timeZone: value }); return true; }
      catch { return false; }
    }, "Informe um fuso horário válido."),
    hours: hoursSchema,
  }) }),
  z.object({ action: z.literal("block"), data: z.object({
    professional_id: identity, starts_at: instant, ends_at: instant, reason: z.string().trim().max(100),
  }).refine((block) => Date.parse(block.starts_at) < Date.parse(block.ends_at), "O fim deve ser depois do início.") }),
  z.object({ action: z.literal("unblock"), data: z.object({ id: identity }) }),
  z.object({ action: z.literal("appointment"), data: z.discriminatedUnion("operation", [
    z.object({ id: identity, operation: z.literal("reschedule"), starts_at: instant }),
    z.object({ id: identity, operation: z.enum(["cancelled", "completed"]) }),
  ]) }),
]);

export type BookingInput = z.infer<typeof bookingSchema>;
export type SlotQuery = z.infer<typeof slotQuery>;
export type Manage = z.infer<typeof manageSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type Hours = z.infer<typeof hoursSchema>[number];
export type Business = { id: string; slug: string; name: string; description: string; timezone: string; buffer_minutes: number; public_booking: boolean };
export type Service = { id: string; name: string; description: string; duration_minutes: number; price_cents: number; active: boolean };
export type Professional = { id: string; name: string; specialty: string; active: boolean };
export type Client = Contact & { id: string };
export type Assignment = { professional_id: string; service_id: string };
export type Rule = Hours & { professional_id: string | null };
export type Block = { id: string; professional_id: string; starts_at: string; ends_at: string; reason: string };
export type Slot = { starts_at: string; ends_at: string; busy_until: string; price_cents: number };
export type Status = "confirmed" | "completed" | "cancelled";
export type Appointment = Slot & { id: string; professional_id: string; service_id: string; client_id: string; status: Status };
export type Catalog = { business: Business; services: Service[]; professionals: Professional[]; professional_services: Assignment[] };
export type Workspace = Catalog & { clients: Client[]; appointments: Appointment[]; availability_rules: Rule[]; blocked_periods: Block[] };
export type Confirmation = Pick<Appointment, "id" | "starts_at" | "ends_at" | "price_cents">;
export type Result<T = null> = { ok: true; value: T } | { ok: false; error: string };
