import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import * as caddy from "./caddy";
import { config } from "./config";
import { run } from "./exec";
import { resolveNodeBinDir } from "./fnm";
import { appDir } from "./paths";
import * as pm2 from "./pm2";
import * as store from "./store";
import type { App } from "./types";

/** Per-app serialization so two deploys of the same app can't interleave. */
const locks = new Map<string, Promise<unknown>>();

export function withLock<T>(id: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(id) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  locks.set(
    id,
    next.catch(() => {}),
  );
  return next;
}

function gitArg(s: string): string {
  // Defensive: branch/repo strings go into a shell command.
  if (!/^[\w.@:/+~-]+$/.test(s)) throw new Error(`unsafe git argument: ${s}`);
  return s;
}

/** Clone (first time) or hard-reset to the latest commit of the target branch. */
async function syncRepo(app: App): Promise<string> {
  const dir = appDir(app.id);
  const branch = gitArg(app.branch);
  const repo = gitArg(app.repoUrl);

  if (!existsSync(join(dir, ".git"))) {
    mkdirSync(config.appsRoot, { recursive: true });
    await run(`git clone --branch ${branch} --single-branch ${repo} ${dir}`);
  } else {
    await run(`git fetch origin ${branch}`, { cwd: dir });
    await run(`git checkout ${branch}`, { cwd: dir });
    await run(`git reset --hard origin/${branch}`, { cwd: dir });
  }

  const res = await run("git rev-parse --short HEAD", { cwd: dir });
  return res.stdout.trim();
}

export async function deploy(id: string): Promise<App> {
  return withLock(id, async () => {
    const app = store.get(id);
    if (!app) throw new Error(`app not found: ${id}`);

    app.status = "deploying";
    app.lastDeploy = { at: new Date().toISOString(), status: "in_progress" };
    app.updatedAt = new Date().toISOString();
    store.upsert(app);

    try {
      const commit = await syncRepo(app);
      const dir = appDir(app.id);
      const nodeBinDir = await resolveNodeBinDir(app.nodeVersion);
      const buildEnv: Record<string, string> = {
        ...app.env,
        PORT: String(app.port),
        PATH: `${nodeBinDir}:/usr/local/bin:/usr/bin:/bin`,
      };

      if (app.installCommand) await run(app.installCommand, { cwd: dir, env: buildEnv });
      if (app.buildCommand) await run(app.buildCommand, { cwd: dir, env: buildEnv });

      await pm2.startOrReload(app, nodeBinDir);
      await caddy.apply(store.list());

      app.status = "running";
      app.lastDeploy = { at: new Date().toISOString(), status: "success", commit };
      app.updatedAt = new Date().toISOString();
      store.upsert(app);
      return app;
    } catch (err) {
      app.status = "errored";
      app.lastDeploy = {
        at: new Date().toISOString(),
        status: "failed",
        message: err instanceof Error ? err.message : String(err),
      };
      app.updatedAt = new Date().toISOString();
      store.upsert(app);
      throw err;
    }
  });
}

/** Tear down an app entirely: stop PM2, drop the Caddy route, delete files. */
export async function destroy(id: string): Promise<void> {
  return withLock(id, async () => {
    await pm2.remove(id);
    store.remove(id);
    await caddy.apply(store.list());
    const dir = appDir(id);
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });
}
