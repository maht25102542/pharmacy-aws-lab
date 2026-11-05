# ไฟร์วอลล์ แยกตามบทบาทของเครื่อง
# หลักคิดเดียวกับ terraform/: อนุญาต "จากกลุ่มที่ต้องคุยกัน" ไม่ใช้ IP
#   AWS security group -> Azure: Application Security Group (ASG, ป้ายกลุ่มที่ผูกกับ NIC) + Network Security Group (NSG, ชุดกฎผูกกับ subnet)
# Azure ต่างจาก AWS: NSG มีกฎเริ่มต้น "VirtualNetwork -> VirtualNetwork อนุญาตทั้งหมด" จึงต้องใส่กฎ deny (4000) ปิดก่อน แล้วค่อยเปิดเฉพาะที่ต้องใช้

resource "azurerm_application_security_group" "role" {
  for_each            = toset(["bastion", "jenkins", "sonarqube", "k8s", "dev", "db"])
  name                = "${var.project}-${each.key}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  tags                = local.tags
}

locals {
  asg = { for k, v in azurerm_application_security_group.role : k => [v.id] }
}

# ---------- public subnet: bastion, Jenkins, SonarQube ----------
resource "azurerm_network_security_group" "public" {
  name                = "${var.project}-public"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  tags                = local.tags

  security_rule {
    name                                       = "ssh-from-admin"
    priority                                   = 110
    direction                                  = "Inbound"
    access                                     = "Allow"
    protocol                                   = "Tcp"
    source_port_range                          = "*"
    destination_port_range                     = "22"
    source_address_prefix                      = var.my_ip
    destination_application_security_group_ids = local.asg["bastion"]
  }

  security_rule {
    name                                       = "jenkins-ui-and-webhook"
    priority                                   = 120
    direction                                  = "Inbound"
    access                                     = "Allow"
    protocol                                   = "Tcp"
    source_port_range                          = "*"
    destination_port_range                     = "8080"
    source_address_prefixes                    = concat([var.my_ip], var.github_hook_cidrs)
    destination_application_security_group_ids = local.asg["jenkins"]
  }

  security_rule {
    name                                       = "sonarqube-ui-from-admin"
    priority                                   = 130
    direction                                  = "Inbound"
    access                                     = "Allow"
    protocol                                   = "Tcp"
    source_port_range                          = "*"
    destination_port_range                     = "9000"
    source_address_prefix                      = var.my_ip
    destination_application_security_group_ids = local.asg["sonarqube"]
  }

  security_rule {
    name                                       = "sonarqube-from-jenkins"
    priority                                   = 140
    direction                                  = "Inbound"
    access                                     = "Allow"
    protocol                                   = "Tcp"
    source_port_range                          = "*"
    destination_port_range                     = "9000"
    source_application_security_group_ids      = local.asg["jenkins"]
    destination_application_security_group_ids = local.asg["sonarqube"]
  }

  security_rule {
    name                                  = "ssh-from-bastion"
    priority                              = 150
    direction                             = "Inbound"
    access                                = "Allow"
    protocol                              = "Tcp"
    source_port_range                     = "*"
    destination_port_range                = "22"
    source_application_security_group_ids = local.asg["bastion"]
    destination_address_prefix            = "*"
  }

  security_rule {
    name                       = "deny-vnet-inbound"
    priority                   = 4000
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "public" {
  subnet_id                 = azurerm_subnet.public.id
  network_security_group_id = azurerm_network_security_group.public.id
}

# ---------- private subnet: Kubernetes, dev, DB ----------
resource "azurerm_network_security_group" "private" {
  name                = "${var.project}-private"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  tags                = local.tags

  # health probe ของ load balancer มาจาก tag AzureLoadBalancer
  security_rule {
    name                       = "probe-from-lb"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_ranges    = ["30080", "30443", "3000"]
    source_address_prefix      = "AzureLoadBalancer"
    destination_address_prefix = "*"
  }

  security_rule {
    name                                  = "ssh-from-bastion"
    priority                              = 110
    direction                             = "Inbound"
    access                                = "Allow"
    protocol                              = "Tcp"
    source_port_range                     = "*"
    destination_port_range                = "22"
    source_application_security_group_ids = local.asg["bastion"]
    destination_address_prefix            = "*"
  }

  security_rule {
    name                                       = "ssh-from-jenkins-to-dev"
    priority                                   = 115
    direction                                  = "Inbound"
    access                                     = "Allow"
    protocol                                   = "Tcp"
    source_port_range                          = "*"
    destination_port_range                     = "22"
    source_application_security_group_ids      = local.asg["jenkins"]
    destination_application_security_group_ids = local.asg["dev"]
  }

  # Standard load balancer ไม่ SNAT ขาเข้า: client IP จริงมาถึง NSG จึงกรองตาม IP ได้
  security_rule {
    name                                       = "prd-frontend-nodeport"
    priority                                   = 120
    direction                                  = "Inbound"
    access                                     = "Allow"
    protocol                                   = "Tcp"
    source_port_range                          = "*"
    destination_port_range                     = "30080"
    source_address_prefix                      = "Internet"
    destination_application_security_group_ids = local.asg["k8s"]
  }

  security_rule {
    name                                       = "argocd-from-admin"
    priority                                   = 130
    direction                                  = "Inbound"
    access                                     = "Allow"
    protocol                                   = "Tcp"
    source_port_range                          = "*"
    destination_port_range                     = "30443"
    source_address_prefix                      = var.my_ip
    destination_application_security_group_ids = local.asg["k8s"]
  }

  security_rule {
    name                                       = "dev-frontend-from-admin"
    priority                                   = 140
    direction                                  = "Inbound"
    access                                     = "Allow"
    protocol                                   = "Tcp"
    source_port_range                          = "*"
    destination_port_range                     = "3000"
    source_address_prefix                      = var.my_ip
    destination_application_security_group_ids = local.asg["dev"]
  }

  security_rule {
    name                                       = "k8s-nodes-talk"
    priority                                   = 150
    direction                                  = "Inbound"
    access                                     = "Allow"
    protocol                                   = "*"
    source_port_range                          = "*"
    destination_port_range                     = "*"
    source_application_security_group_ids      = local.asg["k8s"]
    destination_application_security_group_ids = local.asg["k8s"]
  }

  security_rule {
    name                                       = "galera-nodes-talk"
    priority                                   = 160
    direction                                  = "Inbound"
    access                                     = "Allow"
    protocol                                   = "*"
    source_port_range                          = "*"
    destination_port_range                     = "*"
    source_application_security_group_ids      = local.asg["db"]
    destination_application_security_group_ids = local.asg["db"]
  }

  security_rule {
    name                                       = "mysql-from-k8s"
    priority                                   = 170
    direction                                  = "Inbound"
    access                                     = "Allow"
    protocol                                   = "Tcp"
    source_port_range                          = "*"
    destination_port_range                     = "3306"
    source_application_security_group_ids      = local.asg["k8s"]
    destination_application_security_group_ids = local.asg["db"]
  }

  security_rule {
    name                                       = "mysql-from-dev"
    priority                                   = 180
    direction                                  = "Inbound"
    access                                     = "Allow"
    protocol                                   = "Tcp"
    source_port_range                          = "*"
    destination_port_range                     = "3306"
    source_application_security_group_ids      = local.asg["dev"]
    destination_application_security_group_ids = local.asg["db"]
  }

  security_rule {
    name                       = "deny-vnet-inbound"
    priority                   = 4000
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "VirtualNetwork"
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "private" {
  subnet_id                 = azurerm_subnet.private.id
  network_security_group_id = azurerm_network_security_group.private.id
}
