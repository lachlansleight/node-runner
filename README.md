# node-runner

A personal mini-PaaS — a small, self-hosted Heroku. One persistent Linux box runs
arbitrary Node.js apps, each on a domain of your choosing, with automatic HTTPS and
auto-deploy from GitHub. Managed from a Next.js dashboard.

## Architecture

- **Host:** Hetzner Cloud (Falkenstein), provisioned entirely via Terraform + cloud-init.
- **Reverse proxy:** Caddy — automatic HTTPS (incl. on-demand TLS for arbitrary domains),
  transparent websocket proxying, dynamic config via its admin API.
- **Process manager:** PM2 — keeps apps alive, per-app logs, restores on reboot.
- **Agent:** a small Node/TS service on the box. Authenticated API + GitHub webhooks.
  Clones repos, runs builds, starts apps on their ports via PM2, and registers Caddy routes.
- **Dashboard:** Next.js on Vercel + Postgres. Where you define apps. Calls the agent.

Apps bind to `127.0.0.1:<port>` (the port is internal); the public surface is always
HTTPS on 443, routed by hostname.

## Build phases

- [x] **Phase 0 — `infra/`**: provision + bootstrap the box. ← _you are here_
- [ ] **Phase 1 — `agent/`**: real agent (create/deploy/delete apps, PM2 + Caddy wiring).
- [ ] **Phase 2**: GitHub webhook auto-deploy.
- [ ] **Phase 3 — `dashboard/`**: Next.js management UI on Vercel.
- [ ] **Phase 4**: server settings page.

Start with [`infra/README.md`](infra/README.md).
