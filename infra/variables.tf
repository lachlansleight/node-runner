variable "hcloud_token" {
  description = "Hetzner Cloud API token (read/write). Set in terraform.tfvars (git-ignored)."
  type        = string
  sensitive   = true
}

variable "ssh_public_key_path" {
  description = "Path to the SSH public key allowed to log into the server."
  type        = string
  default     = "~/.ssh/node-runner.pub"
}

variable "server_name" {
  description = "Name/label for the server and related resources."
  type        = string
  default     = "node-runner"
}

variable "server_type" {
  description = "Hetzner server type. cpx22 = 2 vCPU / 4 GB / 80 GB NVMe (x86/AMD)."
  type        = string
  default     = "cpx22"
}

variable "keep_disk" {
  description = "Keep the disk size fixed when changing server_type. true = you can scale back DOWN later, but upgrades won't grow the disk. false = upgrades grow the disk permanently (no future downgrade). See docs/upgrading-the-server.md."
  type        = bool
  default     = true
}

variable "location" {
  description = "Hetzner location. fsn1 = Falkenstein, Germany."
  type        = string
  default     = "fsn1"
}

variable "node_version" {
  description = "Default Node.js major version installed system-wide (apps can override per-app via fnm later)."
  type        = string
  default     = "22"
}

variable "use_floating_ip" {
  description = "Provision a Floating IP (a stable address that survives server rebuilds). Point DNS at this."
  type        = bool
  default     = true
}

variable "control_domain" {
  description = "Hostname for the management API (the agent), e.g. control.example.com. Leave empty until you have a domain + DNS record; the agent stays reachable locally regardless."
  type        = string
  default     = ""
}
