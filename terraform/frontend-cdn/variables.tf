variable "resource_group_name" {
  description = "Must match the container-registry stage's resource_group_name -- the one shared RG for the whole project (default: personal-assistant-learning). Read via data source, same pattern as aks-infra/keyvault/application -- this stage doesn't own the RG."
  type        = string
  default     = "personal-assistant-learning"
}
