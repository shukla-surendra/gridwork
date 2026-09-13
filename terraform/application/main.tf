data "azurerm_kubernetes_cluster" "this" {
  name                = var.cluster_name
  resource_group_name = var.resource_group_name
}

# Open-source, free, deployed via Helm -- this is what actually gets you a
# public Azure Load Balancer + IP (its Service is type: LoadBalancer) and is
# what enforces the per-IP rate limits set as annotations on the app's own
# Ingress (see helm/personal-assistant/templates/ingress.yaml). Azure
# Application Gateway + WAF is the more "Azure-native" alternative but costs
# meaningfully more (~$41+/week vs. the Standard LB's ~$4/week) and isn't
# needed for a week of learning.
resource "helm_release" "ingress_nginx" {
  name             = "ingress-nginx"
  repository       = "https://kubernetes.github.io/ingress-nginx"
  chart            = "ingress-nginx"
  namespace        = "ingress-nginx"
  create_namespace = true

  # Explicit, conservative requests -- the 2x Standard_B2s (4GB each) node
  # pool doesn't have room to spare for a controller running with whatever
  # the chart's upstream defaults happen to be this release.
  set {
    name  = "controller.resources.requests.cpu"
    value = "100m"
  }
  set {
    name  = "controller.resources.requests.memory"
    value = "128Mi"
  }
  set {
    name  = "controller.service.type"
    value = "LoadBalancer"
  }

  # Without this, Azure's LB health probe defaults to GET / on the same
  # port it load-balances (80) -- which 404s for any request whose Host
  # doesn't match one of this cluster's Ingress rules (nginx's built-in
  # default-backend behavior, correct HTTP semantics, just not what a
  # health check wants). Azure's cloud-provider then marks the backend
  # unhealthy and silently drops ALL external traffic to the LB's public
  # IP -- confirmed live: this is what caused both my own curls AND Let's
  # Encrypt's HTTP-01 validator to see connection timeouts against a
  # correctly-configured NSG/LB, not a firewall or sandbox issue as first
  # suspected. /healthz already returns 200 on the controller's main port
  # with no extra Service port needed (verified: `wget http://localhost:80/healthz`
  # from inside the controller pod) -- just needs Azure told to probe it.
  set {
    name  = "controller.service.annotations.service\\.beta\\.kubernetes\\.io/azure-load-balancer-health-probe-request-path"
    value = "/healthz"
  }
}

# Event-driven autoscaling operator, open-source, deployed via Helm --
# same pattern as ingress-nginx above. Configured with Azure Workload
# Identity via the chart's own first-class podIdentity.azureWorkload block
# (sets the label + client-id/tenant-id annotations on KEDA's own
# "keda-operator" ServiceAccount automatically) rather than a manual
# kubectl patch after install -- reuses the SAME backend identity the app
# already uses for Key Vault/Blob (terraform/keyvault's
# azurerm_federated_identity_credential.keda federates that identity to
# THIS exact ServiceAccount+namespace). No separate identity, no stored
# credential either way.
resource "helm_release" "keda" {
  name             = "keda"
  repository       = "https://kedacore.github.io/charts"
  chart            = "keda"
  namespace        = "keda"
  create_namespace = true

  set {
    name  = "podIdentity.azureWorkload.enabled"
    value = "true"
  }
  set {
    name  = "podIdentity.azureWorkload.clientId"
    value = var.backend_workload_identity_client_id
  }
  set {
    name  = "podIdentity.azureWorkload.tenantId"
    value = var.azure_tenant_id
  }
}

# Open-source, free, deployed via Helm -- same pattern as ingress-nginx/keda
# above. Watches Ingress objects carrying the cert-manager.io/cluster-issuer
# annotation (set on the app's own Ingress below, gated by
# var.ingress_host) and provisions real Let's Encrypt certs automatically,
# no manual cert handling. crds.enabled installs its CRDs (Certificate,
# ClusterIssuer, etc.) as part of this same release rather than a separate
# kubectl apply of cert-manager's CRD yaml.
resource "helm_release" "cert_manager" {
  name             = "cert-manager"
  repository       = "https://charts.jetstack.io"
  chart            = "cert-manager"
  namespace        = "cert-manager"
  create_namespace = true

  set {
    name  = "crds.enabled"
    value = "true"
  }
}

