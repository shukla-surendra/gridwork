# Adding a Let's Encrypt certificate to the backend, with no custom domain

Why this exists: `assistant_web` is served from an Azure Storage static
website, which is HTTPS-only with no way to turn that off. The backend
(on AKS, behind ingress-nginx) had no TLS at all. A browser on the HTTPS
frontend calling the plain-HTTP backend gets **hard-blocked** as mixed
content by modern browsers — not a warning, an actual blocked request
(confirmed live: `Mixed Content: ... This request has been blocked; the
content must be served over HTTPS.` in the browser console). The backend
needs real TLS before the two can talk at all.

No custom domain was available, and [Azure Front Door is forbidden on
this subscription](AKS_DEPLOYMENT_GUIDE.md) (Free Trial/Student), which
rules out both the usual "put a managed cert on a CDN in front of it"
and "buy a domain, point DNS at it" paths. The fix below gets a real,
publicly-trusted certificate anyway, for free, using
[nip.io](https://nip.io) (a public DNS service that resolves
`<anything>.<ip-with-dashes>.nip.io` back to that literal IP) as a stand-in
hostname and [cert-manager](https://cert-manager.io) to run the ACME
HTTP-01 challenge against it.

## The pieces, and where each one lives

| Piece | Where | What it does |
|---|---|---|
| cert-manager itself | `terraform/application/main.tf`, `helm_release.cert_manager` | Installs cert-manager + its CRDs (`Certificate`, `ClusterIssuer`, ...) into the `cert-manager` namespace, via Helm — same pattern as the `ingress_nginx` and `keda` releases already in that file. |
| `ClusterIssuer` | **Not in any tracked file** — applied by hand, see below | Tells cert-manager which ACME server (Let's Encrypt production) to request certs from, and how to prove domain ownership (HTTP-01, via the existing `nginx` ingress class). |
| TLS wiring on the app's Ingress | `helm/personal-assistant/values.yaml` (`ingress.tls.*`), `helm/personal-assistant/templates/ingress.yaml` (`tls:` block + `cert-manager.io/cluster-issuer` annotation) | The annotation is what cert-manager's ingress-shim controller watches for — when present, it creates a matching `Certificate` object automatically. No separate `Certificate` resource needed in the chart. |
| The hostname itself | `terraform/application/variables.tf` (`ingress_host`), set in `terraform/application/terraform.tfvars` | Becomes the Ingress's `host:` rule and the domain the cert is issued for. |
| Where the frontend points | `assistant_web/src/config.json` (`API_BASE_URL`) | Has to be the `https://` nip.io hostname, not the raw IP — the Ingress is host-restricted once `ingress_host` is set, so a request to the raw IP with no matching `Host` header 404s. |

The issued certificate and its key live only as a Kubernetes Secret
(`personal-assistant-tls`, in the `personal-assistant` namespace) —
nothing about the actual cert material is ever written to a file in this
repo, and it shouldn't be.

## Prerequisite: fix the LB health probe first

This isn't optional — it's the single most likely reason this whole
process silently hangs. Azure's Load Balancer defaults its health probe
to `GET /` on the same port it load-balances (80). For a bare
ingress-nginx install, that 404s (nginx's default-backend behavior for
any request that doesn't match a configured Ingress rule — technically
correct, useless for a health check). Azure then marks the LB backend
**unhealthy** and silently drops *all* external traffic to the public IP
— `kubectl get pods`/`get endpoints` still show everything healthy from
inside the cluster, so nothing about this is visible without checking the
LB probe specifically. Confirmed live on this exact deployment: this is
also what made Let's Encrypt's own HTTP-01 validator time out with
`Timeout during connect (likely firewall problem)`, which looks exactly
like a firewall/NSG issue and isn't one.

Fixed once, already in `terraform/application/main.tf`
(`helm_release.ingress_nginx`):

```hcl
set {
  name  = "controller.service.annotations.service\\.beta\\.kubernetes\\.io/azure-load-balancer-health-probe-request-path"
  value = "/healthz"
}
```

ingress-nginx serves `/healthz` as a 200 on its main port already, no
extra Service port needed. Confirm it's actually in effect before going
any further:

```bash
NODE_RG=$(az aks show -g personal-assistant-learning -n personal-assistant-aks --query nodeResourceGroup -o tsv)
az network lb probe list -g "$NODE_RG" --lb-name kubernetes -o table
# RequestPath column must read /healthz, not /
```

## Step-by-step

### 1. Get the ingress IP and build a nip.io hostname from it

```bash
IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
HOST="$(echo $IP | tr '.' '-').nip.io"
echo "$IP -> $HOST"
# e.g. 20.241.208.190 -> 20-241-208-190.nip.io
```

nip.io needs no registration, no DNS record of your own — it's a public
wildcard resolver that just echoes the IP embedded in the name back as
an A record. Verify it actually resolves before relying on it:

```bash
nslookup "$HOST"   # Address: should match $IP exactly
```

### 2. Point the app's Ingress at that hostname and turn TLS on

Edit `terraform/application/terraform.tfvars`:

```hcl
ingress_host = "20-241-208-190.nip.io"   # use your own $HOST from step 1
```

```bash
cd terraform/application
terraform apply
```

This does two things via `helm_release.personal_assistant`'s `set`
blocks: sets `ingress.host` (adds the `host:` match to the Ingress rule),
and flips `ingress.tls.enabled` to `"true"` whenever `ingress_host` is
non-empty — which renders the `tls:` block and the
`cert-manager.io/cluster-issuer` annotation in
`helm/personal-assistant/templates/ingress.yaml`. At this point the
Ingress references a `ClusterIssuer` named `letsencrypt-prod` that
doesn't exist yet — that's fine, cert-manager will just wait.

### 3. Create the `ClusterIssuer` (one-time, manual — not Terraform)

```bash
cat <<'EOF' | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: YOUR_EMAIL_HERE
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
      - http01:
          ingress:
            ingressClassName: nginx
EOF
```

**Why this isn't a Terraform resource**: `ClusterIssuer` is a Custom
Resource, defined by a CRD that `helm_release.cert_manager` installs in
the very same apply. A `kubernetes_manifest` resource for a CRD-backed
type needs that CRD to already exist at **plan** time, which a
same-apply CRD install can't satisfy — a real ordering problem, not
something worth fighting with `-target` gymnastics for one object that's
created once and essentially never touched again.

```bash
kubectl get clusterissuer letsencrypt-prod
# READY: True, "The ACME account was registered with the ACME server"
```

### 4. Wait for the certificate to issue

cert-manager's ingress-shim controller notices the annotation on the
app's Ingress (from step 2) and creates a `Certificate` object
automatically — nothing to apply by hand here.

```bash
kubectl get certificate -n personal-assistant
# READY: True once issued -- usually under a minute once the ClusterIssuer
# exists and the LB health probe (prerequisite above) is actually passing

# If it's stuck, this shows exactly why:
kubectl get challenge -n personal-assistant
kubectl describe challenge <name> -n personal-assistant | tail -20
```

A `Challenge` in state `invalid` with `Timeout during connect (likely
firewall problem)` means Let's Encrypt's own validator couldn't reach
port 80 on the ingress IP — go back to the health-probe prerequisite
above; this is what it looks like when that's still broken (or was
undone).

### 5. Verify, then point the frontend at it

```bash
curl "https://$HOST/api/v1/users/signup" -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"tls-test@example.com","password":"TestPass123!","first_name":"TLS","last_name":"Test"}'
# 201, with a real trusted cert -- no -k needed
```

Edit `assistant_web/src/config.json`:

```json
"API_BASE_URL": "https://20-241-208-190.nip.io"
```

(matching your own `$HOST`), then rebuild and redeploy the static site —
see `AKS_DEPLOYMENT_GUIDE.md`'s Step 7b.

## Renewal

cert-manager renews automatically, by default starting 30 days before
expiry (Let's Encrypt certs are valid 90 days) — nothing to schedule or
run by hand. `kubectl get certificate -n personal-assistant` shows the
current expiry and renewal time (`kubectl describe certificate
personal-assistant-tls -n personal-assistant`).

## What breaks this, and what doesn't

- **The ingress IP changes** (recreating `aks-infra`, or ingress-nginx's
  Service getting reassigned a new LoadBalancer IP): the nip.io hostname
  changes with it. Repeat step 1 for the new IP, update `ingress_host`
  (step 2) and `config.json` (step 5) to match, and re-apply both. The
  old cert becomes irrelevant (wrong hostname) — cert-manager will issue
  a new one for the new `ingress_host` automatically once the Ingress is
  updated; the `ClusterIssuer` itself doesn't need to be recreated.
- **The cluster is destroyed and rebuilt** (`terraform destroy` /
  `apply` on `aks-infra` and `application`): cert-manager reinstalls
  cleanly via Terraform, but the `ClusterIssuer` does not — it was never
  Terraform-managed (see step 3's rationale). Re-run step 3 by hand
  after a rebuild, before expecting step 4 to do anything.
- **`terraform destroy` on `application`**: removes cert-manager's Helm
  release, which removes its CRDs, which cascades to delete the
  `ClusterIssuer` and `Certificate` objects along with it — no separate
  cleanup step needed on teardown.
