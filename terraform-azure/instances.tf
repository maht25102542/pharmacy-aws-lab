# VM ทั้งหมดของระบบ (หน้าที่เดียวกับ terraform/instances.tf)
#   ป้าย Role = หน้าที่ (Ansible ใช้แยกกลุ่ม) · ป้าย Tier = public | private (ใช้ตัดสินว่าต้องเข้าผ่าน bastion ไหม)
#   public : bastion, Jenkins, SonarQube   (มี public IP)
#   private: Kubernetes ×N, dev, DB ×N      (ไม่มี public IP, กระจาย zone 1-3)
# รวมนิยามไว้ที่ local.vms แล้วสร้าง NIC/VM ด้วย for_each ชุดเดียว (AWS แยกเป็น resource ต่อบทบาท)
#   acr = สิทธิ์ที่ managed identity ของ VM ได้บน ACR (ว่าง = ไม่ให้สิทธิ์) · แทน IAM instance profile ของ AWS
# ดิสก์ 30 GB ขั้นต่ำเพราะ image Ubuntu ของ Azure ใหญ่ 30 GB (AWS bastion ใช้ 8 GB ได้)

locals {
  vms = merge(
    {
      bastion   = { role = "bastion", tier = "public", size = var.vm_sizes["bastion"], zone = "1", disk = 30, acr = "" }
      jenkins   = { role = "jenkins", tier = "public", size = var.vm_sizes["jenkins"], zone = "1", disk = 30, acr = "AcrPush" }
      sonarqube = { role = "sonarqube", tier = "public", size = var.vm_sizes["sonarqube"], zone = "1", disk = 30, acr = "" }
      dev       = { role = "dev", tier = "private", size = var.vm_sizes["dev"], zone = "1", disk = 30, acr = "AcrPull" }
    },
    { for i in range(var.k8s_node_count) : "k8s-${i + 1}" => { role = "k8s", tier = "private", size = var.vm_sizes["k8s"], zone = tostring(i % 3 + 1), disk = 30, acr = "AcrPull" } },
    { for i in range(var.db_count) : "db-${i + 1}" => { role = "db", tier = "private", size = var.vm_sizes["db"], zone = tostring(i % 3 + 1), disk = 30, acr = "" } },
  )

  # ชื่อ ASG ของแต่ละเครื่อง = role (k8s_server ของ AWS คือ k8s ที่นี่)
  public_vms = { for k, v in local.vms : k => v if v.tier == "public" }
}

resource "azurerm_public_ip" "vm" {
  for_each            = local.public_vms
  name                = "${var.project}-${each.key}-ip"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  allocation_method   = "Static"
  sku                 = "Standard"
  tags                = local.tags
}

resource "azurerm_network_interface" "vm" {
  for_each            = local.vms
  name                = "${var.project}-${each.key}-nic"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  tags                = local.tags

  ip_configuration {
    name                          = "primary"
    subnet_id                     = each.value.tier == "public" ? azurerm_subnet.public.id : azurerm_subnet.private.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = each.value.tier == "public" ? azurerm_public_ip.vm[each.key].id : null
  }
}

resource "azurerm_network_interface_application_security_group_association" "vm" {
  for_each                      = local.vms
  network_interface_id          = azurerm_network_interface.vm[each.key].id
  application_security_group_id = azurerm_application_security_group.role[each.value.role].id
}

resource "azurerm_linux_virtual_machine" "vm" {
  for_each              = local.vms
  name                  = "${var.project}-${each.key}"
  resource_group_name   = azurerm_resource_group.main.name
  location              = azurerm_resource_group.main.location
  size                  = each.value.size
  zone                  = each.value.zone
  admin_username        = "ubuntu"
  network_interface_ids = [azurerm_network_interface.vm[each.key].id]

  # ต่างจาก AWS: key pair ฝังในตัว VM เลย ไม่ต้องมี resource แยก
  admin_ssh_key {
    username   = "ubuntu"
    public_key = file(pathexpand(var.public_key_path))
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "StandardSSD_LRS"
    disk_size_gb         = each.value.disk
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = "server"
    version   = "latest"
  }

  # ทุกเครื่องมี managed identity (ใช้จริงเฉพาะที่มี role บน ACR ใน acr.tf)
  identity {
    type = "SystemAssigned"
  }

  tags = merge(local.tags, {
    Name = "${var.project}-${each.key}"
    Role = each.value.role == "k8s" ? "k8s_server" : each.value.role
    Tier = each.value.tier
  })
}
