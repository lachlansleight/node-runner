# dashboard — Phase 3

The node-runner control panel: a Next.js (App Router) app that manages apps on the box.
It's a **thin client over the agent API** — no database. The agent on the box is the single
source of truth; the dashboard authenticates with a password and calls the agent server-side
(the bearer token never reaches the browser).

## Stack

- Next.js 15 (App Router) + React 19, TypeScript
- Tailwind CSS v4 (CSS-first; palette as CSS variables, explicit arbitrary values)
- Server Components for reads, Server Actions for writes

## Features

- Password login (single user), signed httpOnly session cookie
- Apps list with status
- App detail: deploy / stop / start / delete, live config, domains editor, env editor
  (write-only), logs viewer, webhook setup, and per-app deploy key (for private repos)
- Create app form

## Environment

Copy `.env.local.example` to `.env.local` (and set the same in Vercel):

| Var | Notes |
|-----|-------|
| `AGENT_URL` | `https://noderunner.of.glass` |
| `AGENT_TOKEN` | from `/etc/node-runner/secrets.env` on the box |
| `DASHBOARD_PASSWORD` | password to log in |
| `AUTH_SECRET` | random; `openssl rand -hex 32` |

## Develop

```sh
npm install
npm run dev      # http://localhost:3000
```

## Deploy to Vercel

Point a Vercel project at this `dashboard/` directory, set the four env vars above, deploy.
Because the agent enforces the bearer token and the dashboard enforces the password, the
control plane is protected end-to-end.
