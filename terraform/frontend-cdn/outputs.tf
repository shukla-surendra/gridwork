output "storage_account_name" {
  value = azurerm_storage_account.web.name
}

output "storage_static_website_url" {
  description = "The public URL to actually use the app at. Azure Front Door is forbidden on Free Trial/Student subscriptions (confirmed via a real 400 from `terraform apply`, not assumed) -- this account's static website endpoint IS the frontend, no CDN in front of it. HTTPS is still terminated here by Azure, just without a CDN edge or custom domain."
  value       = azurerm_storage_account.web.primary_web_endpoint
}
