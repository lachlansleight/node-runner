"use client";

import { useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { createAppAction } from "@/actions/apps";
import { listBranchesAction } from "@/actions/github";
import { parseEnvText, parseList } from "@/lib/format";
import type { GithubRepo, GithubStatus } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
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

interface Props {
  github: GithubStatus | null;
  repos: GithubRepo[];
}

export function CreateAppForm({ github, repos }: Props) {
  const canPick = repos.length > 0;
  const [mode, setMode] = useState<"github" | "manual">(canPick ? "github" : "manual");
  const [f, setF] = useState(initial);
  const [selected, setSelected] = useState<GithubRepo | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [branchesPending, startBranches] = useTransition();

  const set =
    (k: keyof typeof initial) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setF((s) => ({ ...s, [k]: e.target.value }));

  function pickRepo(e: ChangeEvent<HTMLSelectElement>) {
    const repo = repos.find((r) => r.fullName === e.target.value) ?? null;
    setSelected(repo);
    setBranches([]);
    if (!repo) return;
    // Auto-fill the name from the repo (unless the user already typed one).
    setF((s) => ({
      ...s,
      name: s.name && s.name !== "" ? s.name : repo.name,
      branch: repo.defaultBranch,
    }));
    startBranches(async () => {
      const res = await listBranchesAction(repo.owner, repo.name, repo.installationId);
      setBranches(res.branches.length ? res.branches : [repo.defaultBranch]);
    });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const port = Number(f.port);
    if (!f.name || !f.startCommand || !port) {
      setError("Name, start command and port are required.");
      return;
    }

    const shared = {
      name: f.name,
      branch: f.branch || "main",
      subdir: f.subdir || undefined,
      installCommand: f.installCommand,
      buildCommand: f.buildCommand || undefined,
      startCommand: f.startCommand,
      port,
      nodeVersion: f.nodeVersion || undefined,
      domains: parseList(f.domains),
      env: parseEnvText(f.env),
    };

    let source: { repoUrl?: string; repoFullName?: string; installationId?: number };
    if (mode === "github") {
      if (!selected) {
        setError("Pick a repository.");
        return;
      }
      source = { repoFullName: selected.fullName, installationId: selected.installationId };
    } else {
      if (!f.repoUrl) {
        setError("Repository URL is required.");
        return;
      }
      source = { repoUrl: f.repoUrl };
    }

    start(async () => {
      const res = await createAppAction({ ...shared, ...source });
      if (res && !res.ok) setError(res.error ?? "Failed to create app");
    });
  }

  // GitHub App is configured on the server but no repos are accessible yet.
  const needsInstall = github?.configured && repos.length === 0 && github.installUrl;

  return (
    <Card className="p-[20px]">
      <form onSubmit={submit} className="flex flex-col gap-[16px]">
        {/* Repo source ------------------------------------------------------ */}
        {mode === "github" ? (
          <>
            <Field label="Repository" hint="Pick a repo your GitHub App can access. Pushes to the branch auto-deploy.">
              <Select value={selected?.fullName ?? ""} onChange={pickRepo}>
                <option value="">Select a repository…</option>
                {repos.map((r) => (
                  <option key={`${r.installationId}:${r.fullName}`} value={r.fullName}>
                    {r.fullName}
                    {r.private ? " (private)" : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <button
              type="button"
              onClick={() => setMode("manual")}
              className="self-start text-[12px] text-[var(--c-muted)] underline hover:text-[var(--c-text)]"
            >
              Enter a repository URL manually instead
            </button>
          </>
        ) : (
          <>
            <Field
              label="Repository URL"
              hint="https://github.com/you/repo.git or git@github.com:you/repo.git (private)"
            >
              <Input
                value={f.repoUrl}
                onChange={set("repoUrl")}
                placeholder="https://github.com/you/repo.git"
              />
            </Field>
            {canPick && (
              <button
                type="button"
                onClick={() => setMode("github")}
                className="self-start text-[12px] text-[var(--c-muted)] underline hover:text-[var(--c-text)]"
              >
                Pick from your GitHub App repositories instead
              </button>
            )}
          </>
        )}

        {needsInstall && (
          <p className="text-[12px] text-[var(--c-muted)]">
            No repositories available yet.{" "}
            <a
              href={github!.installUrl!}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-[var(--c-text)]"
            >
              Install / configure the GitHub App
            </a>{" "}
            to grant access, then refresh.
          </p>
        )}

        {/* Name + port ------------------------------------------------------ */}
        <div className="grid grid-cols-[1fr_1fr] gap-[16px]">
          <Field label="Name">
            <Input value={f.name} onChange={set("name")} placeholder="my-app" />
          </Field>
          <Field label="Internal port">
            <Input value={f.port} onChange={set("port")} placeholder="3001" inputMode="numeric" />
          </Field>
        </div>

        {/* Branch + subdir -------------------------------------------------- */}
        <div className="grid grid-cols-[1fr_1fr] gap-[16px]">
          <Field label="Branch" hint={branchesPending ? "loading branches…" : undefined}>
            {mode === "github" && branches.length > 0 ? (
              <Select
                value={f.branch}
                onChange={(e) => setF((s) => ({ ...s, branch: e.target.value }))}
              >
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            ) : (
              <Input value={f.branch} onChange={set("branch")} placeholder="main" />
            )}
          </Field>
          <Field label="Subdirectory" hint="optional, for monorepos">
            <Input value={f.subdir} onChange={set("subdir")} placeholder="packages/web" />
          </Field>
        </div>

        {/* Commands --------------------------------------------------------- */}
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
