# Load balancer หน้าระบบ (เทียบกับ ALB): Standard Load Balancer ชั้น 4 + public IP
#   port 80   -> prd (NodePort 30080 บน k8s)
#   port 8080 -> dev (frontend :3000 บน VM pharmacy-dev)
#   port 8443 -> ArgoCD (NodePort 30443 เป็น HTTPS) เปิดเฉพาะ IP ของคุณ (กรองที่ NSG)
# ต่างจาก ALB: เป็น L4 ไม่ใช่ L7 · มองไม่เห็น path /healthz ใน TCP แต่ probe แบบ Http/Https ยังเช็ก path ได้
# ต่างจาก ALB: ไม่ใช้ security group ของตัวเอง กรองที่ NSG ของ subnet ปลายทางแทน (ดู security.tf)

resource "azurerm_public_ip" "lb" {
  name                = "${var.project}-lb-ip"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  allocation_method   = "Static"
  sku                 = "Standard"
  domain_name_label   = "${var.project}-${substr(md5(data.azurerm_client_config.current.subscription_id), 0, 6)}"
  tags                = local.tags
}

resource "azurerm_lb" "main" {
  name                = "${var.project}-lb"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Standard"
  tags                = local.tags

  frontend_ip_configuration {
    name                 = "public"
    public_ip_address_id = azurerm_public_ip.lb.id
  }
}

resource "azurerm_lb_backend_address_pool" "k8s" {
  name            = "k8s"
  loadbalancer_id = azurerm_lb.main.id
}

resource "azurerm_lb_backend_address_pool" "dev" {
  name            = "dev"
  loadbalancer_id = azurerm_lb.main.id
}

locals {
  lb_pools = {
    k8s = { for k, v in local.vms : k => azurerm_lb_backend_address_pool.k8s.id if v.role == "k8s" }
    dev = { for k, v in local.vms : k => azurerm_lb_backend_address_pool.dev.id if v.role == "dev" }
  }
  lb_members = merge(local.lb_pools.k8s, local.lb_pools.dev)

  # ชื่อ -> พอร์ตหน้า, พอร์ตหลังบ้าน, pool, probe (ตรงกับ listener + target group ของ ALB)
  lb_rules = {
    prd    = { front = 80, back = 30080, pool = "k8s", probe = "Http" }
    dev    = { front = 8080, back = 3000, pool = "dev", probe = "Http" }
    argocd = { front = 8443, back = 30443, pool = "k8s", probe = "Https" }
  }
}

resource "azurerm_network_interface_backend_address_pool_association" "vm" {
  for_each                = local.lb_members
  network_interface_id    = azurerm_network_interface.vm[each.key].id
  ip_configuration_name   = "primary"
  backend_address_pool_id = each.value
}

resource "azurerm_lb_probe" "main" {
  for_each            = local.lb_rules
  name                = each.key
  loadbalancer_id     = azurerm_lb.main.id
  protocol            = each.value.probe
  port                = each.value.back
  request_path        = "/healthz"
  interval_in_seconds = 10
}

resource "azurerm_lb_rule" "main" {
  for_each                       = local.lb_rules
  name                           = each.key
  loadbalancer_id                = azurerm_lb.main.id
  protocol                       = "Tcp"
  frontend_port                  = each.value.front
  backend_port                   = each.value.back
  frontend_ip_configuration_name = "public"
  backend_address_pool_ids       = [each.value.pool == "k8s" ? azurerm_lb_backend_address_pool.k8s.id : azurerm_lb_backend_address_pool.dev.id]
  probe_id                       = azurerm_lb_probe.main[each.key].id
  disable_outbound_snat          = true # ขาออกของ private ใช้ NAT gateway
}
