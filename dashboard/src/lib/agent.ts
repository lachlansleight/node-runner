import "server-only";
import type {
  CreateAppInput,
  DashApp,
  GithubRepo,
  GithubStatus,
  UpdateAppInput,
  WebhookInfo,
} from "./types";

/**
 * Server-only client for the node-runner agent API. The bearer token never
 * reaches the browser — every call here runs in a server component or action.
 */
const BASE = process.env.AGENT_URL ?? "";
const TOKEN = process.env.AGENT_TOKEN ?? "";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE || !TOKEN) throw new Error("AGENT_URL / AGENT_TOKEN are not configured");

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    let message = body;
    try {
      message = (JSON.parse(body) as { error?: string }).error ?? body;
    } catch {
      /* keep raw body */
    }
    throw new Error(message || `agent responded ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const listApps = () => call<DashApp[]>("/apps");
export const getApp = (id: string) => call<DashApp>(`/apps/${id}`);
export const createApp = (input: CreateAppInput) =>
  call<DashApp>("/apps", { method: "POST", body: JSON.stringify(input) });
export const updateApp = (id: string, patch: UpdateAppInput) =>
  call<DashApp>(`/apps/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
export const deployApp = (id: string) => call<DashApp>(`/apps/${id}/deploy`, { method: "POST" });
export const stopApp = (id: string) => call<DashApp>(`/apps/${id}/stop`, { method: "POST" });
export const startApp = (id: string) => call<DashApp>(`/apps/${id}/start`, { method: "POST" });
export const deleteApp = (id: string) => call<{ ok: boolean }>(`/apps/${id}`, { method: "DELETE" });
export const getLogs = (id: string, lines = 200) =>
  call<{ logs: string }>(`/apps/${id}/logs?lines=${lines}`);
export const getWebhook = () => call<WebhookInfo>("/webhook");
export const getDeployKey = (id: string) => call<{ publicKey: string }>(`/apps/${id}/deploy-key`);
export const getGithubStatus = () => call<GithubStatus>("/github/status");
export const listGithubRepos = () => call<{ repos: GithubRepo[] }>("/github/repos");
export const listGithubBranches = (owner: string, repo: string, installationId: number) =>
  call<{ branches: string[] }>(
    `/github/repos/${owner}/${repo}/branches?installationId=${installationId}`,
  );
