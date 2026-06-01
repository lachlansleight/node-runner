#!/usr/bin/env bash
#
# Build the agent locally and deploy it to the node-runner box over SSH.
#
#   - Compiles TypeScript -> dist/ (the agent has zero runtime deps, so only dist/ ships).
#   - Copies dist/ + package.json to /opt/node-runner/app on the server.
#   - Installs the production systemd unit, makes the Caddyfile writable by the agent,
#     and (re)starts the service, then health-checks it.
#
# Usage:
#   ./deploy.sh                 # resolve IP from `terraform output dns_target_ip`
#   ./deploy.sh 1.2.3.4         # explicit IP
#   SERVER_IP=1.2.3.4 ./deploy.sh
#   KEY=~/.ssh/other ./deploy.sh
#
# On Windows, run from Git Bash (so ~ maps to C:\Users\<you> and the SSH key is found).

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

KEY="${KEY:-$HOME/.ssh/node-runner}"
SERVER_IP="${1:-${SERVER_IP:-}}"

if [ -z "$SERVER_IP" ]; then
  echo "Resolving server IP from Terraform output..."
  SERVER_IP="$(terraform -chdir="$HERE/../infra" output -raw dns_target_ip)"
fi
[ -n "$SERVER_IP" ] || { echo "Could not determine SERVER_IP. Pass it as an argument." >&2; exit 1; }

SSH=(ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "root@$SERVER_IP")
SCP=(scp -i "$KEY" -o StrictHostKeyChecking=accept-new)

echo "Deploying agent to $SERVER_IP"

echo "==> npm install + build"
npm install
npm run build
[ -f dist/index.js ] || { echo "build produced no dist/index.js" >&2; exit 1; }

echo "==> preparing server"
"${SSH[@]}" 'bash -s' <<'REMOTE'
set -e
mkdir -p /opt/node-runner/app /opt/node-runner/state
rm -rf /opt/node-runner/app/dist
chown -R deploy:deploy /opt/node-runner
# Let the agent (deploy) own the Caddyfile; caddy (group) still reads it on restart.
touch /etc/caddy/Caddyfile
chown deploy:caddy /etc/caddy/Caddyfile
chmod 640 /etc/caddy/Caddyfile
# Retire the Phase 0 stub if present.
rm -f /opt/node-runner/agent-stub.js
REMOTE

echo "==> copying dist/ + package.json"
"${SCP[@]}" -r dist "root@$SERVER_IP:/opt/node-runner/app/"
"${SCP[@]}" package.json "root@$SERVER_IP:/opt/node-runner/app/"

echo "==> installing service"
"${SCP[@]}" systemd/node-runner-agent.service "root@$SERVER_IP:/etc/systemd/system/node-runner-agent.service"
"${SSH[@]}" 'bash -s' <<'REMOTE'
set -e
chown -R deploy:deploy /opt/node-runner/app
systemctl daemon-reload
systemctl enable node-runner-agent
systemctl restart node-runner-agent
sleep 1
systemctl --no-pager --lines=10 status node-runner-agent || true
echo "--- health ---"
curl -fsS http://127.0.0.1:8080/health && echo
REMOTE

echo "Done."
