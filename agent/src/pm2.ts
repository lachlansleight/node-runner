import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { run } from "./exec";
import type { App } from "./types";
import { appDir } from "./paths";

/**
 * Each app runs under PM2 via a generated wrapper script + ecosystem file.
 * The ecosystem file holds the resolved env (incl. PORT and a PATH that puts the
 * app's chosen Node version first). `pm2 save` persists the process list so apps
 * come back on reboot.
 */
export async function startOrReload(app: App, nodeBinDir: string): Promise<void> {
  const dir = appDir(app.id);

  const wrapper = join(dir, ".node-runner-start.sh");
  writeFileSync(wrapper, `#!/usr/bin/env bash\nset -e\nexec ${app.startCommand}\n`, { mode: 0o755 });

  const env: Record<string, string> = {
    NODE_ENV: "production",
    ...app.env,
    PORT: String(app.port),
    PATH: `${nodeBinDir}:/usr/local/bin:/usr/bin:/bin`,
  };

  const ecosystem = {
    apps: [
      {
        name: app.id,
        script: "./.node-runner-start.sh",
        interpreter: "bash",
        cwd: dir,
        autorestart: true,
        max_restarts: 10,
        env,
      },
    ],
  };

  const ecoPath = join(dir, ".node-runner.ecosystem.json");
  writeFileSync(ecoPath, JSON.stringify(ecosystem, null, 2), { mode: 0o600 });

  await run(`pm2 startOrReload ${ecoPath} --update-env`);
  await run(`pm2 save`, { check: false });
}

export async function stop(id: string): Promise<void> {
  await run(`pm2 stop ${id}`, { check: false });
}

export async function start(id: string): Promise<void> {
  await run(`pm2 start ${id}`, { check: false });
}

export async function remove(id: string): Promise<void> {
  await run(`pm2 delete ${id}`, { check: false });
  await run(`pm2 save`, { check: false });
}

export async function logs(id: string, lines: number): Promise<string> {
  const res = await run(`pm2 logs ${id} --lines ${lines} --nostream`, { check: false });
  return res.stdout || res.stderr;
}
