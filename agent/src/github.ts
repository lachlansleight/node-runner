import { createSign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { config } from "./config";

/**
 * Minimal GitHub App client. Mints short-lived JWTs (RS256) from the App's
 * private key, exchanges them for installation access tokens, and exposes the
 * handful of REST calls the dashboard + deploy path need. No external deps.
 */

const API = "https://api.github.com";
const UA = "node-runner-agent";

let privateKeyCache: string | null = null;

/** PEM private key, from the file (preferred) or inline env. */
function privateKey(): string {
  if (privateKeyCache) return privateKeyCache;
  if (config.githubAppPrivateKeyFile && existsSync(config.githubAppPrivateKeyFile)) {
    return (privateKeyCache = readFileSync(config.githubAppPrivateKeyFile, "utf8"));
  }
  // Inline keys may arrive with literal "\n" from a single-line env var.
  return (privateKeyCache = config.githubAppPrivateKey.replace(/\\n/g, "\n"));
}

/** Whether the App is configured enough to talk to GitHub. */
export function configured(): boolean {
  return Boolean(config.githubAppId && privateKey().includes("PRIVATE KEY"));
}

/** Install/configure URL for the App, or null if the slug isn't set. */
export function installUrl(): string | null {
  return config.githubAppSlug
    ? `https://github.com/apps/${config.githubAppSlug}/installations/new`
    : null;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/** Short-lived (≤10 min) App JWT, used to enumerate installations + mint tokens. */
function appJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ iat: now - 60, exp: now + 540, iss: config.githubAppId }));
  const signature = b64url(createSign("RSA-SHA256").update(`${header}.${payload}`).sign(privateKey()));
  return `${header}.${payload}.${signature}`;
}

interface FetchOpts {
  jwt?: boolean;
  token?: string;
  method?: string;
  body?: unknown;
}

async function gh<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  if (!configured()) throw new Error("GitHub App is not configured");
  const auth = opts.token ? `token ${opts.token}` : `Bearer ${appJwt()}`;
  const res = await fetch(`${API}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      authorization: auth,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": UA,
      ...(opts.body ? { "content-type": "application/json" } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      message = (JSON.parse(text) as { message?: string }).message ?? text;
    } catch {
      /* keep raw */
    }
    throw new Error(`GitHub API ${res.status}: ${message}`);
  }
  return res.json() as Promise<T>;
}

/** Walk page-based pagination, collecting items until a short page is returned. */
async function paginate<T>(path: string, token: string | undefined, pick: (page: unknown) => T[]): Promise<T[]> {
  const out: T[] = [];
  const sep = path.includes("?") ? "&" : "?";
  for (let page = 1; page <= 20; page++) {
    const data = await gh<unknown>(`${path}${sep}per_page=100&page=${page}`, token ? { token } : { jwt: true });
    const items = pick(data);
    out.push(...items);
    if (items.length < 100) break;
  }
  return out;
}

export interface Installation {
  id: number;
  account: string;
  accountType: string;
}

interface RawInstallation {
  id: number;
  account: { login: string; type: string } | null;
}

export async function listInstallations(): Promise<Installation[]> {
  const raw = await paginate<RawInstallation>("/app/installations", undefined, (p) => p as RawInstallation[]);
  return raw.map((i) => ({
    id: i.id,
    account: i.account?.login ?? "unknown",
    accountType: i.account?.type ?? "User",
  }));
}

const tokenCache = new Map<number, { token: string; expiresAt: number }>();

/** Installation access token (valid ~1h), cached until a minute before expiry. */
export async function installationToken(installationId: number): Promise<string> {
  const cached = tokenCache.get(installationId);
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;
  const res = await gh<{ token: string; expires_at: string }>(
    `/app/installations/${installationId}/access_tokens`,
    { jwt: true, method: "POST" },
  );
  tokenCache.set(installationId, { token: res.token, expiresAt: new Date(res.expires_at).getTime() });
  return res.token;
}

export interface Repo {
  fullName: string;
  name: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
  cloneUrl: string;
  installationId: number;
}

interface RawRepo {
  full_name: string;
  name: string;
  owner: { login: string };
  private: boolean;
  default_branch: string;
  clone_url: string;
}

/** Every repo the App can access, across all installations, sorted by name. */
export async function listRepos(): Promise<Repo[]> {
  const installations = await listInstallations();
  const repos: Repo[] = [];
  for (const inst of installations) {
    const token = await installationToken(inst.id);
    const raw = await paginate<RawRepo>(
      "/installation/repositories",
      token,
      (p) => (p as { repositories?: RawRepo[] }).repositories ?? [],
    );
    for (const r of raw) {
      repos.push({
        fullName: r.full_name,
        name: r.name,
        owner: r.owner.login,
        private: r.private,
        defaultBranch: r.default_branch,
        cloneUrl: r.clone_url,
        installationId: inst.id,
      });
    }
  }
  return repos.sort((a, b) => a.fullName.localeCompare(b.fullName));
}

interface RawBranch {
  name: string;
}

export async function listBranches(installationId: number, owner: string, repo: string): Promise<string[]> {
  const token = await installationToken(installationId);
  const raw = await paginate<RawBranch>(
    `/repos/${owner}/${repo}/branches`,
    token,
    (p) => p as RawBranch[],
  );
  return raw.map((b) => b.name);
}
