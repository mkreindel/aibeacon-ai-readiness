"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/admin/login/actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="font-medium">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="font-medium">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </div>
      {state.error && (
        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-5 py-2.5 font-medium text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
