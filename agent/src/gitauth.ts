import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config";
import { run } from "./exec";
import * as github from "./github";
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

/**
 * Extra env for git operations, by repo type:
 *  - GitHub App repos: a fresh installation token, injected as an HTTP auth
 *    header via git config env vars (kept out of argv and .git/config).
 *  - SSH repos: points SSH at the app's deploy key.
 *  - Plain HTTPS public repos: nothing.
 */
export async function gitAuthEnv(app: App): Promise<Record<string, string>> {
  if (app.installationId) {
    const token = await github.installationToken(app.installationId);
    const header = "AUTHORIZATION: basic " + Buffer.from(`x-access-token:${token}`).toString("base64");
    return {
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
      GIT_CONFIG_VALUE_0: header,
    };
  }
  if (isSshRepo(app.repoUrl)) {
    await ensureDeployKey(app.id);
    const kp = keyPath(app.id);
    return {
      GIT_SSH_COMMAND: `ssh -i ${kp} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new`,
    };
  }
  return {};
}
