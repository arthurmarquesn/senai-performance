"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { login, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {
  error: undefined,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 hover:shadow-lg hover:shadow-red-600/20 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending && <Loader2 size={18} className="animate-spin" />}
      {pending ? "Entrando..." : "Entrar no sistema"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      {state.error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />

          <p>{state.error}</p>
        </div>
      )}

      <div className="grid gap-2">
        <label className="text-sm font-medium text-zinc-700">E-mail</label>

        <input
          name="email"
          type="email"
          placeholder="admin@sistema.local"
          className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-zinc-700">Senha</label>

        <input
          name="password"
          type="password"
          placeholder="••••••••"
          className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
        />
      </div>

      <SubmitButton />
    </form>
  );
}