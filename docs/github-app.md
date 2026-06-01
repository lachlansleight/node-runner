# GitHub App setup (one-time)

This is the recommended way to connect repos. Install the App once and the dashboard
can list your repos, clone private ones, and auto-deploy on push — no per-repo webhooks
or deploy keys. (The manual webhook + deploy-key flow in [auto-deploy.md](auto-deploy.md)
still works for one-off public repos.)

## 1. Create the GitHub App

GitHub → **Settings → Developer settings → GitHub Apps → New GitHub App**:

| Field | Value |
|---|---|
| **GitHub App name** | anything, e.g. `node-runner-deploy` (the slug is derived from this) |
| **Homepage URL** | `https://noderunner.of.glass` (or your dashboard URL) |
| **Webhook → Active** | checked |
| **Webhook URL** | `https://noderunner.of.glass/webhooks/github` |
| **Webhook secret** | a fresh secret: `openssl rand -hex 32` (save it — you'll reuse it on the box) |
| **Callback URL** | leave blank |
| **Request user authorization (OAuth) during installation** | unchecked |

**Repository permissions:**
- **Contents** → Read-only
- **Metadata** → Read-only (auto-selected)

**Subscribe to events:** Push.

**Where can this app be installed?** Only on this account.

Create the app. Then on its page:
- Note the **App ID**.
- Note the **slug** (in the URL: `github.com/apps/<slug>`).
- **Generate a private key** → downloads a `.pem`.

## 2. Install it on your account

On the App page → **Install App** → choose your account → select **All repositories** (or
just the ones you want). This is the "authenticate once" step.

## 3. Put the credentials on the box

The agent reads these from `/etc/node-runner/secrets.env`, and the private key from
`/opt/node-runner/state/github-app.pem` (mode 600, owned by `deploy`).

```sh
# On the box (ssh -i ~/.ssh/node-runner root@<ip>):

# 1. App id + slug + the webhook secret you generated above.
cat >> /etc/node-runner/secrets.env <<'EOF'
GITHUB_APP_ID=123456
GITHUB_APP_SLUG=node-runner-deploy
WEBHOOK_SECRET=<the openssl rand -hex 32 value from step 1>
EOF

# 2. The private key (paste the .pem contents).
install -o deploy -g deploy -m 600 /dev/stdin /opt/node-runner/state/github-app.pem <<'EOF'
-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----
EOF

# 3. Restart the agent.
systemctl restart node-runner-agent
```

> `WEBHOOK_SECRET` must match the App's webhook secret exactly — it's the HMAC key the
> agent uses to verify every delivery. The agent also accepts
> `GITHUB_APP_PRIVATE_KEY_FILE` to override the PEM path.

## 4. Verify

```sh
TOKEN=$(grep AGENT_TOKEN /etc/node-runner/secrets.env | cut -d= -f2)
curl -s http://127.0.0.1:8080/github/status -H "Authorization: Bearer $TOKEN"
# => { "configured": true, "installUrl": "...", "installations": [ { "account": "you", ... } ] }
```

In the dashboard, **New app** now shows a repository picker. Pick a repo + branch, and
every push to that branch deploys automatically.

## How it works

- The App has a **single webhook** (configured once, above). GitHub delivers `push` events
  for every installed repo to `https://noderunner.of.glass/webhooks/github`. The agent
  matches each push to apps by repo + branch and redeploys them — same matching logic as
  the manual webhook, just no per-repo setup.
- For private repos, the agent mints a short-lived **installation access token** per deploy
  and clones over HTTPS with it (injected as a git auth header, never written to disk).
- All GitHub API calls (list repos/branches, mint tokens) happen on the box; the dashboard
  proxies through the agent, so the App private key never leaves the server.
