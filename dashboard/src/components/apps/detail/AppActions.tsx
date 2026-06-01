"use client";

import { useState, useTransition } from "react";
import { deployAppAction, startAppAction, stopAppAction, type ActionResult } from "@/actions/apps";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { DashApp } from "@/lib/types";
import { DeleteAppButton } from "./DeleteAppButton";

export function AppActions({ app }: { app: DashApp }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<ActionResult>) => () => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (r && !r.ok) setError(r.error ?? "Action failed");
    });
  };

  return (
    <Card className="flex flex-col gap-[10px] p-[16px]">
      <div className="flex flex-wrap items-center gap-[8px]">
        <Button variant="primary" disabled={pending} onClick={run(() => deployAppAction(app.id))}>
          {pending ? "Working…" : "Deploy"}
        </Button>
        {app.status === "running" ? (
          <Button disabled={pending} onClick={run(() => stopAppAction(app.id))}>
            Stop
          </Button>
        ) : (
          <Button disabled={pending} onClick={run(() => startAppAction(app.id))}>
            Start
          </Button>
        )}
        <div className="ml-auto">
          <DeleteAppButton id={app.id} />
        </div>
      </div>
      {error && <p className="text-[12px] text-[var(--c-red)]">{error}</p>}
    </Card>
  );
}
