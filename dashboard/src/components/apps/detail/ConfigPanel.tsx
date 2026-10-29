"use client";

import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { updateAppAction } from "@/actions/apps";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Section } from "@/components/ui/Section";
import type { DashApp } from "@/lib/types";
import { InfoRow } from "./InfoRow";

function toForm(app: DashApp) {
  return {
    branch: app.branch,
    subdir: app.subdir,
    installCommand: app.installCommand,
    buildCommand: app.buildCommand,
    startCommand: app.startCommand,
    port: String(app.port),
    nodeVersion: app.nodeVersion ?? "",
  };
}

type Form = ReturnType<typeof toForm>;

export function ConfigPanel({ app }: { app: DashApp }) {
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState<Form>(() => toForm(app));
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set = (k: keyof Form) => (e: ChangeEvent<HTMLInputElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  function openEditor() {
    setF(toForm(app));
    setError(null);
    setMsg(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const port = Number(f.port);
    if (!f.branch.trim()) return setError("Branch is required.");
    if (!f.startCommand.trim()) return setError("Start command is required.");
    if (!Number.isInteger(port) || port < 1024 || port > 65535) {
      return setError("Port must be an integer between 1024 and 65535.");
    }

    start(async () => {
      const r = await updateAppAction(app.id, {
        branch: f.branch.trim(),
        subdir: f.subdir.trim(),
        installCommand: f.installCommand.trim(),
        buildCommand: f.buildCommand.trim(),
        startCommand: f.startCommand.trim(),
        port,
        // Empty string clears the pin (system default); the agent normalizes it.
        nodeVersion: f.nodeVersion.trim(),
      });
      if (!r.ok) {
        setError(r.error ?? "Failed to save configuration");
        return;
      }
      setEditing(false);
      setMsg("Saved — redeploy to apply.");
    });
  }

  const action = editing ? null : (
    <Button variant="ghost" className="px-[8px] py-[4px]" onClick={openEditor}>
      Edit
    </Button>
  );

  if (!editing) {
    return (
      <Section title="Configuration" action={action}>
        <div className="flex flex-col">
          <InfoRow label="Repository" value={app.repoUrl} mono />
          <InfoRow label="Branch" value={app.branch} mono />
          {app.subdir && <InfoRow label="Subdirectory" value={app.subdir} mono />}
          <InfoRow label="Install" value={app.installCommand || "—"} mono />
          <InfoRow label="Build" value={app.buildCommand || "—"} mono />
          <InfoRow label="Start" value={app.startCommand} mono />
          <InfoRow label="Port" value={app.port} mono />
          <InfoRow label="Node" value={app.nodeVersion ?? "system default"} mono />
        </div>
        {msg && <p className="mt-[10px] text-[12px] text-[var(--c-muted)]">{msg}</p>}
      </Section>
    );
  }

  return (
    <Section title="Configuration">
      <form onSubmit={submit} className="flex flex-col gap-[14px]">
        <InfoRow label="Repository" value={app.repoUrl} mono />

        <div className="grid grid-cols-[1fr_1fr] gap-[14px]">
          <Field label="Branch">
            <Input value={f.branch} onChange={set("branch")} placeholder="main" />
          </Field>
          <Field label="Subdirectory" hint="optional, for monorepos">
            <Input value={f.subdir} onChange={set("subdir")} placeholder="packages/web" />
          </Field>
        </div>

        <div className="grid grid-cols-[1fr_1fr] gap-[14px]">
          <Field label="Install command" hint="leave empty to skip">
            <Input value={f.installCommand} onChange={set("installCommand")} placeholder="npm ci" />
          </Field>
          <Field label="Build command" hint="optional">
            <Input value={f.buildCommand} onChange={set("buildCommand")} placeholder="npm run build" />
          </Field>
        </div>

        <div className="grid grid-cols-[1fr_1fr] gap-[14px]">
          <Field label="Start command">
            <Input value={f.startCommand} onChange={set("startCommand")} placeholder="node dist/server.js" />
          </Field>
          <Field label="Internal port">
            <Input value={f.port} onChange={set("port")} placeholder="3001" inputMode="numeric" />
          </Field>
        </div>

        <Field label="Node version" hint="optional, e.g. 22 — leave empty for the system default">
          <Input value={f.nodeVersion} onChange={set("nodeVersion")} placeholder="system default" />
        </Field>

        <p className="text-[11px] text-[var(--c-muted)]">
          Changes take effect on the next deploy. A port change re-routes traffic immediately, so redeploy right after saving.
        </p>

        {error && <p className="text-[12px] text-[var(--c-red)]">{error}</p>}

        <div className="flex items-center justify-end gap-[8px]">
          <Button type="button" variant="ghost" onClick={cancel} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Section>
  );
}
