# infra — Phase 0: provision the box

This is **Part 1** of node-runner: a single command provisions a Hetzner server and
auto-installs everything it needs (Node, PM2, fnm, Caddy, the agent). No console clicks.

## What gets created

- A Hetzner **CPX31** server (4 vCPU / 8 GB / 160 GB NVMe) in **Falkenstein**, Ubuntu 24.04.
- A **firewall**: SSH open to *your IP only*; ports 80/443 open to the world; ICMP.
- A **Floating IP** — a stable address you point DNS at, so you can rebuild the box later
  without touching DNS.
- On first boot, cloud-init installs and configures:
  - **Node.js 22** (system default) + **fnm** (for per-app Node versions later)
  - **PM2** (process manager, set to restore apps on reboot)
  - **Caddy** (reverse proxy + automatic HTTPS, with on-demand TLS gated by the agent)
  - **4 GB swap** (protects running apps from OOM during on-box builds)
  - A **placeholder agent** on `127.0.0.1:8080` (replaced by the real one in Phase 1)
  - Generated **secrets** in `/etc/node-runner/secrets.env`

## One-time setup

1. **SSH key** — already generated at `~/.ssh/node-runner` (public key
   `~/.ssh/node-runner.pub`). The Terraform points at the `.pub` by default.

2. **Hetzner API token** — Hetzner Cloud Console → your project → Security →
   API Tokens → *Generate API Token* (Read & Write).

3. **Config** — copy the example and fill it in:
   ```sh
   cd infra
   cp terraform.tfvars.example terraform.tfvars
   # edit terraform.tfvars: paste the token, set admin_ip to your public IPv4
   ```

## Deploy

```sh
cd infra
terraform init      # downloads the hcloud provider
terraform plan      # review what will be created
terraform apply     # type 'yes' to provision
```

When it finishes, Terraform prints the server IP, an `ssh_command`, and next steps.

## Verify (wait ~2-4 min for cloud-init first)

```sh
ssh -i ~/.ssh/node-runner root@<dns_target_ip> node-runner-status
```

You should see Caddy and the agent both `active`, and the agent health check responding.

## Get the secrets (you'll need these for the dashboard in Phase 3)

```sh
ssh -i ~/.ssh/node-runner root@<dns_target_ip> "cat /etc/node-runner/secrets.env"
```

## DNS

Point an **A record** at the `dns_target_ip` output — one for `control.<yourdomain>`
(once you pick a domain) and one per app. (CNAMEs point at hostnames; A records point
at the IP.)

## Notes / gotchas

- **Floating IP interface:** the netplan config assumes the primary NIC is `eth0`
  (correct for current Hetzner Cloud images). If a future image renames it, check
  `ip a` and update `infra/cloud-init.yaml.tftpl`. You can also set
  `use_floating_ip = false` to just use the server's primary IP.
- **Changing the box:** edit `server_type` (e.g. `cpx41`) and `terraform apply` to resize.
- **Re-running cloud-init:** it only runs on first boot. To re-bootstrap, taint/recreate
  the server (`terraform apply -replace=hcloud_server.main`) — the Floating IP and its DNS
  stay put.
- **Tearing down:** `terraform destroy` removes everything.
