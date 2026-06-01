export type AppStatus = "created" | "deploying" | "running" | "stopped" | "errored";

export interface DeployInfo {
  at: string;
  status: "in_progress" | "success" | "failed";
  commit?: string;
  message?: string;
}

/** The app shape the agent returns (env values redacted to keys only). */
export interface DashApp {
  id: string;
  name: string;
  repoUrl: string;
  branch: string;
  installCommand: string;
  buildCommand: string;
  startCommand: string;
  subdir: string;
  port: number;
  domains: string[];
  nodeVersion?: string;
  status: AppStatus;
  createdAt: string;
  updatedAt: string;
  lastDeploy?: DeployInfo;
  envKeys: string[];
}

export interface CreateAppInput {
  name: string;
  repoUrl: string;
  branch?: string;
  subdir?: string;
  installCommand?: string;
  buildCommand?: string;
  startCommand: string;
  port: number;
  domains?: string[];
  nodeVersion?: string;
  env?: Record<string, string>;
}

export type UpdateAppInput = Partial<Omit<CreateAppInput, "name">>;

export interface WebhookInfo {
  path: string;
  secret: string;
  publicUrl: string | null;
}
