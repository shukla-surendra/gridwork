variable "resource_group_name" {
  description = "Must match the container-registry stage's resource_group_name -- the one shared RG for the whole project (default: personal-assistant-learning)."
  type        = string
  default     = "personal-assistant-learning"
}

variable "cluster_name" {
  description = "Must match the aks-infra stage's cluster_name."
  type        = string
  default     = "personal-assistant-aks"
}

variable "acr_login_server" {
  description = "From container-registry's output: terraform -chdir=../container-registry output -raw acr_login_server"
  type        = string
}

variable "backend_image_tag" {
  description = "Tag pushed to ACR for the backend image (see README.md's build/push steps, or scripts/build-and-push.sh). \"latest\" was the default here originally but was never actually the tag scripts/build-and-push.sh pushes (that defaults to v1) -- a real mismatch that briefly deployed a nonexistent image tag once. v1 matches what actually exists in the registry unless you've pushed something else."
  type        = string
  default     = "v1"
}

variable "frontend_image_tag" {
  type    = string
  default = "v1"
}

variable "backend_workload_identity_client_id" {
  description = "From the keyvault stage's output: terraform -chdir=../keyvault output -raw backend_identity_client_id. Empty means no Key Vault at all (e.g. minikube) -- the chart falls back to secrets.openaiApiKey below, which stays empty -> chat's /completion endpoint returns a clean 503 rather than crashing."
  type        = string
  default     = ""
}

variable "key_vault_name" {
  description = "From the keyvault stage's output: terraform -chdir=../keyvault output -raw key_vault_name"
  type        = string
  default     = ""
}

variable "azure_tenant_id" {
  description = "From the keyvault stage's output: terraform -chdir=../keyvault output -raw tenant_id"
  type        = string
  default     = ""
}

variable "backend_storage_account_url" {
  description = "From the keyvault stage's output: terraform -chdir=../keyvault output -raw storage_account_blob_endpoint. Empty means no avatar upload storage available (e.g. minikube) -- the backend simply has no AZURE_STORAGE_ACCOUNT_URL/AZURE_STORAGE_CONNECTION_STRING set there, so the avatar endpoint would fail if called; nothing else in the app depends on it."
  type        = string
  default     = ""
}

variable "backend_storage_queue_url" {
  description = "From the keyvault stage's output: terraform -chdir=../keyvault output -raw storage_account_queue_endpoint. Empty means no job queue available -- same graceful-absence pattern as backend_storage_account_url."
  type        = string
  default     = ""
}

variable "storage_account_name" {
  description = "From the keyvault stage's output: terraform -chdir=../keyvault output -raw storage_account_name. Feeds KEDA's azure-queue scaler trigger, which wants the bare account name rather than a URL."
  type        = string
  default     = ""
}

variable "ingress_host" {
  description = "A hostname for the app's Ingress and (once set) its Let's Encrypt cert -- e.g. a nip.io hostname built from this stage's own get_ingress_ip_command output (20.241.208.190 -> \"20-241-208-190.nip.io\"), or a real domain if you have one. Empty (the default, e.g. on a first apply before the LB's IP exists) means no host match and no TLS -- the Ingress serves any Host header over plain HTTP, same as before this variable existed."
  type        = string
  default     = ""
}

variable "otel_collector_endpoint" {
  description = "The observability stage's shared OTel Collector service (terraform/observability's helm_release.otel_collector) -- a separate Terraform stage/state, not this one, hence a plain default rather than a cross-stage output reference (same independent-stage pattern as every other stage in this project). Empty disables app-side telemetry entirely."
  type        = string
  default     = "http://otel-collector-opentelemetry-collector.monitoring.svc.cluster.local:4318"
}

variable "deploy_frontend_to_aks" {
  description = "false = assistant_web is NOT installed into this cluster -- it's served from Azure Storage static website + Front Door instead (terraform/frontend-cdn), and the Helm chart's ingress exposes only the backend, under /api. Default false because that's the intended shape now; set true to fall back to the old in-cluster nginx frontend (e.g. no Front Door stage applied yet)."
  type        = bool
  default     = false
}

variable "postgres_password" {
  type      = string
  sensitive = true
}

variable "jwt_secret" {
  description = "Signs auth tokens (config.py's jwt_secret field). Generate with: openssl rand -hex 32"
  type        = string
  sensitive   = true
}
