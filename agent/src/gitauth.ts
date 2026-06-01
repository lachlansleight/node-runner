import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config";
import { run } from "./exec";
import type { App } from "./types";

/** Repos cloned over SSH need a deploy key; HTTPS public repos don't. */
export function isSshRepo(url: string): boolean {
  return /^git@/.test(url) || /^ssh:\/\//.test(url);
}

function keyPath(id: string): string {
  return join(config.keysDir, id);
}

/** Ensure an ed25519 deploy key exists for the app; return its public key. */
export async function ensureDeployKey(id: string): Promise<string> {
  mkdirSync(config.keysDir, { recursive: true });
  const kp = keyPath(id);
  if (!existsSync(kp)) {
    await run(`ssh-keygen -t ed25519 -N "" -f ${kp} -C "node-runner-${id}"`);
  }
  return readFileSync(`${kp}.pub`, "utf8").trim();
}

/** Extra env for git operations: points SSH at the app's deploy key for SSH repos. */
export function gitEnv(app: App): Record<string, string> {
  if (!isSshRepo(app.repoUrl)) return {};
  const kp = keyPath(app.id);
  return {
    GIT_SSH_COMMAND: `ssh -i ${kp} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new`,
  };
}
