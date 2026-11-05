output "site_urls" {
  description = "เปิดเว็บของแต่ละ env (ไม่ต้องมีโดเมน: ใช้ที่อยู่ของ Azure ได้เลย)"
  value       = { for k, a in azurerm_storage_account.site : k => a.primary_web_endpoint }
}

output "storage_accounts" {
  value = { for k, a in azurerm_storage_account.site : k => a.name }
}
