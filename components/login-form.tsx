"use client";

import { useActionState } from "react";
import { signIn } from "@/app/actions";
import { Alert } from "./shared";
import { Button } from "./ui/button";

export function LoginForm({ enabled }: { enabled: boolean }) {
  const [error, submit, pending] = useActionState(signIn, null);
  return <form action={submit} className="field-stack">
    <label>E-mail<input name="email" type="email" autoComplete="username" required maxLength={254} disabled={!enabled} /></label>
    <label>Senha<input name="password" type="password" autoComplete="current-password" required maxLength={1024} disabled={!enabled} /></label>
    <Alert>{error}</Alert>
    {!enabled && <p className="muted">O acesso administrativo fica disponível após configurar o Supabase.</p>}
    <Button type="submit" disabled={!enabled || pending}>{pending ? "Entrando…" : "Entrar"}</Button>
  </form>;
}
