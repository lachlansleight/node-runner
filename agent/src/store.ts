import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "./config";
import { decrypt, encrypt } from "./crypto";
import type { App } from "./types";

/**
 * In-memory app registry, persisted to a JSON file. Env var values are stored
 * encrypted on disk and decrypted into memory on load.
 */
let apps: App[] = [];

function encryptEnv(env: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(env ?? {})) out[k] = encrypt(v);
  return out;
}

function decryptEnv(env: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(env ?? {})) out[k] = decrypt(v);
  return out;
}

export function load(): void {
  if (!existsSync(config.stateFile)) {
    apps = [];
    return;
  }
  const raw = JSON.parse(readFileSync(config.stateFile, "utf8")) as App[];
  apps = raw.map((a) => ({ ...a, env: decryptEnv(a.env) }));
}

export function persist(): void {
  mkdirSync(dirname(config.stateFile), { recursive: true });
  const serializable = apps.map((a) => ({ ...a, env: encryptEnv(a.env) }));
  const tmp = `${config.stateFile}.tmp`;
  writeFileSync(tmp, JSON.stringify(serializable, null, 2), { mode: 0o600 });
  renameSync(tmp, config.stateFile);
}

export function list(): App[] {
  return apps;
}

export function get(id: string): App | undefined {
  return apps.find((a) => a.id === id);
}

export function upsert(app: App): void {
  const i = apps.findIndex((a) => a.id === app.id);
  if (i === -1) apps.push(app);
  else apps[i] = app;
  persist();
}

export function remove(id: string): void {
  apps = apps.filter((a) => a.id !== id);
  persist();
}
