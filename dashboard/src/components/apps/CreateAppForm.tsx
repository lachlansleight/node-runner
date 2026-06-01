"use client";

import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { createAppAction } from "@/actions/apps";
import { parseEnvText, parseList } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

const initial = {
  name: "",
  repoUrl: "",
  branch: "main",
  subdir: "",
  installCommand: "npm ci",
  buildCommand: "",
  startCommand: "",
  port: "",
  nodeVersion: "",
  domains: "",
  env: "",
};

export function CreateAppForm() {
  const [f, setF] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set =
    (k: keyof typeof initial) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setF((s) => ({ ...s, [k]: e.target.value }));

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const port = Number(f.port);
    if (!f.name || !f.repoUrl || !f.startCommand || !port) {
      setError("Name, repo URL, start command and port are required.");
      return;
    }
    start(async () => {
      const res = await createAppAction({
        name: f.name,
        repoUrl: f.repoUrl,
        branch: f.branch || "main",
        subdir: f.subdir || undefined,
        installCommand: f.installCommand,
        buildCommand: f.buildCommand || undefined,
        startCommand: f.startCommand,
        port,
        nodeVersion: f.nodeVersion || undefined,
        domains: parseList(f.domains),
        env: parseEnvText(f.env),
      });
      if (res && !res.ok) setError(res.error ?? "Failed to create app");
    });
  }

  return (
    <Card className="p-[20px]">
      <form onSubmit={submit} className="flex flex-col gap-[16px]">
        <div className="grid grid-cols-[1fr_1fr] gap-[16px]">
          <Field label="Name">
            <Input value={f.name} onChange={set("name")} placeholder="my-app" autoFocus />
          </Field>
          <Field label="Internal port">
            <Input value={f.port} onChange={set("port")} placeholder="3001" inputMode="numeric" />
          </Field>
        </div>

        <Field label="Repository URL" hint="https://github.com/you/repo.git or git@github.com:you/repo.git (private)">
          <Input value={f.repoUrl} onChange={set("repoUrl")} placeholder="https://github.com/you/repo.git" />
        </Field>

        <div className="grid grid-cols-[1fr_1fr] gap-[16px]">
          <Field label="Branch">
            <Input value={f.branch} onChange={set("branch")} placeholder="main" />
          </Field>
          <Field label="Subdirectory" hint="optional, for monorepos">
            <Input value={f.subdir} onChange={set("subdir")} placeholder="packages/web" />
          </Field>
        </div>

        <div className="grid grid-cols-[1fr_1fr] gap-[16px]">
          <Field label="Install command">
            <Input value={f.installCommand} onChange={set("installCommand")} placeholder="npm ci" />
          </Field>
          <Field label="Build command" hint="optional">
            <Input value={f.buildCommand} onChange={set("buildCommand")} placeholder="npm run build" />
          </Field>
        </div>

        <div className="grid grid-cols-[1fr_1fr] gap-[16px]">
          <Field label="Start command">
            <Input value={f.startCommand} onChange={set("startCommand")} placeholder="node dist/server.js" />
          </Field>
          <Field label="Node version" hint="optional, e.g. 22">
            <Input value={f.nodeVersion} onChange={set("nodeVersion")} placeholder="system default" />
          </Field>
        </div>

        <Field label="Domains" hint="space or comma separated; point each at the server's IP">
          <Input value={f.domains} onChange={set("domains")} placeholder="app.example.com" />
        </Field>

        <Field label="Environment variables" hint="one KEY=value per line">
          <Textarea value={f.env} onChange={set("env")} rows={4} placeholder={"DATABASE_URL=...\nAPI_KEY=..."} />
        </Field>

        {error && <p className="text-[12px] text-[var(--c-red)]">{error}</p>}

        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Creating…" : "Create app"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
