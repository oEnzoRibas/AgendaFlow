"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminContext, publicClient, sessionClient } from "@/lib/supabase/server";
import { businessSlug } from "@/lib/supabase/config";
import { bookingSchema, manageSchema, slotQuery, type Confirmation, type Result, type Slot } from "@/lib/model";

function problem(code: string) {
  const messages: Record<string, string> = {
    "23P01": "O horário está ocupado ou coincide com um bloqueio. Escolha outro horário.",
    "23505": "Já existe um cadastro com esses dados.",
    "23503": "O cadastro relacionado não está disponível.",
    "42501": "Você não tem acesso a este estabelecimento.",
    "22023": "Confira os dados e o estado atual do agendamento.",
    "23514": "Confira os dados preenchidos.",
  };
  return messages[code] || "Não foi possível concluir. Tente novamente.";
}

/**
 * Consulta a disponibilidade publicada no Supabase. Somente o proprietário pode excluir a própria reserva para remarcar.
 * @param input - Consulta não confiável, validada por slotQuery.
 * @param administrative - Usa a sessão administrativa e exige vínculo com o estabelecimento.
 * @returns Vagas ou erro de domínio para apresentar no seletor.
 */
export async function listSlots(input: unknown, administrative = false): Promise<Result<Slot[]>> {
  const parsed = slotQuery.safeParse(input);
  if (!parsed.success || (!administrative && parsed.data.ignoreId)) return { ok: false, error: "Selecione um serviço, profissional e data." };
  const context = administrative ? await adminContext() : null;
  const db = administrative ? context?.db : publicClient();
  if (!db || (administrative && !context?.business)) return { ok: false, error: "Agendamento indisponível." };
  const { serviceId, professionalId, day, ignoreId } = parsed.data;
  const { data, error } = await db.rpc("available_slots", {
    p_slug: businessSlug(), p_service: serviceId, p_professional: professionalId, p_day: day, p_ignore: ignoreId ?? null,
  });
  if (error) return { ok: false, error: problem(error.code) };
  if (!data) return { ok: false, error: "Resposta indisponível. Tente novamente." };
  return { ok: true, value: data };
}

/**
 * Valida a confirmação recebida do portal e chama a reserva transacional no PostgreSQL.
 * @param input - Serviço, profissional, instante e contato ainda não validados.
 * @returns Resumo da reserva ou erro acionável; a operação pode perder a vaga para outra transação.
 */
export async function submitBooking(input: unknown): Promise<Result<Confirmation>> {
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const db = publicClient();
  if (!db) return { ok: false, error: "Agendamento online indisponível." };
  const { professionalId, serviceId, startsAt, contact } = parsed.data;
  const { data, error } = await db.rpc("create_booking", {
    p_slug: businessSlug(), p_service: serviceId, p_professional: professionalId, p_start: startsAt,
    p_name: contact.name, p_email: contact.email, p_phone: contact.phone,
  });
  if (error) return { ok: false, error: problem(error.code) };
  if (!data) return { ok: false, error: "Resposta indisponível. Tente novamente." };
  return { ok: true, value: data };
}

/**
 * Envia um comando validado ao banco após verificar sessão e escopo do proprietário.
 * @param input - Comando não confiável recebido do painel.
 * @param section - Seção candidata a revalidação após sucesso.
 * @returns Estado da mutação. A RPC verifica novamente o vínculo antes da escrita.
 */
export async function manage(input: unknown, section: string): Promise<Result> {
  const parsed = manageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { db, business } = await adminContext();
  if (!db || !business) return { ok: false, error: "Sua sessão expirou ou não tem acesso ao estabelecimento." };
  const { error } = await db.rpc("manage_agenda", {
    p_business: business.id, p_action: parsed.data.action, p_data: parsed.data.data,
  });
  if (error) return { ok: false, error: problem(error.code) };
  if (["painel", "agenda", "clientes", "servicos", "profissionais", "configuracoes"].includes(section)) revalidatePath("/admin/" + section);
  return { ok: true, value: null };
}

/**
 * Autentica o formulário por e-mail e senha e permite ao Supabase SSR gravar os cookies.
 * @param _ - Estado anterior da mensagem, mantido pela interface de useActionState.
 * @param form - Dados do formulário de login.
 * @returns Mensagem em caso de falha. No sucesso, o Next.js redireciona para o painel.
 */
export async function signIn(_: string | null, form: FormData) {
  const parsed = z.object({ email: z.email().max(254), password: z.string().min(1).max(1024) })
    .safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return "Confira o e-mail e a senha.";
  const db = await sessionClient();
  if (!db) return "Configure a conexão com o Supabase ou acesse a demonstração.";
  const { error } = await db.auth.signInWithPassword(parsed.data);
  if (error) return "Não foi possível entrar. Confira suas credenciais.";
  redirect("/admin/painel");
}

/**
 * Encerra a sessão local do Supabase e redireciona para o login.
 */
export async function signOut() {
  const db = await sessionClient();
  await db?.auth.signOut({ scope: "local" });
  redirect("/login");
}
