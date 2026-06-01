import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import * as apps from "./apps";
import * as caddy from "./caddy";
import { assertConfig, config } from "./config";
import * as deploy from "./deploy";
import * as pm2 from "./pm2";
import * as store from "./store";
import type { CreateAppInput, UpdateAppInput } from "./types";
import * as gitauth from "./gitauth";
import * as webhook from "./webhook";

type Handler = (ctx: Ctx) => Promise<void> | void;
interface Ctx {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  params: Record<string, string>;
  /** Raw request body (cached). */
  raw: () => Promise<string>;
  /** Parsed JSON body (cached). */
  body: () => Promise<unknown>;
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, { "content-type": typeof body === "string" ? "text/plain" : "application/json" });
  res.end(payload);
}

async function readRaw(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

function parseJson(raw: string): unknown {
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "invalid JSON body");
  }
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function authorized(req: IncomingMessage): boolean {
  const header = req.headers.authorization ?? "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return false;
  const provided = Buffer.from(m[1]);
  const expected = Buffer.from(config.token);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

// --- routes -----------------------------------------------------------------

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
  open?: boolean; // skips auth
}

const routes: Route[] = [];
function route(method: string, path: string, handler: Handler, open = false): void {
  const keys: string[] = [];
  const pattern = new RegExp(
    "^" +
      path.replace(/:[^/]+/g, (k) => {
        keys.push(k.slice(1));
        return "([^/]+)";
      }) +
      "/?$",
  );
  routes.push({ method, pattern, keys, handler, open });
}

route("GET", "/health", ({ res }) => send(res, 200, { ok: true, phase: 1 }), true);

// Caddy on-demand TLS gate — open, but only ever reachable on loopback.
route(
  "GET",
  "/caddy/ask",
  ({ res, url }) => {
    const domain = url.searchParams.get("domain") ?? "";
    const known = caddy.isKnownDomain(store.list(), domain);
    send(res, known ? 200 : 403, known ? "ok" : "unknown");
  },
  true,
);

route("GET", "/apps", ({ res }) => send(res, 200, store.list().map(apps.redact)));

route("POST", "/apps", async ({ res, body }) => {
  const app = apps.create((await body()) as CreateAppInput);
  send(res, 201, apps.redact(app));
});

route("GET", "/apps/:id", ({ res, params }) => {
  const app = store.get(params.id);
  if (!app) throw new HttpError(404, "app not found");
  send(res, 200, apps.redact(app));
});

route("PATCH", "/apps/:id", async ({ res, params, body }) => {
  const app = await apps.update(params.id, (await body()) as UpdateAppInput);
  send(res, 200, apps.redact(app));
});

route("DELETE", "/apps/:id", async ({ res, params }) => {
  if (!store.get(params.id)) throw new HttpError(404, "app not found");
  await deploy.destroy(params.id);
  send(res, 200, { ok: true });
});

route("POST", "/apps/:id/deploy", async ({ res, params }) => {
  if (!store.get(params.id)) throw new HttpError(404, "app not found");
  const app = await deploy.deploy(params.id);
  send(res, 200, apps.redact(app));
});

route("POST", "/apps/:id/stop", async ({ res, params }) => {
  const app = store.get(params.id);
  if (!app) throw new HttpError(404, "app not found");
  await pm2.stop(params.id);
  app.status = "stopped";
  store.upsert(app);
  send(res, 200, apps.redact(app));
});

route("POST", "/apps/:id/start", async ({ res, params }) => {
  const app = store.get(params.id);
  if (!app) throw new HttpError(404, "app not found");
  await pm2.start(params.id);
  app.status = "running";
  store.upsert(app);
  send(res, 200, apps.redact(app));
});

route("GET", "/apps/:id/logs", async ({ res, params, url }) => {
  if (!store.get(params.id)) throw new HttpError(404, "app not found");
  const lines = Math.min(Number(url.searchParams.get("lines") ?? 200) || 200, 2000);
  send(res, 200, { logs: await pm2.logs(params.id, lines) });
});

// Per-app deploy key (for private repos). Add the returned key to the repo's Deploy Keys.
route("GET", "/apps/:id/deploy-key", async ({ res, params }) => {
  if (!store.get(params.id)) throw new HttpError(404, "app not found");
  send(res, 200, { publicKey: await gitauth.ensureDeployKey(params.id) });
});

// Webhook setup info (the secret + the path to register in GitHub).
route("GET", "/webhook", ({ res }) => {
  send(res, 200, {
    path: "/webhooks/github",
    secret: webhook.webhookSecret(),
    contentType: "application/json",
    publicUrl: config.controlDomain
      ? `https://${config.controlDomain}/webhooks/github`
      : config.publicIp
        ? `http://${config.publicIp}/webhooks/github`
        : null,
  });
});

// GitHub push webhook. Open route, but authenticated by HMAC signature.
route(
  "POST",
  "/webhooks/github",
  async ({ req, res, raw }) => {
    const rawBody = await raw();
    if (!webhook.verifySignature(rawBody, req.headers["x-hub-signature-256"] as string | undefined)) {
      send(res, 401, { error: "invalid signature" });
      return;
    }
    const event = (req.headers["x-github-event"] as string | undefined) ?? "";
    if (event === "ping") {
      send(res, 200, { ok: true, pong: true });
      return;
    }
    if (event !== "push") {
      send(res, 202, { ignored: event });
      return;
    }
    const triggered = webhook.triggerPush(parseJson(rawBody) as Parameters<typeof webhook.triggerPush>[0]);
    send(res, 202, { triggered });
  },
  true,
);

// --- dispatch ---------------------------------------------------------------

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${config.host}`);
  const match = routes.find((r) => r.method === req.method && r.pattern.test(url.pathname));

  if (!match) {
    send(res, 404, { error: "not found" });
    return;
  }
  if (!match.open && !authorized(req)) {
    send(res, 401, { error: "unauthorized" });
    return;
  }

  const m = match.pattern.exec(url.pathname)!;
  const params: Record<string, string> = {};
  match.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));

  let rawCache: string | undefined;
  const raw = async () => {
    if (rawCache === undefined) rawCache = await readRaw(req);
    return rawCache;
  };
  const body = async () => parseJson(await raw());

  try {
    await match.handler({ req, res, url, params, raw, body });
  } catch (err) {
    if (err instanceof HttpError) {
      send(res, err.status, { error: err.message });
    } else if (err instanceof apps.ValidationError) {
      send(res, 422, { error: err.message });
    } else {
      const message = err instanceof Error ? err.message : String(err);
      console.error("request failed:", message);
      send(res, 500, { error: message });
    }
  }
}

async function main(): Promise<void> {
  assertConfig();
  store.load();

  // Reconcile routing from persisted state (PM2 resurrects processes itself).
  try {
    await caddy.apply(store.list());
  } catch (err) {
    console.error("initial caddy apply failed:", err instanceof Error ? err.message : err);
  }

  createServer((req, res) => void handle(req, res)).listen(config.port, config.host, () => {
    console.log(`node-runner agent listening on http://${config.host}:${config.port}`);
  });
}

void main();
