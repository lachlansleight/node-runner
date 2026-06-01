import { join } from "node:path";
import { config } from "./config";

export function appDir(id: string): string {
  return join(config.appsRoot, id);
}