resource "helm_release" "personal_assistant" {
  name             = "personal-assistant"
  chart            = "${path.module}/../../helm/personal-assistant"
  # Own namespace, not "default" -- this cluster is meant to host multiple
  # projects (see the observability stack below, which is genuinely
  # cluster-wide/shared), so each app gets its own namespace the way a
  # real multi-tenant cluster would. Must match keyvault's
  # backend_service_account_namespace (terraform.tfvars) -- the federated
  # credential's subject is scoped to this exact namespace+ServiceAccount
  # pair, same gotcha class as the OIDC-issuer one already documented for
  # cluster recreates.
  namespace        = "personal-assistant"
  create_namespace = true

  # Waits for ingress-nginx's public IP/LB to exist first -- otherwise the
  # app's own Ingress would be created against an ingress class with no
  # controller behind it yet. Also waits for KEDA's CRDs (ScaledObject,
  # TriggerAuthentication) to be registered before this chart tries to
  # create resources of those kinds, and for cert-manager's CRDs
  # (Certificate, ClusterIssuer) before this chart's Ingress carries an
  # annotation referencing them.
  depends_on = [helm_release.ingress_nginx, helm_release.keda, helm_release.cert_manager]

  set {
    name  = "backend.image.repository"
    value = "${var.acr_login_server}/personal-assistant-backend"
  }
  set {
    name  = "backend.image.tag"
    value = var.backend_image_tag
  }
  set {
    name  = "backend.image.pullPolicy"
    value = "IfNotPresent"
  }
  # false by default now -- assistant_web is served from Storage + Front
  # Door (terraform/frontend-cdn), not this cluster. The image.* sets below
  # stay harmless either way: with frontend.enabled=false the chart never
  # renders the Deployment that would consume them.
  set {
    name  = "frontend.enabled"
    value = var.deploy_frontend_to_aks
  }
  set {
    name  = "frontend.image.repository"
    value = "${var.acr_login_server}/personal-assistant-frontend"
  }
  set {
    name  = "frontend.image.tag"
    value = var.frontend_image_tag
  }
  set {
    name  = "frontend.image.pullPolicy"
    value = "IfNotPresent"
  }
  set {
    name  = "ingress.enabled"
    value = "true"
  }
  set {
    name  = "ingress.host"
    value = var.ingress_host
  }
  # Empty ingress_host (default, e.g. on a first apply before the LB's IP is
  # known) forces this to "false" -- there's no host yet for cert-manager to
  # issue a cert for. Get the IP from this stage's own
  # get_ingress_ip_command output, build a nip.io hostname from it
  # (e.g. "20-241-208-190.nip.io"), set ingress_host, and re-apply to turn
  # TLS on with no custom domain required.
  set {
    name  = "ingress.tls.enabled"
    value = var.ingress_host != "" ? "true" : "false"
  }

  set_sensitive {
    name  = "secrets.postgresPassword"
    value = var.postgres_password
  }
  set_sensitive {
    name  = "secrets.jwtSecret"
    value = var.jwt_secret
  }

  # No secrets.openaiApiKey here -- the raw key never flows through
  # Terraform/Helm at all now. Instead the backend pod fetches it directly
  # from Key Vault at pod-start, authenticated as its own Workload Identity
  # (terraform/keyvault). These three values only identify WHICH vault and
  # WHICH identity -- none of them are secret themselves.
  set {
    name  = "backend.workloadIdentityClientId"
    value = var.backend_workload_identity_client_id
  }
  set {
    name  = "keyVault.name"
    value = var.key_vault_name
  }
  set {
    name  = "keyVault.tenantId"
    value = var.azure_tenant_id
  }

  # Not sensitive -- a public HTTPS endpoint. The backend authenticates to
  # it via the same Workload Identity as Key Vault above, not a key, so
  # nothing here needs set_sensitive treatment.
  set {
    name  = "backend.env.azureStorageAccountUrl"
    value = var.backend_storage_account_url
  }

  # Same non-secret pattern as the blob endpoint above, for the KEDA
  # scaling test's job queue.
  set {
    name  = "backend.env.azureStorageQueueUrl"
    value = var.backend_storage_queue_url
  }
  set {
    name  = "queue.accountName"
    value = var.storage_account_name
  }
  set {
    name  = "keda.enabled"
    value = "true"
  }

  set {
    name  = "backend.env.otelExporterOtlpEndpoint"
    value = var.otel_collector_endpoint
  }
}
