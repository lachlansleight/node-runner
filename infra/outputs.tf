output "server_ipv4" {
  description = "Primary public IPv4 of the server."
  value       = hcloud_server.main.ipv4_address
}

output "dns_target_ip" {
  description = "The IP to point all DNS A records at (apps + control domain)."
  value       = var.use_floating_ip ? hcloud_floating_ip.main[0].ip_address : hcloud_server.main.ipv4_address
}

output "ssh_command" {
  description = "Copy-paste to log in."
  value       = "ssh -i ~/.ssh/node-runner root@${var.use_floating_ip ? hcloud_floating_ip.main[0].ip_address : hcloud_server.main.ipv4_address}"
}

output "next_steps" {
  description = "What to do once apply completes."
  value       = <<-EOT

    Give cloud-init ~2-4 minutes to finish installing everything, then:

    1. Check status:
         ssh -i ~/.ssh/node-runner root@${var.use_floating_ip ? hcloud_floating_ip.main[0].ip_address : hcloud_server.main.ipv4_address} node-runner-status

    2. Grab the generated agent secrets (needed by the dashboard later):
         ssh -i ~/.ssh/node-runner root@${var.use_floating_ip ? hcloud_floating_ip.main[0].ip_address : hcloud_server.main.ipv4_address} "cat /etc/node-runner/secrets.env"

    3. Point DNS A records at: ${var.use_floating_ip ? hcloud_floating_ip.main[0].ip_address : hcloud_server.main.ipv4_address}
       (one for control.<domain>, then one per app.)
  EOT
}
