"use client";

import { useActionState } from "react";
import { login } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="mt-6 grid gap-3">
      <label className="grid gap-1 text-sm">
        <span className="text-muted">Senha</span>
        <input name="password" type="password" autoComplete="current-password" required className="rounded-lg border border-sand bg-white px-3 py-2" />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="rounded-lg bg-forest px-5 py-2.5 font-medium text-white disabled:opacity-60">
        Entrar
      </button>
    </form>
  );
}
