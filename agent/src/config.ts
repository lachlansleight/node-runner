/**
 * Runtime configuration, sourced from environment variables.
 * On the box these come from /etc/node-runner/secrets.env and
 * /etc/node-runner/agent.env via the systemd unit's EnvironmentFile entries.
 */
export const config = {
  /** Agent listens here. Bound to loopback only; public access is via Caddy. */
  host: "127.0.0.1",
  port: Number(process.env.PORT ?? 8080),

  /** Bearer token required on /apps* requests. */
  token: process.env.AGENT_TOKEN ?? "",

  /** 32-byte hex key (64 chars) for encrypting app env vars at rest. */
  encryptionKey: process.env.ENV_ENCRYPTION_KEY ?? "",

  /** Optional management hostname, e.g. control.example.com. */
  controlDomain: process.env.CONTROL_DOMAIN ?? "",

  /** Where app working trees are cloned. */
  appsRoot: process.env.APPS_ROOT ?? "/srv/apps",

  /** Persistent app store (env values stored encrypted). */
  stateFile: process.env.STATE_FILE ?? "/opt/node-runner/state/apps.json",

  /** Caddy config the agent generates and reloads. */
  caddyfilePath: process.env.CADDYFILE_PATH ?? "/etc/caddy/Caddyfile",

  /** fnm data dir (per-app Node versions). */
  fnmDir: process.env.FNM_DIR ?? "/opt/fnm",
} as const;

export function assertConfig(): void {
  const problems: string[] = [];
  if (!config.token) problems.push("AGENT_TOKEN is not set");
  if (!/^[0-9a-fA-F]{64}$/.test(config.encryptionKey)) {
    problems.push("ENV_ENCRYPTION_KEY must be 64 hex chars (32 bytes)");
  }
  if (problems.length) {
    throw new Error("Invalid agent configuration:\n  - " + problems.join("\n  - "));
  }
}
