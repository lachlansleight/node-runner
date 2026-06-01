# Upgrading (or downsizing) the server

Because the box is defined in Terraform, changing its size is a one-line edit plus
`terraform apply`. Hetzner resizes the **same** server in place — your apps, data, disk,
IP, and DNS all stay put. There is a short period of downtime while it reboots into the
new size.

> **TL;DR**
> 1. Edit `server_type` in `infra/terraform.tfvars` (e.g. `cpx32`).
> 2. `terraform plan` and confirm it says **update in-place** (`~`), _not_ replace.
> 3. `terraform apply`. The server powers off, resizes, and powers back on (~1-2 min).

## 1. Pick the new size

Check current types and prices on the [Hetzner pricing page](https://www.hetzner.com/cloud/)
(or `hcloud server-type list` if you use the Hetzner CLI). The shared-vCPU x86/AMD line
(`cpx*`) is what we use. Roughly:

| Type   | vCPU | RAM   | Disk   |
|--------|------|-------|--------|
| cpx22  | 2    | 4 GB  | 80 GB  |
| cpx32  | 4    | 8 GB  | 160 GB |
| cpx42  | 8    | 16 GB | 240 GB |
| cpx52  | 16   | 32 GB | 360 GB |

(Confirm exact specs on Hetzner — they change occasionally.)

For node-runner, **RAM and vCPU** are what matter (in-memory state, websockets, on-box
builds). Disk is rarely the bottleneck.

## 2. The `keep_disk` decision (important)

Our infra sets **`keep_disk = true`** by default. This matters because of a Hetzner rule:

- **`keep_disk = true`** (our default): resizing changes CPU + RAM only; the disk stays
  the same size. You keep the ability to **scale back down** later. This is what you want
  unless you specifically need more disk.
- **`keep_disk = false`**: an upgrade also grows the disk — and once the disk has grown,
  Hetzner will **never let you downgrade** that server again (you'd have to rebuild). Only
  set this if you genuinely need the bigger disk and are happy to stay at that size or higher.

You can override it per-apply in `terraform.tfvars`:

```hcl
server_type = "cpx32"
keep_disk   = true   # default; CPU+RAM up, disk unchanged, downgrade still possible
```

If you later need more **disk** specifically, the cleaner option is to attach a Hetzner
Volume (a separate resource) rather than growing the boot disk — ask and we'll add it.

## 3. Apply the change

```sh
cd infra
# edit terraform.tfvars: set server_type = "cpx32"
terraform plan
```

**Read the plan carefully.** You want to see:

```
  # hcloud_server.main will be updated in-place
  ~ resource "hcloud_server" "main" {
      ~ server_type = "cpx22" -> "cpx32"
        ...
    }
```

The leading `~` means **in-place update** — safe, your data is preserved. If you ever see
`-/+ destroy and then create replacement` for `hcloud_server.main`, **stop** and do not
apply: that would wipe the box and re-bootstrap from scratch. (Changing `server_type` or
`keep_disk` alone should never trigger a replace; things like changing `image` or
`location` would.)

Then:

```sh
terraform apply
```

Hetzner powers the server off, performs the resize, and powers it back on. Expect ~1-2
minutes of downtime. PM2 brings your apps back automatically on boot, and Caddy reloads
its config — no manual steps.

## 4. Verify afterwards

```sh
ssh -i ~/.ssh/node-runner root@<dns_target_ip> node-runner-status
# check the new resources:
ssh -i ~/.ssh/node-runner root@<dns_target_ip> "nproc && free -h && df -h /"
```

You should see the new vCPU count and RAM, all apps `online` in PM2, and Caddy active.

## 5. Downsizing

Same process in reverse — set `server_type` to a smaller type and apply. This **only works
if every prior upgrade used `keep_disk = true`** (the disk must still fit the smaller type's
allowance). If a past upgrade grew the disk, Hetzner will reject the downgrade; you'd need
to rebuild the box (the Floating IP + DNS would survive a rebuild).

## Notes

- **IP & DNS are safe.** Resizing keeps the same primary IP, and we point DNS at the
  Floating IP regardless — nothing to update.
- **No re-bootstrap.** cloud-init only runs on first boot; a resize doesn't re-run it, so
  your installed software and apps are untouched.
- **Sources:** [hcloud_server resource](https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs/resources/server),
  [Hetzner Cloud Terraform how-to](https://community.hetzner.com/tutorials/howto-hcloud-terraform/).
