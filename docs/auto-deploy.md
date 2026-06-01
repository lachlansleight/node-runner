# Auto-deploy on push (Phase 2)

Push to an app's branch → GitHub calls the agent's webhook → the agent pulls the new
commit, rebuilds, and reloads the app. Any app whose **repo + branch** match the push is
redeployed.

> **Recommended: use the GitHub App** ([github-app.md](github-app.md)). Install it once and
> repo listing, private-repo cloning, and webhooks are all handled automatically — no manual
> webhook or deploy-key setup per repo. The steps below are the manual fallback for one-off
> public repos.

## 1. Find your webhook URL + secret

The agent generates and stores a webhook secret. Fetch both (token is in
`/etc/node-runner/secrets.env`):

```sh
ssh -i ~/.ssh/node-runner root@<ip> \
  'TOKEN=$(grep AGENT_TOKEN /etc/node-runner/secrets.env | cut -d= -f2); \
   curl -s http://127.0.0.1:8080/webhook -H "Authorization: Bearer $TOKEN"'
```

Returns e.g.:

```json
{ "path": "/webhooks/github",
  "secret": "….",
  "publicUrl": "http://<ip>/webhooks/github" }
```

## 2. Add the webhook in GitHub

Repo → **Settings → Webhooks → Add webhook**:

- **Payload URL:** the `publicUrl` above (`http://<ip>/webhooks/github`)
- **Content type:** `application/json`
- **Secret:** the `secret` above
- **Events:** *Just the push event*

GitHub sends a `ping` immediately — the agent replies `200`, and the webhook shows a green
check. From then on, every push to a matched branch redeploys automatically.

> **Plain HTTP for now.** Without a domain we expose the webhook over `http://<ip>` (the
> `PUBLIC_IP` setting in `/etc/node-runner/agent.env` enables the Caddy route). The HMAC
> secret authenticates each delivery, but the payload isn't encrypted and GitHub will show
> an "insecure" note. Once you have a domain and set `CONTROL_DOMAIN`, switch the Payload
> URL to `https://control.<domain>/webhooks/github` for TLS.

## 3. Private repositories (deploy keys)

For a private repo, use its **SSH** URL when creating the app
(`git@github.com:owner/repo.git`). The agent generates a per-app SSH key; fetch the public
half and add it to the repo:

```sh
curl -s http://127.0.0.1:8080/apps/<id>/deploy-key -H "Authorization: Bearer $TOKEN"
```

GitHub repo → **Settings → Deploy keys → Add deploy key** → paste the key (read-only is
enough). The agent then clones/pulls over SSH using that key.

## Notes

- The webhook responds immediately (`202`) and deploys in the background; check results via
  `GET /apps/<id>` (`lastDeploy`) or `GET /apps/<id>/logs`.
- `PUBLIC_IP` lives in `/etc/node-runner/agent.env`; if you ever rebuild the server from
  scratch, re-add it (and redeploy the agent).
