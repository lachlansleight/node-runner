"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <main className="flex min-h-screen items-center justify-center p-[20px]">
      <form
        action={action}
        className="w-full max-w-[320px] rounded-[12px] border border-[var(--c-border)] bg-[var(--c-surface)] p-[24px]"
      >
        <h1 className="mb-[6px] text-[18px] font-semibold">
          <span className="text-[var(--c-accent)]">●</span> node-runner
        </h1>
        <p className="mb-[18px] text-[13px] text-[var(--c-muted)]">Enter your dashboard password.</p>
        <Input name="password" type="password" placeholder="Password" autoFocus />
        {state.error && <p className="mt-[10px] text-[12px] text-[var(--c-red)]">{state.error}</p>}
        <Button type="submit" variant="primary" disabled={pending} className="mt-[16px] w-full">
          {pending ? "…" : "Log in"}
        </Button>
      </form>
    </main>
  );
}
