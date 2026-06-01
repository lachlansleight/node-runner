import { config } from "./config";
import { run } from "./exec";

/**
 * Resolves the `bin` directory containing the `node` binary for a given Node
 * major version, installing it via fnm if needed. Returns the system Node dir
 * when no version is requested.
 */
export async function resolveNodeBinDir(version?: string): Promise<string> {
  if (!version) return "/usr/bin";

  const env = { FNM_DIR: config.fnmDir };
  await run(`fnm install ${shellArg(version)}`, { env });

  const res = await run(
    `fnm exec --using=${shellArg(version)} -- node -e "process.stdout.write(require('path').dirname(process.execPath))"`,
    { env },
  );
  const dir = res.stdout.trim();
  if (!dir) throw new Error(`could not resolve node bin dir for version ${version}`);
  return dir;
}

/** Reject anything that isn't a simple version token (e.g. "20", "20.11", "lts/iron"). */
function shellArg(v: string): string {
  if (!/^[\w./-]+$/.test(v)) throw new Error(`invalid node version: ${v}`);
  return v;
}
