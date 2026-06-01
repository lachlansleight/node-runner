import * as caddy from "./caddy";
import * as store from "./store";
import type { App, CreateAppInput, UpdateAppInput } from "./types";

export class ValidationError extends Error {}

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) throw new ValidationError("name must contain at least one alphanumeric character");
  return slug;
}

function assertPort(port: number, ignoreId?: string): void {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new ValidationError("port must be an integer between 1024 and 65535");
  }
  const clash = store.list().find((a) => a.port === port && a.id !== ignoreId);
  if (clash) throw new ValidationError(`port ${port} is already used by app "${clash.id}"`);
}

function normalizeSubdir(subdir: string | undefined): string {
  const s = (subdir ?? "").replace(/^\/+|\/+$/g, "").trim();
  if (!s) return "";
  if (!/^[\w./-]+$/.test(s) || s.split("/").includes("..")) {
    throw new ValidationError(`invalid subdir: ${subdir}`);
  }
  return s;
}

function assertDomains(domains: string[], ignoreId?: string): void {
  for (const d of domains) {
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(d)) {
      throw new ValidationError(`invalid domain: ${d}`);
    }
    const clash = store.list().find((a) => a.id !== ignoreId && a.domains.includes(d));
    if (clash) throw new ValidationError(`domain ${d} is already used by app "${clash.id}"`);
  }
}

export function create(input: CreateAppInput): App {
  if (!input.name) throw new ValidationError("name is required");
  if (!input.repoUrl) throw new ValidationError("repoUrl is required");
  if (!input.startCommand) throw new ValidationError("startCommand is required");

  const id = slugify(input.name);
  if (store.get(id)) throw new ValidationError(`an app named "${id}" already exists`);

  const domains = input.domains ?? [];
  assertPort(input.port);
  assertDomains(domains);

  const now = new Date().toISOString();
  const app: App = {
    id,
    name: input.name,
    repoUrl: input.repoUrl,
    branch: input.branch ?? "main",
    installCommand: input.installCommand ?? "npm ci",
    buildCommand: input.buildCommand ?? "",
    startCommand: input.startCommand,
    subdir: normalizeSubdir(input.subdir),
    port: input.port,
    domains,
    nodeVersion: input.nodeVersion,
    env: input.env ?? {},
    status: "created",
    createdAt: now,
    updatedAt: now,
  };
  store.upsert(app);
  return app;
}

export async function update(id: string, patch: UpdateAppInput): Promise<App> {
  const app = store.get(id);
  if (!app) throw new ValidationError(`app not found: ${id}`);

  if (patch.port !== undefined) assertPort(patch.port, id);
  if (patch.domains !== undefined) assertDomains(patch.domains, id);

  Object.assign(app, {
    repoUrl: patch.repoUrl ?? app.repoUrl,
    branch: patch.branch ?? app.branch,
    installCommand: patch.installCommand ?? app.installCommand,
    buildCommand: patch.buildCommand ?? app.buildCommand,
    startCommand: patch.startCommand ?? app.startCommand,
    subdir: patch.subdir !== undefined ? normalizeSubdir(patch.subdir) : app.subdir,
    port: patch.port ?? app.port,
    domains: patch.domains ?? app.domains,
    nodeVersion: patch.nodeVersion ?? app.nodeVersion,
    env: patch.env ?? app.env,
    updatedAt: new Date().toISOString(),
  });
  store.upsert(app);

  // Domain/port changes affect routing even before the next deploy.
  if (patch.domains !== undefined || patch.port !== undefined) {
    await caddy.apply(store.list());
  }
  return app;
}

/** Strip secrets before returning an app over the API. */
export function redact(app: App): Omit<App, "env"> & { envKeys: string[] } {
  const { env, ...rest } = app;
  return { ...rest, envKeys: Object.keys(env) };
}
