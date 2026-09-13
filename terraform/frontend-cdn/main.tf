# Shared RG from the container-registry stage -- read-only, same
# never-own-the-RG pattern as every other stage (aks-infra/keyvault/
# application). Destroying this stage's state can only remove what it
# actually created (storage account, blobs), never the RG or another
# stage's resources inside it.
data "azurerm_resource_group" "this" {
  name = var.resource_group_name
}

resource "random_string" "web_suffix" {
  length  = 6
  special = false
  upper   = false
}

# Dedicated storage account for assistant_web's static export. Static
# website hosting (below) auto-creates a "$web" container the moment it's
# enabled -- that's the only container Front Door's web origin ever reads
# from.
resource "azurerm_storage_account" "web" {
  name                     = "paweb${random_string.web_suffix.result}"
  resource_group_name      = data.azurerm_resource_group.this.name
  location                 = data.azurerm_resource_group.this.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  tags = {
    purpose = "personal-assistant-learning"
  }
}

resource "azurerm_storage_account_static_website" "web" {
  storage_account_id = azurerm_storage_account.web.id
  index_document     = "index.html"
  # Next's static export always emits one -- assistant_web/next.config.mjs's
  # `output: 'export'`.
  error_404_document = "404.html"
}

locals {
  # `npm run build` in ../../assistant_web writes here (next.config.mjs:
  # output: 'export'). This stage uploads whatever's already there at
  # `terraform apply` time -- it doesn't run the build itself, so build
  # first, then apply, same as pushing an image tag to ACR before pointing
  # the application stage at it.
  build_dir = "${path.module}/../../assistant_web/out"

  content_types = {
    ".html"  = "text/html"
    ".css"   = "text/css"
    ".js"    = "application/javascript"
    ".mjs"   = "application/javascript"
    ".json"  = "application/json"
    ".svg"   = "image/svg+xml"
    ".png"   = "image/png"
    ".jpg"   = "image/jpeg"
    ".jpeg"  = "image/jpeg"
    ".ico"   = "image/x-icon"
    ".woff"  = "font/woff"
    ".woff2" = "font/woff2"
    ".txt"   = "text/plain"
    ".xml"   = "application/xml"
    ".map"   = "application/json"
  }
}

# One blob per file in the static export. content_md5 means a re-apply
# after a rebuild only re-uploads files whose content actually changed,
# not the whole tree every time.
resource "azurerm_storage_blob" "web" {
  for_each = fileset(local.build_dir, "**")

  name                 = each.value
  storage_account_name = azurerm_storage_account.web.name
  # storage_container_name (not the newer storage_container_id) deliberately --
  # "$web" is auto-created by azurerm_storage_account_static_website above,
  # not by a container resource this config owns, so there's no resource to
  # point an _id at without a data-source lookup that would itself fail on
  # a first apply (queried before the static-website resource creates it).
  # Deprecated as of provider 4.x, removed in 5.0 -- `terraform validate`
  # will start failing on this the day this project upgrades past 4.x, and
  # that's the trigger to revisit it, not a bug to fix now.
  storage_container_name = "$web"
  type                   = "Block"
  source                 = "${local.build_dir}/${each.value}"
  content_md5            = filemd5("${local.build_dir}/${each.value}")
  content_type           = lookup(local.content_types, regex("\\.[^.]+$", each.value), "application/octet-stream")

  depends_on = [azurerm_storage_account_static_website.web]
}
