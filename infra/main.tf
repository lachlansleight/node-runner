locals {
  cloudinit = templatefile("${path.module}/cloud-init.yaml.tftpl", {
    node_version   = var.node_version
    control_domain = var.control_domain
    floating_ip    = var.use_floating_ip ? hcloud_floating_ip.main[0].ip_address : ""
  })
}

resource "hcloud_ssh_key" "admin" {
  name       = "${var.server_name}-admin"
  public_key = file(pathexpand(var.ssh_public_key_path))
}

resource "hcloud_firewall" "main" {
  name = "${var.server_name}-fw"

  # SSH — open to the world (no IP filtering, since the admin has a dynamic IP).
  # Safe because the box is key-only: password authentication is disabled (see cloud-init).
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  # HTTP — public (Caddy serves + redirects to HTTPS, and ACME HTTP challenge).
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  # HTTPS — public (all app traffic + the control API ride here).
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  # Ping.
  rule {
    direction  = "in"
    protocol   = "icmp"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
}

resource "hcloud_floating_ip" "main" {
  count         = var.use_floating_ip ? 1 : 0
  type          = "ipv4"
  home_location = var.location
  name          = "${var.server_name}-fip"
}

resource "hcloud_server" "main" {
  name         = var.server_name
  server_type  = var.server_type
  location     = var.location
  image        = "ubuntu-24.04"
  keep_disk    = var.keep_disk
  ssh_keys     = [hcloud_ssh_key.admin.id]
  firewall_ids = [hcloud_firewall.main.id]
  user_data    = local.cloudinit

  public_net {
    ipv4_enabled = true
    ipv6_enabled = true
  }

  lifecycle {
    # cloud-init (user_data) runs only on first boot. Editing it should refine
    # future rebuilds, never destroy/recreate the running box. To deliberately
    # re-bootstrap, use: terraform apply -replace=hcloud_server.main
    ignore_changes = [user_data]
  }
}

resource "hcloud_floating_ip_assignment" "main" {
  count          = var.use_floating_ip ? 1 : 0
  floating_ip_id = hcloud_floating_ip.main[0].id
  server_id      = hcloud_server.main.id
}
