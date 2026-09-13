# Deploying personal_assistant to AKS

A from-scratch, first-time-on-Azure runbook: get this app publicly reachable
on AKS, behind a load balancer, with rate limiting, for about a week of
learning, without surprising your $200 credit.

**Read the whole doc once before running anything.** The teardown section at
the end is not optional reading — it's the difference between this costing
~$25-35 and this costing $200.

## Four Terraform stages, and why four

```
terraform/container-registry/   ACR only. Apply ONCE, leave alone all week.
terraform/aks-infra/            AKS cluster only. Disposable -- tear down and
                                 recreate as many times as you want this week
                                 (to practice the cycle, or manage cost)
                                 without rebuilding or re-pushing images.
terraform/keyvault/              Key Vault + the backend's Workload Identity.
                                 Depends on aks-infra's OIDC issuer URL --
                                 see the "Recreating just the cluster" gotcha
                                 below before tearing aks-infra down alone.
terraform/application/          ingress-nginx + the app itself, on top of
                                 whichever cluster currently exists. As of
                                 2026-09-13, `deploy_frontend_to_aks`
                                 defaults to false -- this stage installs
                                 the backend only, exposed under /api; see
                                 Step 7 for where assistant_web actually
                                 goes.
terraform/frontend-cdn/         assistant_web's static export, on an Azure
                                 Storage static website -- not on the
                                 cluster at all. See Step 7. (Originally
                                 designed with Front Door in front of the
                                 storage site; dropped after a real
                                 `terraform apply` came back "Free Trial
                                 and Student account is forbidden for
                                 Azure Frontdoor resources" -- a hard
                                 subscription-level block, not fixable by
                                 changing SKU or config. The storage
                                 account's own HTTPS endpoint IS the
                                 frontend now.)
```

(A fifth, `terraform/cicd/`, exists separately for GitHub Actions'
OIDC-federated image-build identity -- optional, not part of this
core runbook. See its own resources for details.)

The registry is still its own stage, but as of 2026-09-05 it's no longer
its own resource group -- everything now lives in **one shared RG**
(`personal-assistant-learning`), which `container-registry/` creates and
every other stage reads via a Terraform `data` source instead of creating
its own. The protection this used to get from RG isolation (destroying the
cluster's RG can't be allowed to take ACR down with it) now comes from
**state** isolation instead: a `data` source is read-only, so
`terraform destroy` against `aks-infra` can only remove what `aks-infra`'s
own state manages (VNet, cluster, budget) -- it has no ability to delete
the RG or anything a different stage created inside it, ACR included. See
the 2026-09-05 entry near the bottom of this doc for the full rebuild and
why this changed.

## What gets built, and roughly what it costs for one week

| Piece | What it is | ~Cost/week |
|---|---|---|
| AKS control plane | Free SKU tier — no uptime SLA, $0 | $0 |
| 2x Standard_D2s_v7 nodes | 2 vCPU / 8GB RAM each (`node_count = 2` in aks-infra/terraform.tfvars) | ~$44 |
| Standard Load Balancer | Required by AKS now (Basic SKU is gone) | ~$4 |
| Public IP (Standard) | Attached to the LB | ~$1 |
| ACR (Basic tier) | Container registry for your images | ~$1 |
| Managed Disk (1Gi) | Postgres's PVC | ~$0.02 |
| Container Insights | **Off by default** — log ingestion is the #1 surprise-bill cause | $0 (opt-in) |
| Storage account (LRS) | Hosts assistant_web's static export — its own HTTPS endpoint IS the frontend, no CDN | ~$0.10 |
| **Total** | | **~$50** |

No Front Door line — it's not deployable on this subscription at all (see
the stage list above). If you're on a subscription where it IS allowed,
re-adding it back into `terraform/frontend-cdn` would add Standard Front
Door's flat monthly base fee (~$8-9/week, verify via
`https://prices.azure.com/api/retail/prices`) plus usage.

Node size changed from the original plan: this subscription's VM-size
quota doesn't include the cheap burstable B-series at all (confirmed
against a real `400 Bad Request` from `terraform apply`, not assumed —
common anti-abuse restriction on new/trial subscriptions). `D2s_v7`
pricing verified against Azure's retail Prices API at apply time:
`$0.132/hr` in `eastus`. If your subscription's quota looks different,
check what's actually allowed before trusting these defaults:
`az vm list-skus --location eastus --size Standard_B2s --output table`
(empty output means not allowed, same as what happened here).

Prices otherwise are retail East US estimates and drift over time/region —
treat them as "the right order of magnitude," not an invoice. The bigger
point: this setup leaves you ~$165+ of margin even if something goes
sideways for a couple of days. The real risk isn't per-hour rate, it's
**forgetting to tear it down** — see the last section.

## Prerequisites

```bash
brew install azure-cli   # if not already installed
az login                 # opens a browser; picks your Azure account
az account show          # confirm it's the right subscription
```

`terraform`, `helm`, `kubectl` are already on this machine (used for the
minikube deployment earlier).

## Step 1 — Container registry (`terraform/container-registry/`), apply once

Creates: the one shared resource group for the whole project
(`personal-assistant-learning` by default) + an ACR (Basic tier). Nothing
here references the AKS cluster at all -- this stage just happens to be
where the shared RG gets created, because it's always applied first and
is never casually torn down mid-week.

```bash
cd terraform/container-registry
terraform init
terraform plan
terraform apply
terraform output acr_login_server   # save this -- both later stages need it
terraform output acr_id             # aks-infra needs this
```

Fast (ACR provisions in well under a minute) — nothing here waits on the
slow part (AKS cluster creation, next).

## Step 2 — Build and push images to ACR

This can happen now, before the cluster exists at all — it only needs the
registry from Step 1.

