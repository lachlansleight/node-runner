"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import { updateAppAction } from "@/actions/apps";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Section } from "@/components/ui/Section";
import type { DashApp } from "@/lib/types";

export function DomainsPanel({ app }: { app: DashApp }) {
  const [domains, setDomains] = useState(app.domains);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(next: string[]) {
    setError(null);
    start(async () => {
      const r = await updateAppAction(app.id, { domains: next });
      if (r.ok) setDomains(next);
      else setError(r.error ?? "Failed to update domains");
    });
  }

  function add() {
    const d = value.trim();
    if (!d || domains.includes(d)) return;
    setValue("");
    save([...domains, d]);
  }

  return (
    <Section title="Domains">
      <div className="flex flex-col gap-[12px]">
        <div className="flex flex-wrap gap-[8px]">
          {domains.length === 0 && (
            <span className="text-[12px] text-[var(--c-muted)]">
              None. Add one and point its DNS at the server — HTTPS is automatic.
            </span>
          )}
          {domains.map((d) => (
            <span
              key={d}
              className="inline-flex items-center gap-[8px] rounded-[6px] border border-[var(--c-border)] px-[10px] py-[5px] text-[12px]"
            >
              {d}
              <button
                onClick={() => save(domains.filter((x) => x !== d))}
                disabled={pending}
                className="text-[var(--c-muted)] hover:text-[var(--c-red)]"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-[8px]">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="app.example.com"
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button onClick={add} disabled={pending}>
            Add
          </Button>
        </div>
        {error && <p className="text-[12px] text-[var(--c-red)]">{error}</p>}
      </div>
    </Section>
  );
}
