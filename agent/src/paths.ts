import { join } from "node:path";
import { config } from "./config";
import type { App } from "./types";

/** The cloned repo root for an app. */
export function appDir(id: string): string {
  return join(config.appsRoot, id);
}

/** The directory install/build/start run in — the repo root, or a subdir for monorepos. */
export function appWorkdir(app: App): string {
  return app.subdir ? join(appDir(app.id), app.subdir) : appDir(app.id);
}