```bash
cd ../..   # repo root (personal_assistant/)
./scripts/build-and-push.sh          # tag=v1, builds+pushes both, auto-detects
                                       # the ACR login server from Step 1's Terraform
                                       # output -- nothing to copy-paste
```

Or one image at a time: `./scripts/build-and-push.sh v1 backend`. What it
runs under the hood, if you'd rather do it by hand:

```bash
ACR=$(terraform -chdir=terraform/container-registry output -raw acr_login_server)
az acr login --name "${ACR%%.*}"
docker build -t $ACR/personal-assistant-backend:v1 ./assistant_backend
docker build -t $ACR/personal-assistant-frontend:v1 ./assistant_web
docker push $ACR/personal-assistant-backend:v1
docker push $ACR/personal-assistant-frontend:v1
```

(`az acr build --registry <name> --image ...:v1 ./assistant_backend` is the
alternative that builds *inside* ACR — skips needing Docker locally, small
per-minute compute charge, negligible for images this size.)

## Step 3 — Cluster infrastructure (`terraform/aks-infra/`)

Creates: VNet+subnet, AKS cluster (Free tier, 1x `Standard_D2s_v7` — see the cost
table above for why this isn't `Standard_B2s` as originally planned), an
`AcrPull` role assignment against Step 1's ACR (so AKS can pull images
without stored credentials), and an Azure Budget with email alerts at
50/80/100% of a
configurable monthly amount (default $50 — well above a real week's cost,
so a hit means something's actually wrong).

```bash
cd terraform/aks-infra
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars: set budget_alert_email to an address you actually check,
# and acr_id to Step 1's `terraform output -raw acr_id`

terraform init
terraform plan    # review before applying anything real/billed
terraform apply
```

Takes ~10-15 minutes (AKS cluster provisioning is the slow part). When done:

```bash
$(terraform output -raw get_credentials_command)   # points kubectl/helm at the new cluster
kubectl get nodes   # should show 2 nodes, Ready
```

**Right now**, go set a second, independent budget alert directly in the
Azure Portal (Cost Management + Billing → Budgets) — belt and suspenders;
the Terraform-managed one and a portal-native one catch different failure
modes (e.g. one existing before this resource group does).

## Step 4 — Key Vault + Workload Identity (`terraform/keyvault/`)

Creates: a Key Vault (RBAC-authorization mode), a dedicated
`azurerm_user_assigned_identity` for just the backend pod, a
`federated_identity_credential` trusting that pod's own Kubernetes
ServiceAccount token (via Step 3's OIDC issuer), and two role
assignments (the backend identity gets read-only "Key Vault Secrets
User"; your own `az login` identity gets "Key Vault Secrets Officer" so
you can actually write the secret in). Optional — skip this stage
entirely (leave `backend_workload_identity_client_id` empty in Step 5)
to fall back to the plain `secrets.openaiApiKey` Helm value instead.

```bash
cd terraform/keyvault
terraform init
terraform apply -var "oidc_issuer_url=$(terraform -chdir=../aks-infra output -raw oidc_issuer_url)"
```

Then set the actual key — **manually, never through Terraform** (keeps
the raw value out of `.tfvars` and `terraform.tfstate` entirely; the
`postgres_password`/`jwt_secret` route via `set_sensitive` still ends up
in plaintext state, this deliberately doesn't):

```bash
$(terraform output -raw set_openai_secret_command)   # after: export OPENAI_API_KEY=sk-... in your own shell first
```

## Step 5 — Application (`terraform/application/`)

Creates: `ingress-nginx` (the actual thing that gets you a public Load
Balancer + IP, and enforces rate limiting) via Helm, then the
`personal-assistant` chart itself pointed at your ACR images, with
`ingress.enabled=true`.

```bash
cd terraform/application
cp terraform.tfvars.example terraform.tfvars
# fill in: acr_login_server (from Step 1's output), postgres_password,
# jwt_secret (openssl rand -hex 32 for both), and -- if Step 4 was run --
# backend_workload_identity_client_id / key_vault_name / azure_tenant_id
# (all three from Step 4's outputs)

terraform init
terraform plan
terraform apply
```

If Step 4 was skipped, leave those three blank -- chat's `/completion`
endpoint returns a clean 503 rather than crashing. To use a key without
Key Vault at all, set the chart's `secrets.openaiApiKey` value directly
(`helm upgrade ... --set secrets.openaiApiKey=$OPENAI_API_KEY`) instead
of through this Terraform stage.

## Step 6 — Verify it's actually publicly reachable

```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller
# EXTERNAL-IP column -- can take 1-2 minutes to populate after apply

IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl -s http://$IP/api/v1/users/signup -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"aks-test@example.com","password":"TestPass123!","first_name":"AKS","last_name":"Test"}'
```

With `deploy_frontend_to_aks` at its default (`false`), `http://$IP/` has
no frontend behind it at all -- only `/api/*` is routed, straight to the
backend. That's expected; the frontend lives on Storage instead (Step 7).
If you set `deploy_frontend_to_aks = true` to fall back to the old
in-cluster nginx frontend, `http://$IP/` serves it directly and should
return 200.

**If this curl just times out** (not a 4xx/5xx, an actual connection
timeout, from your own machine or anywhere else outside the cluster):
check the Azure Load Balancer's health probe before assuming it's a
firewall/NSG/sandbox problem. Confirmed live on this exact setup: Azure
defaults the LB's health probe to `GET /` on the same port it's
load-balancing (80), which 404s against ingress-nginx's default backend
for any request whose Host doesn't match a configured Ingress rule --
correct HTTP semantics, wrong thing for a health check. Azure's
cloud-provider then marks the backend unhealthy and silently drops **all**
external traffic to the public IP, while `kubectl get pods` and
`kubectl get endpoints` still show everything healthy from inside the
cluster -- nothing about the failure is visible from kubectl alone.
`terraform/application/main.tf`'s `helm_release.ingress_nginx` now sets
`controller.service.annotations.service\.beta\.kubernetes\.io/azure-load-balancer-health-probe-request-path=/healthz`
to point the probe at `/healthz` instead, which ingress-nginx serves as a
200 on its main port with no extra Service port needed -- verify with
`az network lb probe list -g $(az aks show -g <rg> -n <cluster> --query nodeResourceGroup -o tsv) --lb-name kubernetes -o table`
(`RequestPath` should read `/healthz`, not `/`). This is baked into the
stage now, so a fresh deployment shouldn't hit it -- documented here
because it cost real time to diagnose and looks exactly like a sandbox or
NSG problem until you check the probe specifically.

## Step 7 — Frontend: assistant_web on an Azure Storage static website (`terraform/frontend-cdn/`)

assistant_web (`next.config.mjs`: `output: 'export'`) is a static site, not
a server -- it never needs a pod. This stage uploads its build output to
an Azure Storage static website; that account's own HTTPS endpoint IS the
frontend URL, no CDN in front of it.

**Front Door was the original design** (path-based routing: `/*` to the
static site, `/api/*` to the backend, replacing the reverse-proxy job
`assistant_web/nginx.conf.template`'s nginx used to do inside a
container) — dropped after a real `terraform apply` against this
subscription came back:
```
BadRequest: Free Trial and Student account is forbidden for Azure Frontdoor resources.
```
That's a hard subscription-level block (confirmed live, not assumed), not
fixable by switching SKU or tweaking config. On a Pay-As-You-Go
subscription, Front Door's `azurerm_cdn_frontdoor_*` resources would work
as originally designed; here, without that split, the frontend calls the
backend's own public IP directly instead — cross-origin. The backend's
CORS is already wide open (`helm/personal-assistant/values.yaml`'s
`allowedOrigins: "*"`), so cross-origin calls work with no backend change
-- but the storage static website is HTTPS-only (Azure gives no way to
turn that off), and a plain HTTP backend gets **hard-blocked** as mixed
content by every modern browser, not just warned (confirmed live: an
actual demo request logged as "blocked... must be served over HTTPS" in
the browser console, not merely a lock-icon warning). The backend needs
real TLS, which is Step 7a below, before this frontend can call it from
anywhere.

### Step 7a — TLS for the backend, with no custom domain (`cert-manager` + `nip.io`)

`terraform/application/main.tf` now also installs `cert-manager` (same
Helm-release pattern as ingress-nginx/KEDA). What's still manual, because
it depends on the ingress IP the same way `backend_origin_host` used to:

```bash
IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
HOST="$(echo $IP | tr '.' '-').nip.io"   # 20.241.208.190 -> 20-241-208-190.nip.io --
                                          # resolves back to that exact IP, no domain
                                          # purchase or DNS setup needed
echo $HOST
```

Edit `terraform/application/terraform.tfvars`: set `ingress_host` to that
value, then `terraform apply` again from `terraform/application` — this
sets `ingress.host` and flips `ingress.tls.enabled` on in the Helm values,
which adds a `cert-manager.io/cluster-issuer` annotation to the app's own
Ingress.

cert-manager's CRDs (`ClusterIssuer`, etc.) come from that same Helm
release, but the actual `ClusterIssuer` object is **not** Terraform-managed
(a `kubernetes_manifest` resource for a CRD that's created in the same
apply as the CRD itself is a real chicken-and-egg problem — simpler to
apply once by hand):

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

kubectl get clusterissuer letsencrypt-prod        # READY: True once registered
kubectl get certificate -n personal-assistant     # READY: True once issued -- a minute or two
```

**If the Certificate stays stuck `READY: False`** with a Challenge in
state `invalid` and a message like `Timeout during connect (likely
firewall problem)` — that's Let's Encrypt's own validator unable to reach
the ingress on port 80, and it means the LB health-probe bug described in
Step 6 hasn't actually been fixed for this cluster (an older
`terraform/application` state, or a hand-edited Service). Fix that first;
Let's Encrypt validation will retry and succeed on its own once the LB
actually forwards traffic. Confirm the probe with the same
`az network lb probe list` command from Step 6.

Once `kubectl get certificate` shows `READY: True`:

```bash
curl https://$HOST/api/v1/users/signup -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"tls-test@example.com","password":"TestPass123!","first_name":"TLS","last_name":"Test"}'
```

### Step 7b — Build and upload the frontend

```bash
cd assistant_web
npm ci
# Edit src/config.json: API_BASE_URL -> https://<the nip.io host from 7a>
# e.g. "API_BASE_URL": "https://20-241-208-190.nip.io"
npm run build            # writes assistant_web/out/ -- frontend-cdn/main.tf
                          # uploads whatever's there at apply time, it
                          # doesn't build anything itself

cd ../terraform/frontend-cdn
terraform init
terraform plan
terraform apply

terraform output -raw storage_static_website_url
```

Open that URL in a browser.

**Re-deploying after a frontend code change**: `npm run build` again,
`terraform apply` again from `terraform/frontend-cdn` -- only files whose
content actually changed get re-uploaded (`content_md5` on each
`azurerm_storage_blob`). If the ingress IP ever changes (recreating
`aks-infra` or the ingress-nginx Service reassigns a new one), the nip.io
hostname changes too -- repeat Step 7a's `ingress_host` update AND Step
7b's `config.json` edit; the frontend has no way to discover the
backend's address on its own, and the old Let's Encrypt cert won't match
the new hostname either.

**A known gap in "Storage static website, no CDN"**: Azure Storage static
websites don't rewrite extension-less URLs to `.html` the way nginx's
`try_files` did (`assistant_web/nginx.conf.template`, no longer in the
request path at all now that the frontend isn't a container). `/login.html`
loads directly; `/login` 404s. Client-side navigation from the app itself
is unaffected (Next's router handles it after the JS bundle loads) — this
only bites a hard refresh or a shared deep link to a path without
`.html`. Fixable by setting the static website's 404 document to
`index.html` (Next then client-side-routes to the right page after
hydration, with a brief flash of the wrong page) or by re-adding Front
Door once this subscription allows it (real path-based routing, no
flash) — neither is done here; flagging it rather than picking one
unasked.

## Shipping a code update to an already-running cluster

This is the loop for "I changed the app, get the new version live" — as
opposed to Steps 1-6 above, which are first-time setup. No new
infrastructure gets created here; it's new images + a Helm values change
on top of everything that already exists.

```bash
# 1. Commit and push -- the CI workflow builds from whatever's on `main`,
#    not from your local working tree.
git add -A && git commit -m "..." && git push

# 2. Trigger the build (native amd64 GitHub runners -- no local QEMU pain).
#    First time only: the workflow needs three REPO VARIABLES (Settings ->
#    Secrets and variables -> Actions -> Variables), not secrets -- these
#    are identifiers, not credentials (see docs/AWS_vs_AZURE_PERMISSIONS.md):
gh variable set AZURE_CLIENT_ID       --body "$(terraform -chdir=terraform/cicd output -raw azure_client_id)"
gh variable set AZURE_TENANT_ID       --body "$(terraform -chdir=terraform/cicd output -raw azure_tenant_id)"
gh variable set AZURE_SUBSCRIPTION_ID --body "$(terraform -chdir=terraform/cicd output -raw azure_subscription_id)"
# Without these, the workflow's Azure login step fails immediately with
# "Not all values are present. Ensure 'client-id' and 'tenant-id' are
# supplied." -- a real, observed failure the first time this ran, not a
# hypothetical.

gh workflow run build-and-push.yml -f tag=v2 -f target=all
gh run watch <run-id-from-the-output-above> --exit-status

# 3. Point the Helm release at the new tag.
#    Edit terraform/application/terraform.tfvars:
#      backend_image_tag  = "v2"
#      frontend_image_tag = "v2"

cd terraform/application
az aks get-credentials --resource-group personal-assistant-learning --name personal-assistant-aks --overwrite-existing
terraform plan -out=tfplan   # should show ONLY the two image.tag values changing
terraform apply tfplan
```

`terraform apply` here does a `helm upgrade` under the hood — Kubernetes
does a normal rolling update (new pod comes up healthy before the old one
terminates), so there's no real downtime window. The `migration-job.yaml`
Helm hook fires again on every `helm upgrade` regardless of whether the
schema actually changed (Alembic's `upgrade head` is a no-op if there's
nothing new to apply, confirmed by it completing in ~4-17s rather than
erroring) — same "check the Job's own status, don't just trust
`helm_release` succeeded" lesson from earlier in this doc's development
history still applies:

```bash
kubectl get pods                 # both Deployments should show a fresh AGE, 1/1 Running
kubectl get deploy personal-assistant-backend -o jsonpath='{.spec.template.spec.containers[0].image}'
kubectl get jobs                 # latest personal-assistant-migrate-N should be Complete
```

Then re-run Step 6's verification commands against the same public IP —
nothing about the IP, the Ingress, or the Load Balancer changes on a code
update, only the pods behind them do.

## Rate limiting — what's actually enforcing it, and how to see it work

Two independent layers, on purpose:

1. **`ingress-nginx`** (`nginx.ingress.kubernetes.io/limit-rps: "10"` on the
   app's Ingress, `helm/personal-assistant/templates/ingress.yaml`) — caps
   requests **per client IP** at the cluster edge, before a request ever
   reaches a pod. Protects against a flood driving up LB data-processing
   cost or overwhelming the 2-node pool.
2. **The app's own limiter** (`assistant_backend/middleware/rate_limit.py`,
   Redis-backed) — per-user API quotas (100/min authenticated, 20/min
   not) once a request is already past the edge.

To see #1 fire, hammer it past 10 req/s from one IP:

```bash
for i in $(seq 1 30); do curl -s -o /dev/null -w "%{http_code} " http://$IP/api/v1/users/signup -X POST -H "Content-Type: application/json" -d '{}'; done
```

You should see `503`s (nginx's default rate-limit rejection status) mixed
in once you exceed the burst allowance (`burstMultiplier: 5` → roughly 50
requests before rejection kicks in, per nginx's leaky-bucket algorithm).

Tune via `helm/personal-assistant/values.yaml`'s `ingress.rateLimit` block,
or `helm upgrade` with `--set ingress.rateLimit.requestsPerSecond=<n>`.

## Monitoring cost during the week

- Azure Portal → **Cost Management + Billing → Cost analysis**, scoped to
  the `personal-assistant-learning` resource group (as of 2026-09-05 this
  is the only one this project's Terraform creates; also check the
  AKS-managed `MC_personal-assistant-learning_personal-assistant-aks_eastus`
  pair, since the node VM/LB/public IP costs live there) — check daily,
  costs lag by ~24-48h so don't expect same-day numbers.
- The budget alerts from Step 3 email you at 50/80/100% of `budget_amount_usd`.
- `az consumption usage list --output table` for a CLI-side check.

## Recreating just the cluster mid-week (keeping the registry AND the vault)

As of 2026-09-05, `keyvault` no longer needs destroying before `aks-infra`
-- see the gotcha below for why. It still needs *reapplying* afterward,
just not destroying first:

```bash
cd terraform/application && terraform destroy   # must go first regardless: once aks-infra
                                                  # is gone, this stage's Helm release no
                                                  # longer exists in any real cluster, but
                                                  # Terraform's own state doesn't know that
                                                  # yet -- destroy it while it can still act
cd ../aks-infra && terraform destroy             # keyvault is UNTOUCHED by this -- it no
                                                  # longer lives in a resource group
                                                  # aks-infra owns
# ... later, whenever you want it back:
cd ../aks-infra && terraform apply               # same acr_id, same images already in ACR
cd ../keyvault && terraform apply -var "oidc_issuer_url=$(terraform -chdir=../aks-infra output -raw oidc_issuer_url)"
                                                  # a plain re-apply, not destroy+recreate --
                                                  # see the gotcha below for what this fixes
cd ../application && terraform apply
```

**Gotcha: a recreated cluster gets a brand-new OIDC issuer URL.** Every
AKS cluster mints its own unique `oidc_issuer_url` at creation time --
even with identical config, destroying and recreating aks-infra produces
a *different* URL than before. The `keyvault` stage's
`federated_identity_credential` is pinned to whatever URL it was applied
with, so a stale one silently stops matching the new cluster's pod
tokens -- Workload Identity auth would fail with no obvious error
pointing at "the issuer URL changed." Reapplying `keyvault` with the new
issuer URL updates just that one drifted field in place -- the vault and
its secrets are untouched, no re-running `az keyvault secret set` needed.

**Historical note (this changed 2026-09-05):** before consolidating to one
resource group, `keyvault`'s vault lived inside `aks-infra`'s own resource
group, so destroying `aks-infra` would have taken the vault down as an
uncontrolled side effect of the RG deletion, orphaning `keyvault`'s own
Terraform state -- that's why this section used to destroy `keyvault`
first. With `aks-infra` reading the shared RG via a `data` source instead
of owning it, that hazard is gone: `terraform destroy` there can only
remove what `aks-infra`'s own state manages, so the vault now survives
untouched and only needs the re-apply above.

## Teardown — do this before the week is out, not after

Destroy in this order — application first, so Helm gets a chance to clean
up the Load Balancer/Public IP *before* the VNet they sit in disappears out
from under them, and so its Terraform state doesn't go stale once the
cluster it deployed into is gone; then the cluster; then keyvault; then
finally the registry, since it owns the one shared resource group itself
now and deleting that RG is what actually removes it and everything ACR
holds:

```bash
cd terraform/application
terraform destroy       # removes the Helm releases (ingress-nginx, KEDA, cert-manager,
                         # personal-assistant) -- LB, Public IP, Ingress cleanly torn down.
                         # cert-manager's uninstall removes its CRDs too, which cascades
                         # to delete the ClusterIssuer and Certificate objects Step 7a
                         # created by hand -- no separate cleanup needed for those.

cd ../frontend-cdn
terraform destroy       # removes the storage account (and every blob in it) --
                         # independent of the cluster, but still must go before
                         # container-registry below deletes the shared RG

cd ../aks-infra
terraform destroy       # removes the AKS cluster (+ its MC_* resource group), VNet, budget --
                         # does NOT touch the shared personal-assistant-learning RG itself

cd ../keyvault
terraform destroy       # removes the vault, the backend identity, its federated credential + role assignments

cd ../container-registry
terraform destroy       # removes the ACR, every image in it, AND the shared resource group
                         # itself (this is the stage that owns it) -- do this LAST
```

Confirm nothing's left:

```bash
az group list --output table   # personal-assistant-learning and its MC_* pair should both be gone
```

If `terraform destroy` fails partway (it happens), the reliable fallback is
deleting the resource group directly (one now, not two):

```bash
az group delete --name personal-assistant-learning --yes --no-wait
```

That's a real destructive action against your real subscription — run it
yourself, don't have anything automated do it for you.

---

## A worked example: shipping a real change, then tearing everything down

### 2026-09-04 — v2: CRM fixes, a demo-account feature, and the CI gotcha it surfaced

Starting point: the cluster from earlier this week was still up, still on
the `v1` images, serving real traffic at `http://48.206.145.18/`. A
session of local work had landed real fixes (the CRM Activities tab was
wired to the wrong backend endpoints entirely; Contacts/Deals create-edit-
delete had several argument-order bugs; `adapters/orm/fixtures.py` was
dead on import) plus a new feature (`POST /api/v1/users/demo` — a
self-serve "Try Demo" button that mints a fresh, fully-seeded account with
no signup form). All of that was committed and pushed to `main` first —
the CI workflow builds from what's on GitHub, not from a local working
tree.

**Triggered the build, hit a real, useful failure immediately:**

```bash
gh workflow run build-and-push.yml -f tag=v2 -f target=all
```

The `Azure login (OIDC, no stored secret)` step failed on the very first
run:

```
Login failed with Error: Using auth-type: SERVICE_PRINCIPAL. Not all
values are present. Ensure 'client-id' and 'tenant-id' are supplied.
```

Root cause, confirmed rather than guessed: `gh variable list` came back
empty. `terraform/cicd` had created the App Registration and federated
identity credential earlier this week, but the three repo **variables**
(`AZURE_CLIENT_ID`/`AZURE_TENANT_ID`/`AZURE_SUBSCRIPTION_ID` — the
workflow's `azure/login@v2` step reads these, see
`.github/workflows/build-and-push.yml`) had never actually been set on the
GitHub side. The Terraform stage existing isn't the same as the repo being
wired up to use it. Fixed by reading straight from that stage's live
outputs (not retyping values from an old doc — verified they were still
current first):

```bash
gh variable set AZURE_CLIENT_ID       --body "$(terraform -chdir=terraform/cicd output -raw azure_client_id)"
gh variable set AZURE_TENANT_ID       --body "$(terraform -chdir=terraform/cicd output -raw azure_tenant_id)"
gh variable set AZURE_SUBSCRIPTION_ID --body "$(terraform -chdir=terraform/cicd output -raw azure_subscription_id)"
```

Re-triggered, watched it with `gh run watch <id> --exit-status` — this
time real amd64 hardware, no local QEMU wait, both images built and pushed
to ACR as `v2` in under two minutes total.

**Rolled out**: bumped `backend_image_tag`/`frontend_image_tag` to `v2` in
`terraform/application/terraform.tfvars`, `terraform plan` (confirmed the
diff was *only* those two values, nothing else drifted), `terraform
apply`. `helm_release.personal_assistant: Modifications complete after
1m9s` — a normal Kubernetes rolling update, old pods stayed serving until
new ones passed their readiness probe, so no real downtime window.
Verified for real, not just trusted the exit code:

```bash
kubectl get deploy personal-assistant-backend -o jsonpath='{.spec.template.spec.containers[0].image}'
# personalassistantfoylsi.azurecr.io/personal-assistant-backend:v2
kubectl get jobs   # migration Job #4 -- Complete, 17s (no-op: no schema change this release)
```

Then walked the actual new features through the public IP end-to-end —
not just "pods are Running," the specific things that were broken/new:

```bash
curl -s http://48.206.145.18/api/v1/users/demo -X POST   # -> fresh account, real token, real seeded workspace
# created a contact activity, PUT to update it, DELETE it -- the two
# endpoints that flatly didn't exist before this release -- both 200
```

### 2026-09-04 — full teardown, in the order the Teardown section above says

Requested directly: tear everything down for a deliberate stop-and-review
before rebuilding it by hand. Followed this doc's own destroy order
exactly — application first (so Helm gets to clean up the LB/Public IP
before the VNet under it disappears), then keyvault (lives inside
aks-infra's resource group, would be an uncontrolled side effect
otherwise), then the cluster, then `cicd` (not in this doc's original
teardown list — added it since it's real infrastructure this project
created too, even though it costs nothing sitting idle), then the
registry last:

```
terraform/application       -> 2 destroyed   (17s, 33s)
terraform/keyvault           -> 6 destroyed   (~20s total)
terraform/aks-infra          -> 6 destroyed   (cluster itself: 5m51s -- by far the slowest step)
terraform/cicd                -> 4 destroyed   (~1m)
terraform/container-registry  -> 3 destroyed   (~25s)
```

Confirmed clean, not assumed:

```bash
az group list --output table
# personal-assistant-registry, personal-assistant-learning, and its MC_*
# pair all gone. Only RG-EAST_US and NetworkWatcherRG remain -- both
# pre-existing, unrelated to this project.
```

**One cleanup step not in this doc's original teardown checklist**: the
GitHub repo variables set earlier in this same session now pointed at a
destroyed identity. Removed them too, so a future `git clone` + fresh
setup doesn't find stale, misleading values already sitting there:

```bash
gh variable delete AZURE_CLIENT_ID
gh variable delete AZURE_TENANT_ID
gh variable delete AZURE_SUBSCRIPTION_ID
```

**What survives a full teardown, deliberately**: every Terraform file, the
Helm chart, this doc, `docs/terraform-infra-walkthrough.md`,
`docs/architecture.md`, `docs/AWS_vs_AZURE_PERMISSIONS.md`, and the
application code itself (including today's CRM fixes and the demo-account
feature) — none of that lives in Azure. Rebuilding from here is Steps 1-6
of this doc again, in order, same as the very first time.

### `NetworkWatcherRG` / `NetworkWatcher_eastus` — the one thing left in the subscription, and why that's fine

`az group list` after the teardown above still shows `NetworkWatcherRG`
alongside the pre-existing `RG-EAST_US`. Worth understanding rather than
just ignoring:

**The mechanism**: the first time *any* VNet gets created in a region
within a subscription, Azure auto-provisions a `NetworkWatcherRG` resource
group and a `NetworkWatcher_<region>` resource for that region. The
trigger here was `azurerm_virtual_network.this` in
`terraform/aks-infra/main.tf` (`personal-assistant-aks-vnet`) — Azure's own
housekeeping, not anything any of the five Terraform stages in this repo
ever created. Confirmed directly, not assumed:

```bash
az network watcher list --output table
# eastus   NetworkWatcher_eastus   Succeeded   NetworkWatcherRG

az resource list --resource-group NetworkWatcherRG --output table
# same resource, no tags at all -- every resource this project's Terraform
# actually manages carries purpose = personal-assistant-learning; this
# doesn't, because nothing in terraform/ ever put it there
```

That untagged state is exactly why `terraform destroy` across all five
stages never touched it — it isn't tracked in any of their state files,
so there was never anything to destroy.

**What it's for**: IP flow verify, NSG flow logs, packet capture,
connection troubleshoot, topology view, next-hop diagnostics — regional
tooling for debugging *any* VNet in `eastus`, not scoped to one VNet or
resource group.

**Cost**: $0 for the resource itself sitting idle. It only costs money if
a specific feature is turned on against it (NSG Flow Logs need a storage
account behind them, for example) — nothing here ever did that.

**Does it matter now**: no. The VNet is gone, so it has nothing left to
watch, but Azure doesn't auto-delete it just because the last VNet in the
region disappeared. It'll sit there, empty and free, until the next VNet
gets created in `eastus` — including the next AKS rebuild from this same
doc. Safe to leave alone; optional removal if it bothers you:
`az network watcher configure --locations eastus --enabled false`.

### 2026-09-05 — full rebuild from scratch, consolidated to one resource group

Starting point: confirmed, not assumed, that yesterday's teardown really
was clean before touching anything —

```bash
az group list --output table
# RG-EAST_US and NetworkWatcherRG only. No personal-assistant-* RG, no MC_* pair.

for d in aks-infra container-registry keyvault cicd application; do
  python3 -c "import json; print('$d', len(json.load(open('terraform/$d/terraform.tfstate'))['resources']))"
done
# every stage: 0 resources tracked
```

So this was a genuine from-scratch rebuild, not a destroy-then-recreate —
matching the "rebuilding from here is Steps 1-6 again" line at the end of
yesterday's entry. New requirement this time: **consolidate every stage
into a single resource group.** The existing design used two
(`personal-assistant-registry` + `personal-assistant-learning`)
specifically so a cluster teardown couldn't take ACR down with it (RG
deletion cascades to everything inside it, regardless of which Terraform
state manages which resource — see `docs/terraform-infra-walkthrough.md`).
Collapsing to one RG without losing that protection meant moving the
blast-radius boundary from **RG ownership** to **Terraform state
ownership**:

- `container-registry/` (applies first, never torn down mid-week) keeps
  creating the RG — renamed its default from `personal-assistant-registry`
  to the shared `personal-assistant-learning`.
- `aks-infra/main.tf` changed from `resource "azurerm_resource_group" "this"`
  to `data "azurerm_resource_group" "this"` — every reference
  (`azurerm_resource_group.this.location/name/id`) updated to the `data.`
  form. A `data` source is read-only, so this stage's `terraform destroy`
  can never delete the RG or anything another stage's state manages inside
  it — the exact property RG isolation used to provide, now provided by
  state isolation instead. `keyvault/` and `application/` already only
  *referenced* `resource_group_name` by variable, never owned the resource,
  so no equivalent change was needed there — just updated their variable
  descriptions to say "matches container-registry's RG," not aks-infra's.

`terraform validate` clean on all four touched stages before running
anything real. Then the actual rebuild, each stage confirmed via
`terraform plan` before `apply`:

```
terraform/container-registry   -> 3 added   (29s RG, 26s ACR)
terraform/aks-infra            -> 5 added   (cluster itself: 6m48s)
terraform/keyvault              -> 9 added   (~1m total)
```

Images built and pushed as `v3` (`./scripts/build-and-push.sh v3 all`) in
parallel with the cluster provisioning — Step 2 doesn't depend on Step 3,
same as the doc above already says.

**A real failure, not a hypothetical**: `terraform apply` on `application/`
hit `Error: context deadline exceeded` after ~5 minutes (Helm's default
install timeout). `kubectl get pods` showed the backend stuck in
`ContainerCreating`; `kubectl describe pod` had the actual cause:

```
Warning  FailedMount  ...  MountVolume.SetUp failed for volume "openai-secrets" :
  ... failed to get objectType:secret, objectName:openai-api-key ...
  RESPONSE 404: SecretNotFound
```

Root cause: the Secrets Store CSI driver's `SecretProviderClass` mounts
`openai-api-key` from the **new** Key Vault (`pa-kv-we5kzd`) into the
backend pod at startup, and that secret had never been set — the guide's
"leave it blank, chat returns a clean 503" fallback only applies when
Key Vault integration is *not* wired up at all; once
`backend_workload_identity_client_id`/`key_vault_name` are set (they were,
deliberately, to actually exercise the feature), the volume mount itself
blocks pod startup until the secret exists, whether or not it's a working
key. Fixed by setting a placeholder value (no real `OPENAI_API_KEY` was
available in this session's shell — `/completion` will still 503 with a
placeholder key, same graceful-degradation the guide already documents,
just at the OpenAI-API-call layer instead of the missing-secret layer):

```bash
az keyvault secret set --vault-name pa-kv-we5kzd --name openai-api-key --value "placeholder-not-a-real-key"
```

kubelet's mount retry has its own exponential backoff — `kubectl describe
pod` still showed a 404 nearly a minute after the secret was set, purely
from backoff timing, not because the fix hadn't taken (`az keyvault secret
show` confirmed the secret existed immediately). `kubectl rollout status
deployment/personal-assistant-backend --timeout=180s` waited it out
correctly rather than guessing with a fixed sleep.

That left the Terraform-managed Helm release itself **tainted** (Helm's
own state: `STATUS: failed`) even though the underlying pods eventually
came up — Terraform doesn't reconcile that on its own. `terraform plan`
confirmed a clean replace (`1 to add, 1 to destroy`, i.e. uninstall the
failed release and reinstall), and since nothing had written real data yet
(migrations hadn't even run), this was zero-risk:

```
helm_release.personal_assistant: Destroying...  (14s)
helm_release.personal_assistant: Creating...    (1m12s)
```

Second install succeeded cleanly on the first try (the secret already
existed this time, no backoff wait): `helm list` → `STATUS: deployed`,
migration Job `personal-assistant-migrate-1` → `Complete` in 5s, all 4
pods `Running`.

**Verified end-to-end, not just "pods are Running"**:

```bash
IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl -s -o /dev/null -w "%{http_code}\n" http://$IP/                      # 200
curl -s -X POST http://$IP/api/v1/users/demo                              # 200, real token + seeded workspace
```

**Confirmed the one-resource-group requirement actually held**:

```bash
az resource list --resource-group personal-assistant-learning --output table
# personalassistant7qkzxh (ACR), personal-assistant-aks-vnet, personal-assistant-aks (AKS),
# personal-assistant-backend-identity, paavatarswe5kzd (Storage), pa-kv-we5kzd (Key Vault)
# -- everything this project's Terraform creates, one RG.

az group list --output table
# RG-EAST_US, NetworkWatcherRG (pre-existing, unrelated) + personal-assistant-learning
# + MC_personal-assistant-learning_personal-assistant-aks_eastus (AKS-managed, see below)
```

One shared RG for everything under this project's own control. The `MC_*`
pair still exists — that's not a design choice any of this Terraform
made, it's unconditional AKS behavior, covered next.

### What AKS actually handed over: control plane vs. worker node

The instructions asked specifically what's in the control plane versus the
worker node for this cluster. Answered with live evidence from the cluster
above, right after it first came up — not a generic diagram.

**Control plane: not a resource in this subscription at all.**

```bash
kubectl cluster-info
# Kubernetes control plane is running at
#   https://personal-assistant-aks-we5px1hs.hcp.eastus.azmk8s.io:443
```

That URL is the whole story: `kube-apiserver`, `etcd`,
`kube-scheduler`, `kube-controller-manager`, and Azure's own
`cloud-controller-manager` all run on Microsoft-managed infrastructure,
multi-tenant, in a Microsoft-owned subscription — not
`personal-assistant-learning`, not the `MC_*` group, not anywhere `az
resource list` against this account can ever show. There is no VM to
`kubectl describe node` for the control plane, because there isn't one in
this account to describe. This is the literal meaning of
`aks-infra/main.tf`'s `sku_tier = "Free"` — "$0 for the control plane" is
true because nothing here provisions any compute for it; the fee-based
`Standard` tier only buys an uptime SLA on top of the same
Microsoft-managed arrangement, not dedicated hardware.

The one structural consequence of the control plane living outside this
account's network: it can't natively route into the cluster's VNet
(`10.10.0.0/16`) to do things like `kubectl exec`, `kubectl logs`, or call
an admission webhook. That's what the `konnectivity-agent` pods
(`kubectl get pods -n kube-system`) are for — they run *inside* the VNet,
on the worker node, and open an outbound tunnel to the control plane; the
control plane routes API-initiated calls back down that tunnel instead of
trying to reach in on its own. It's the concrete plumbing cost of "hide
the control plane," not incidental noise in `kube-system`.

**Worker node: the one thing that actually is a billable resource in this
subscription** — but in the AKS-managed `MC_*` resource group, not the
primary one:

```bash
az vmss list --resource-group MC_personal-assistant-learning_personal-assistant-aks_eastus \
  --query "[].{name:name, sku:sku.name, capacity:sku.capacity}" -o table
# aks-system-74744284-vmss   Standard_D2s_v7   1
```

That VM Scale Set (1 instance, since `node_count = 1`) is the actual
compute `kubectl get nodes` shows as `aks-system-74744284-vmss000000`. Its
supporting network objects live in the same `MC_*` group, all
auto-created by AKS, none of it hand-written in this repo's Terraform: an
NSG (`aks-agentpool-98868521-nsg`), a route table (kubenet needs one,
since pod IPs on `10.244.0.0/24` aren't natively routable on the VNet —
the route table is what makes them reachable node-to-node), and a
Standard Load Balancer named `kubernetes` that existed with **one**
frontend IP from the moment the cluster was created (default outbound
SNAT, present even with zero user-created Services) and gained a
**second** frontend IP only once `application/`'s ingress-nginx Service
(`type: LoadBalancer`) was deployed — confirmed by checking
`az network lb list` before and after that stage ran, not assumed from
the chart alone.

On the node itself, `kubectl describe node aks-system-74744284-vmss000000`:

```
Container Runtime Version:  containerd://2.3.3-2
Kubelet Version:             v1.35.7
OS Image:                    Ubuntu 24.04.4 LTS
Capacity:      cpu: 2, memory: 8126904Ki, pods: 110
Allocatable:   cpu: 1900m, memory: 5927352Ki   (system-reserved eats the rest)
PodCIDR:                     10.244.0.0/24
```

`kubectl get pods -n kube-system -o wide` — everything here schedules onto
that single node (there's only one), and each earns its place:

- **`kube-proxy`** — programs the iptables/ipvs rules that make every
  `ClusterIP` Service actually route to a pod; without it, `10.0.84.164`
  (the backend's ClusterIP, from `kubectl get svc`) resolves to nothing.
- **`coredns` (x2) + `coredns-autoscaler`** — cluster DNS; what lets the
  backend pod resolve `personal-assistant-postgres` as a hostname instead
  of hardcoding `10.244.0.20`.
- **`azure-ip-masq-agent`** — SNATs pod-to-external traffic so it looks
  like it's coming from the node's own IP, not the internal
  `10.244.0.0/24` range nothing outside the VNet would know how to route
  back to.
- **`cloud-node-manager`** — keeps the Kubernetes `Node` object's
  labels/taints/lifecycle in sync with the actual Azure VM underneath it
  (this is the `cloud-controller-manager`'s per-node counterpart; the
  controller-manager itself is control-plane-side, this agent is its
  worker-node half).
- **`csi-azuredisk-node` + `csi-azurefile-node`** — the per-node halves of
  Azure's storage CSI drivers. `csi-azuredisk-node` is specifically what
  attached the Postgres StatefulSet's PVC (`data-personal-assistant-postgres-0`,
  confirmed `Bound` via `kubectl get pvc`) to this node.
- **`aks-secrets-store-csi-driver` + `aks-secrets-store-provider-azure`** —
  the Key Vault CSI driver and its Azure-specific provider plugin. This is
  exactly the pair that failed above — the mechanism that's supposed to
  mount `openai-api-key` from Key Vault into a pod's filesystem, which is
  precisely why a missing secret blocks pod startup instead of the pod
  just not having the file.
- **`azure-wi-webhook-controller-manager` (x2)** — Workload Identity's
  mutating admission webhook. It's what actually injects the token-
  projection volume and environment variables into any pod carrying the
  `azure.workload.identity/use: "true"` label (the backend pod has it,
  confirmed via `kubectl get pod ... -o jsonpath='{.metadata.labels}'`) —
  without this webhook running, that label does nothing and Workload
  Identity auth silently never happens.
- **`metrics-server` (x2)** — feeds `kubectl top`; unrelated to anything
  the app needs, present because AKS installs it by default.
- **`konnectivity-agent` (x2) + its autoscaler** — covered above, the
  control-plane-to-VNet tunnel.

**The one-resource-group instruction has a hard limit, and this is it**:
everything above in the `MC_*` group — the VMSS, its NSG, its route table,
the `kubernetes` LB — is AKS's own unconditional behavior. There is no
`azurerm_kubernetes_cluster` setting to fold it into
`personal-assistant-learning`; it exists regardless of how many resource
groups this repo's Terraform uses. "One resource group" is accurate for
everything actually under this project's control (confirmed above); a
second, Azure-managed one for the node pool's real infrastructure is a
structural fact of AKS, not a consolidation this rebuild could reach.
