export type AppStatus =
  | "created"
  | "deploying"
  | "running"
  | "stopped"
  | "errored";

export interface DeployInfo {
  at: string;
  status: "in_progress" | "success" | "failed";
  commit?: string;
  message?: string;
}

export interface App {
  /** URL-safe slug, derived from name; the PM2 process name and app dir name. */
  id: string;
  name: string;
  repoUrl: string;
  branch: string;
  /** Defaults to "npm ci". Set empty string to skip. */
  installCommand: string;
  /** e.g. "npm run build". Empty string skips the build step. */
  buildCommand: string;
  /** e.g. "node dist/server.js" or "npm run start". Required. */
  startCommand: string;
  /** Optional path within the repo to treat as the app root (monorepo support). */
  subdir: string;
  /** Internal port the app binds on 127.0.0.1. Public traffic always arrives via Caddy on 443. */
  port: number;
  /** Hostnames Caddy routes to this app (TLS issued on-demand). */
  domains: string[];
  /** Optional Node major version (e.g. "20"). Omit to use the system default. */
  nodeVersion?: string;
  /** Decrypted in memory; encrypted at rest in the state file. */
  env: Record<string, string>;
  status: AppStatus;
  createdAt: string;
  updatedAt: string;
  lastDeploy?: DeployInfo;
}

export interface CreateAppInput {
  name: string;
  repoUrl: string;
  branch?: string;
  installCommand?: string;
  buildCommand?: string;
  startCommand: string;
  subdir?: string;
  port: number;
  domains?: string[];
  nodeVersion?: string;
  env?: Record<string, string>;
}

export type UpdateAppInput = Partial<Omit<CreateAppInput, "name">>;
