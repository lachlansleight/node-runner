# node-runner

A personal mini-PaaS — a small, self-hosted Heroku. One persistent Linux box runs
arbitrary Node.js apps, each on a domain of your choosing, with automatic HTTPS and
auto-deploy from GitHub. Managed from a Next.js dashboard.

## Architecture

- **Host:** Hetzner Cloud (Falkenstein), provisioned entirely via Terraform + cloud-init.
- **Reverse proxy:** Caddy — automatic HTTPS (incl. on-demand TLS for arbitrary domains),
  transparent websocket proxying, dynamic config via its admin API.
- **Process manager:** PM2 — keeps apps alive, per-app logs, restores on reboot.
- **Agent:** a small Node/TS service on the box (zero runtime deps). Authenticated API +
  GitHub App webhooks. Clones repos, runs builds, starts apps on their ports via PM2, and
  registers Caddy routes. It is the single source of truth — there is **no database**; app
  state lives in a JSON file on the box (secrets encrypted at rest).
- **Dashboard:** Next.js on Vercel — a thin client over the agent API. Where you define
  apps. Calls the agent server-side; the agent's bearer token never reaches the browser.
- **GitHub App:** install once, then pick a repo when creating an app. Pushes to the watched
  branch auto-deploy (like Vercel/Netlify); private repos clone via short-lived install tokens.

Apps bind to `127.0.0.1:<port>` (the port is internal); the public surface is always
HTTPS on 443, routed by hostname.

## Repository layout

| Directory | What it is |
|-----------|------------|
| [`infra/`](infra/) | Terraform + cloud-init that provision and bootstrap the box |
| [`agent/`](agent/) | The on-box agent (HTTP API, clone/build/PM2/Caddy, GitHub App) |
| [`dashboard/`](dashboard/) | The Next.js management UI deployed to Vercel |
| [`docs/`](docs/) | Setup + operations guides |
| [`examples/hello/`](examples/hello/) | A tiny sample app for smoke-testing a deploy |

## Setup, end to end

Follow these in order — each step's README has the details:

1. **Provision the box** — [`infra/README.md`](infra/README.md). One `terraform apply`
   creates the server and installs Node, PM2, fnm, Caddy, and a placeholder agent.
2. **Deploy the agent** — [`agent/README.md`](agent/README.md). Run `agent/deploy.sh` to
   ship the real agent and replace the placeholder.
3. **Point DNS** — add an A record for your control domain (and one per app) at the
   server IP, then set `CONTROL_DOMAIN` (see `infra/README.md`).
4. **Connect GitHub** — [`docs/github-app.md`](docs/github-app.md). Create + install a
   GitHub App so you can pick repos and get push-to-deploy. (Optional manual fallback for
   one-off public repos: [`docs/auto-deploy.md`](docs/auto-deploy.md).)
5. **Deploy the dashboard** — [`dashboard/README.md`](dashboard/README.md). A Vercel project
   pointed at `dashboard/`, with four env vars.

Then open the dashboard, create an app from the repo picker, and push to deploy.

Operations: [resizing the box](docs/upgrading-the-server.md).
