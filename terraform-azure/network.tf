# เครือข่ายแบบเดียวกับ terraform/ แต่ตามแบบ Azure:
#   Azure subnet คร่อมได้ทุก Availability Zone จึงมี subnet เดียวต่อชั้น (AWS ต้องมี 3) ส่วนการกระจาย AZ ไปอยู่ที่ zone ของแต่ละ VM
#   public  (10.0.1.0/24) : bastion, Jenkins, SonarQube (มี public IP)
#   private (10.0.11.0/24): Kubernetes, dev, DB          (ไม่มี public IP, ออกเน็ตผ่าน NAT gateway)
# ข้อแลกเปลี่ยน: NAT gateway ตัวเดียวของ Azure เป็น zone-redundant อยู่แล้ว (ไม่ต้องทำ 3 ตัวแบบ AWS)

resource "azurerm_resource_group" "main" {
  name     = "${var.project}-rg"
  location = var.location
  tags     = local.tags
}

resource "azurerm_virtual_network" "main" {
  name                = "${var.project}-vnet"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  address_space       = ["10.0.0.0/16"]
  tags                = local.tags
}

resource "azurerm_subnet" "public" {
  name                 = "${var.project}-public"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}

resource "azurerm_subnet" "private" {
  name                 = "${var.project}-private"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.11.0/24"]
}

# NAT gateway: ให้เครื่องใน private subnet ออกอินเทอร์เน็ตได้ (apt, docker, ACR) แต่ขาเข้าจากเน็ตเข้าไม่ได้
resource "azurerm_public_ip" "nat" {
  name                = "${var.project}-nat-ip"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  allocation_method   = "Static"
  sku                 = "Standard"
  tags                = local.tags
}

resource "azurerm_nat_gateway" "main" {
  name                = "${var.project}-nat"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku_name            = "Standard"
  tags                = local.tags
}

resource "azurerm_nat_gateway_public_ip_association" "main" {
  nat_gateway_id       = azurerm_nat_gateway.main.id
  public_ip_address_id = azurerm_public_ip.nat.id
}

resource "azurerm_subnet_nat_gateway_association" "private" {
  subnet_id      = azurerm_subnet.private.id
  nat_gateway_id = azurerm_nat_gateway.main.id
}
