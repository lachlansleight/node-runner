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

  /** GitHub webhook HMAC secret. If empty, the agent generates + persists one. */
  webhookSecret: process.env.WEBHOOK_SECRET ?? "",
  webhookSecretFile: process.env.WEBHOOK_SECRET_FILE ?? "/opt/node-runner/state/webhook.secret",

  /** Per-app deploy keys for private repos live here. */
  keysDir: process.env.KEYS_DIR ?? "/opt/node-runner/state/keys",

  /**
   * GitHub App credentials. When set, the agent can list installations/repos
   * and mint short-lived installation tokens to clone private repos — no
   * per-repo deploy keys or manual webhooks needed. The App's webhook secret is
   * the same WEBHOOK_SECRET above.
   */
  githubAppId: process.env.GITHUB_APP_ID ?? "",
  /** App URL slug (github.com/apps/<slug>), used to build the install URL. */
  githubAppSlug: process.env.GITHUB_APP_SLUG ?? "",
  /** PEM private key, inline or via a file path (file takes precedence). */
  githubAppPrivateKey: process.env.GITHUB_APP_PRIVATE_KEY ?? "",
  githubAppPrivateKeyFile:
    process.env.GITHUB_APP_PRIVATE_KEY_FILE ?? "/opt/node-runner/state/github-app.pem",

  /**
   * Public IP of the box. When set, Caddy exposes the webhook over plain HTTP at
   * http://<publicIp>/webhooks/github so GitHub can reach it without a domain.
   */
  publicIp: process.env.PUBLIC_IP ?? "",
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
