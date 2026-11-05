# ที่เก็บ image (เทียบกับ ECR) + สิทธิ์ของ VM
# ACR ไม่ต้องสร้าง repository ล่วงหน้า: docker push <registry>/pharmacy/frontend:tag แล้ว repo เกิดเอง
# ชื่อ registry ต้องเป็นตัวอักษร/ตัวเลขล้วนและไม่ซ้ำทั้งโลก จึงต่อท้ายด้วยค่า hash ของ subscription
resource "azurerm_container_registry" "main" {
  name                = "${var.project}${substr(md5(data.azurerm_client_config.current.subscription_id), 0, 8)}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Basic"
  admin_enabled       = false
  tags                = local.tags
}

# Jenkins push ได้ (AcrPush) · k8s กับ dev pull ได้ (AcrPull) แทน IAM role + ecr-refresh ทุก 12 ชม. ของ AWS
# token ของ managed identity ขอผ่าน az login --identity แล้ว az acr login ที่ VM
locals {
  acr_vms = { for k, v in local.vms : k => v.acr if v.acr != "" }
}

resource "azurerm_role_assignment" "acr" {
  for_each             = local.acr_vms
  scope                = azurerm_container_registry.main.id
  role_definition_name = each.value
  principal_id         = azurerm_linux_virtual_machine.vm[each.key].identity[0].principal_id
}
