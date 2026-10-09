"use client";

import { useActionState } from "react";
import { blockDates, type BlockState } from "./actions";

export function BlockDatesForm() {
  const [state, action, pending] = useActionState<BlockState, FormData>(blockDates, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
      <label className="grid gap-1 text-sm">
        <span className="text-muted">De</span>
        <input type="date" name="checkIn" required className="admin-input" />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-muted">Até (saída)</span>
        <input type="date" name="checkOut" required className="admin-input" />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-muted">Motivo (opcional)</span>
        <input name="note" placeholder="Uso próprio, manutenção…" className="admin-input" />
      </label>
      <button disabled={pending} className="button-primary rounded-xl disabled:opacity-60">
        Bloquear
      </button>
      {state.error && <p className="text-sm text-danger sm:col-span-4">{state.error}</p>}
      {state.ok && <p className="text-sm text-forest sm:col-span-4">Datas bloqueadas.</p>}
    </form>
  );
}
