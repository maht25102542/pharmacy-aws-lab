# Azure เก็บของเป็นกลุ่ม: resource group ใบเดียว ลบทิ้งทีเดียวได้ทั้งหมด (คู่กับการแยก bucket ต่อ env ของ AWS S3)
resource "azurerm_resource_group" "web" {
  name     = "${var.project}-web-rg"
  location = var.location
}

# storage account ต่อ env: ชื่อ 3-24 ตัว พิมพ์เล็ก+ตัวเลขเท่านั้น และไม่ซ้ำทั้งโลก
resource "azurerm_storage_account" "site" {
  for_each                 = local.envs
  name                     = "${var.project}web${each.key}${var.name_suffix}"
  resource_group_name      = azurerm_resource_group.web.name
  location                 = azurerm_resource_group.web.location
  account_kind             = "StorageV2"
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
}

# เปิด static website: Azure สร้าง container ชื่อ $web ให้ แล้วเสิร์ฟผ่าน https://<ชื่อ>.z23.web.core.windows.net/
resource "azurerm_storage_account_static_website" "site" {
  for_each           = local.envs
  storage_account_id = azurerm_storage_account.site[each.key].id
  index_document     = "index.html"
  error_404_document = "404.html"
}

resource "azurerm_storage_blob" "index" {
  for_each               = local.envs
  name                   = "index.html"
  storage_account_name   = azurerm_storage_account.site[each.key].name
  storage_container_name = "$web"
  type                   = "Block"
  content_type           = "text/html"
  source_content         = "<!doctype html><title>${each.value.title}</title><h1>${each.value.title} — ${var.project}</h1>"

  depends_on = [azurerm_storage_account_static_website.site]
}

resource "azurerm_storage_blob" "not_found" {
  for_each               = local.envs
  name                   = "404.html"
  storage_account_name   = azurerm_storage_account.site[each.key].name
  storage_container_name = "$web"
  type                   = "Block"
  content_type           = "text/html"
  source_content         = "<!doctype html><title>404</title><h1>ไม่พบหน้านี้ (${each.value.title})</h1>"

  depends_on = [azurerm_storage_account_static_website.site]
}
