"use client";

import { useState, useTransition } from "react";
import { updateAppAction } from "@/actions/apps";
import { parseEnvText } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { Textarea } from "@/components/ui/Textarea";
import type { DashApp } from "@/lib/types";

export function EnvPanel({ app }: { app: DashApp }) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setMsg(null);
    start(async () => {
      const r = await updateAppAction(app.id, { env: parseEnvText(text) });
      setMsg(r.ok ? "Saved — redeploy to apply." : (r.error ?? "Failed"));
      if (r.ok) setText("");
    });
  }

  return (
    <Section title="Environment variables">
      <div className="flex flex-col gap-[12px]">
        <div className="flex flex-wrap gap-[6px]">
          {app.envKeys.length === 0 ? (
            <span className="text-[12px] text-[var(--c-muted)]">None set.</span>
          ) : (
            app.envKeys.map((k) => (
              <span
                key={k}
                className="rounded-[6px] border border-[var(--c-border)] px-[8px] py-[3px] font-mono text-[12px]"
              >
                {k}
              </span>
            ))
          )}
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder={"Replace ALL env vars — one KEY=value per line"}
        />
        <p className="text-[11px] text-[var(--c-muted)]">
          Values are write-only (never shown). Saving replaces the full set; don&apos;t save to keep
          current values.
        </p>
        <div className="flex items-center gap-[10px]">
          <Button onClick={save} disabled={pending || !text.trim()}>
            Save env
          </Button>
          {msg && <span className="text-[12px] text-[var(--c-muted)]">{msg}</span>}
        </div>
      </div>
    </Section>
  );
}
