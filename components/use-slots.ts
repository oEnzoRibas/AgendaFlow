"use client";

import { useEffect, useState } from "react";
import { listSlots } from "@/app/actions";
import { getSlots } from "@/lib/schedule";
import type { Result, Slot, SlotQuery, Workspace } from "@/lib/model";

/**
 * Resolve vagas localmente ou pela ação do servidor, ignorando respostas de consultas obsoletas.
 * @param query - Consulta, ou null enquanto serviço, profissional e data não estiverem prontos.
 * @param demo - Workspace sintético quando o fluxo usa simulação local.
 * @param administrative - Solicita o caminho de remarcação com sessão.
 * @returns Vagas, estado de carregamento, erro exibível e função de nova consulta.
 */
export function useSlots(query: SlotQuery | null, demo: Workspace | null, administrative = false) {
  const key = query ? JSON.stringify(query) : "";
  const [answer, setAnswer] = useState<{ key: string; result: Result<Slot[]> }>();
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!key || demo) return;
    let current = true;
    listSlots(JSON.parse(key), administrative).then((result) => {
      if (current) setAnswer({ key, result });
    }).catch(() => {
      if (current) setAnswer({ key, result: { ok: false, error: "Não foi possível consultar os horários." } });
    });
    return () => { current = false; };
  }, [key, demo, administrative, retry]);

  const result = demo && query ? { ok: true, value: getSlots(demo, query) } as const : answer?.key === key ? answer.result : undefined;
  return { slots: result?.ok ? result.value : [], error: result && !result.ok ? result.error : "",
    loading: Boolean(query && !result), refresh: () => { setAnswer(undefined); setRetry((value) => value + 1); } };
}
