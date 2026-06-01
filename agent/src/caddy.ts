import { writeFileSync } from "node:fs";
import { config } from "./config";
import { run } from "./exec";
import type { App } from "./types";

/**
 * The agent owns /etc/caddy/Caddyfile: it regenerates the whole file from the
 * app registry and reloads Caddy (graceful, zero-downtime) on every change.
 * Reload talks to Caddy's local admin API, so it needs no root.
 *
 * App domains use on-demand TLS, gated by the /caddy/ask endpoint below, so a
 * cert is only issued for a hostname that belongs to a registered app.
 */
export function renderCaddyfile(apps: App[]): string {
  const blocks: string[] = [];

  blocks.push(
    [
      "{",
      "  admin localhost:2019",
      "  on_demand_tls {",
      `    ask http://127.0.0.1:${config.port}/caddy/ask`,
      "  }",
      "}",
    ].join("\n"),
  );

  if (config.controlDomain) {
    blocks.push([`${config.controlDomain} {`, `  reverse_proxy 127.0.0.1:${config.port}`, "}"].join("\n"));
  }

  // Expose ONLY the webhook over plain HTTP on the bare IP, so GitHub can reach
  // it without a domain. Scoped to the IP host so it can't shadow app domains.
  if (config.publicIp) {
    blocks.push(
      [
        `http://${config.publicIp} {`,
        "  handle /webhooks/* {",
        `    reverse_proxy 127.0.0.1:${config.port}`,
        "  }",
        "  respond 404",
        "}",
      ].join("\n"),
    );
  }

  for (const app of apps) {
    const domains = app.domains.filter(Boolean);
    if (domains.length === 0) continue;
    blocks.push(
      [
        `${domains.join(", ")} {`,
        "  tls {",
        "    on_demand",
        "  }",
        `  reverse_proxy 127.0.0.1:${app.port}`,
        "}",
      ].join("\n"),
    );
  }

  return blocks.join("\n\n") + "\n";
}

export async function apply(apps: App[]): Promise<void> {
  writeFileSync(config.caddyfilePath, renderCaddyfile(apps), { mode: 0o640 });
  await run(`caddy reload --config ${config.caddyfilePath} --adapter caddyfile`);
}

/** True if the hostname belongs to a registered app (or is the control domain). */
export function isKnownDomain(apps: App[], domain: string): boolean {
  if (!domain) return false;
  if (config.controlDomain && domain === config.controlDomain) return true;
  return apps.some((a) => a.domains.includes(domain));
}
