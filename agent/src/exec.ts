import { spawn } from "node:child_process";

export interface RunOptions {
  cwd?: string;
  /** Extra env vars, merged over the agent's own process env. */
  env?: Record<string, string>;
  /** Reject if the command exits non-zero (default true). */
  check?: boolean;
  timeoutMs?: number;
}

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * Run a shell command via `bash -lc` (login shell, so /etc/profile.d is sourced
 * and FNM_DIR etc. are available). Captures stdout/stderr.
 */
export function run(cmd: string, opts: RunOptions = {}): Promise<RunResult> {
  const { cwd, env, check = true, timeoutMs = 10 * 60 * 1000 } = opts;
  return new Promise((resolve, reject) => {
    const child = spawn("bash", ["-lc", cmd], {
      cwd,
      env: { ...process.env, ...env },
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`command timed out after ${timeoutMs}ms: ${cmd}`));
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const result: RunResult = { code: code ?? -1, stdout, stderr };
      if (check && code !== 0) {
        reject(new Error(`command failed (exit ${code}): ${cmd}\n${stderr || stdout}`));
      } else {
        resolve(result);
      }
    });
  });
}
