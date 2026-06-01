import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "./config";
import * as deploy from "./deploy";
import * as store from "./store";

let cached: string | null = null;

/** The webhook secret: from env, else a persisted random one (generated on first use). */
export function webhookSecret(): string {
  if (cached) return cached;
  if (config.webhookSecret) return (cached = config.webhookSecret);
  if (existsSync(config.webhookSecretFile)) {
    return (cached = readFileSync(config.webhookSecretFile, "utf8").trim());
  }
  const secret = randomBytes(32).toString("hex");
  mkdirSync(dirname(config.webhookSecretFile), { recursive: true });
  writeFileSync(config.webhookSecretFile, secret + "\n", { mode: 0o600 });
  return (cached = secret);
}

/** Verify GitHub's X-Hub-Signature-256 header against the raw request body. */
export function verifySignature(rawBody: string, header: string | undefined): boolean {
  if (!header) return false;
  const expected = "sha256=" + createHmac("sha256", webhookSecret()).update(rawBody).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Reduce any git URL to "host/owner/repo" for comparison across https/ssh forms. */
export function normalizeRepo(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^git\+/, "")
    .replace(/^https?:\/\//, "")
    .replace(/^ssh:\/\//, "")
    .replace(/^git@/, "")
    .replace(/:/, "/") // git@host:owner/repo -> host/owner/repo (first colon only)
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
}

interface PushPayload {
  ref?: string;
  repository?: { clone_url?: string; ssh_url?: string; html_url?: string };
}

/** Apps whose repo + branch match this push. */
export function appsForPush(payload: PushPayload) {
  const ref = payload.ref ?? "";
  if (!ref.startsWith("refs/heads/")) return [];
  const branch = ref.slice("refs/heads/".length);
  const repo = payload.repository ?? {};
  const candidates = [repo.clone_url, repo.ssh_url, repo.html_url]
    .filter((u): u is string => Boolean(u))
    .map(normalizeRepo);
  return store.list().filter((a) => a.branch === branch && candidates.includes(normalizeRepo(a.repoUrl)));
}

/** Fire off redeploys for all matching apps (non-blocking). Returns their ids. */
export function triggerPush(payload: PushPayload): string[] {
  const apps = appsForPush(payload);
  for (const app of apps) {
    deploy.deploy(app.id).catch((err) => {
      console.error(`webhook deploy failed for ${app.id}:`, err instanceof Error ? err.message : err);
    });
  }
  return apps.map((a) => a.id);
}
