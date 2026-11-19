"use client";

import { useSyncExternalStore } from "react";
import { makeDemo } from "./demo";
import { dayIn, defaultZone } from "./schedule";
import type { Result, Workspace } from "./model";

const key = "agendaflow-studio-bloom-v1";
let memory: { raw: string | null; day: string; data: Workspace } | undefined;

function snapshot() {
  let raw: string | null = null;
  try { raw = localStorage.getItem(key); } catch { /* use page memory */ }
  const day = dayIn(new Date(), defaultZone);
  if (memory?.raw === raw && memory.day === day) return memory.data;
  let data = makeDemo();
  if (raw) {
    try { const saved = JSON.parse(raw); if (saved.day === day) data = saved.data; } catch { /* start fresh */ }
  }
  memory = { raw, day, data };
  return data;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(key, onChange);
  window.addEventListener("focus", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(key, onChange);
    window.removeEventListener("focus", onChange);
  };
}

/**
 * Assina o snapshot fictício com consistência entre hidratação e navegador.
 * @returns Workspace atual, ou null durante renderização no servidor.
 */
export const useDemo = () => useSyncExternalStore(subscribe, snapshot, () => null);

async function locked<T>(operation: () => T): Promise<T> {
  return navigator.locks ? navigator.locks.request(key, operation) : operation();
}

/**
 * Executa uma mutação contra o snapshot mais recente e persiste resultados bem-sucedidos.
 * Quando disponível, Web Locks serializa as operações da mesma origem.
 * @param operation - Transformação que devolve estado e valor, ou erro.
 * @returns Resultado da operação. Sem localStorage, a sessão mantém o resultado em memória.
 */
export function changeDemo<T>(operation: (data: Workspace) => Result<{ data: Workspace; value: T }>) {
  return locked(() => {
    const result = operation(snapshot());
    if (!result.ok) return result;
    const day = dayIn(new Date(), defaultZone);
    const raw = JSON.stringify({ day, data: result.value.data });
    try {
      localStorage.setItem(key, raw);
      memory = { raw, day, data: result.value.data };
    } catch {
      memory = { raw: null, day, data: result.value.data };
    }
    window.dispatchEvent(new Event(key));
    return { ok: true, value: result.value.value } as const;
  });
}

/**
 * Descarta o snapshot persistido e notifica assinantes para recriar os dados do dia.
 */
export function resetDemo() {
  return locked(() => {
    try { localStorage.removeItem(key); } catch { /* clear page memory */ }
    memory = undefined;
    window.dispatchEvent(new Event(key));
  });
}
