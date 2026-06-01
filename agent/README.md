# agent — Phase 1

The agent is the only custom software running on the box. It exposes a small
authenticated HTTP API (on `127.0.0.1:8080`, reached publicly via Caddy at your
control domain) and does the real work of running apps:

**clone repo → install → build → start under PM2 → wire up Caddy + TLS.**

It has **zero runtime dependencies** (Node built-ins only), so deployment is just
shipping the compiled `dist/`.

## How an app runs

For each app the agent:
1. Clones the repo and hard-resets to the tip of the chosen branch (`/srv/apps/<id>`).
2. Resolves the Node version (system default, or a per-app version via **fnm**).
3. Runs the install command (`npm ci` by default), then the build command.
4. Writes a PM2 ecosystem file and `pm2 startOrReload`s the app with `PORT` + env injected.
5. Regenerates `/etc/caddy/Caddyfile` from all apps and `caddy reload`s it. App domains
   get HTTPS automatically via on-demand TLS, gated by `/caddy/ask` so certs are only
   issued for registered domains.

App env vars are encrypted at rest (AES-256-GCM) in the state file
(`/opt/node-runner/state/apps.json`).

## Deploy / update the agent

From this folder, on your machine (on Windows, use Git Bash):

```sh
./deploy.sh            # uses the Terraform dns_target_ip output
# or: ./deploy.sh 1.2.3.4
```

This builds locally, copies `dist/` to the box, installs the systemd unit, and restarts
the service (replacing the Phase 0 stub).

## API

All `/apps*` routes require `Authorization: Bearer <AGENT_TOKEN>` (the token in
`/etc/node-runner/secrets.env`). `/health` and `/caddy/ask` are open (loopback-only).

| Method | Path | Purpose |
|--------|------|---------|
| GET    | `/health` | Liveness |
| GET    | `/apps` | List apps (secrets redacted) |
| POST   | `/apps` | Create an app |
| GET    | `/apps/:id` | Get one app |
| PATCH  | `/apps/:id` | Update config (repo, branch, port, domains, env, …) |
| DELETE | `/apps/:id` | Stop + remove app and its files |
| POST   | `/apps/:id/deploy` | Clone/build/restart |
| POST   | `/apps/:id/stop` · `/start` | PM2 stop/start |
| GET    | `/apps/:id/logs?lines=200` | Recent logs |

### Create + deploy example

Until you have a control domain, reach the agent through an SSH tunnel:

```sh
ssh -i ~/.ssh/node-runner -L 8080:127.0.0.1:8080 root@<ip>
# then, locally, with the token from /etc/node-runner/secrets.env:
TOKEN=...

curl -s localhost:8080/apps -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{
    "name": "hello",
    "repoUrl": "https://github.com/you/hello.git",
    "branch": "main",
    "buildCommand": "npm run build",
    "startCommand": "node dist/server.js",
    "port": 3001,
    "domains": ["hello.example.com"],
    "nodeVersion": "22",
    "env": { "SOME_SECRET": "xyz" }
  }'

curl -s -X POST localhost:8080/apps/hello/deploy -H "Authorization: Bearer $TOKEN"
```

Then point a DNS A record for `hello.example.com` at the server, and the first HTTPS
request provisions a certificate automatically.

## Config (env vars)

Read from `/etc/node-runner/secrets.env` and `/etc/node-runner/agent.env`:

| Var | Default | Notes |
|-----|---------|-------|
| `AGENT_TOKEN` | — | Bearer token (generated at provision) |
| `ENV_ENCRYPTION_KEY` | — | 64 hex chars (generated at provision) |
| `CONTROL_DOMAIN` | _empty_ | Set in `agent.env` once you have DNS |
| `PORT` | `8080` | Agent listen port (loopback) |
| `APPS_ROOT` | `/srv/apps` | |
| `STATE_FILE` | `/opt/node-runner/state/apps.json` | |
| `CADDYFILE_PATH` | `/etc/caddy/Caddyfile` | |
| `FNM_DIR` | `/opt/fnm` | |

## Not yet (later phases)

- **Phase 2:** GitHub webhooks → auto-deploy on push; private-repo auth (deploy keys).
- **Phase 3:** the Next.js dashboard that calls this API.
