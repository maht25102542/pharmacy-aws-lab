locals {
  lb_fqdn = azurerm_public_ip.lb.fqdn
}

output "site_prd" {
  value = "http://${local.lb_fqdn}"
}

output "site_dev" {
  value = "http://${local.lb_fqdn}:8080"
}

output "jenkins_url" {
  value = "http://${azurerm_public_ip.vm["jenkins"].ip_address}:8080"
}

output "sonarqube_url" {
  value = "http://${azurerm_public_ip.vm["sonarqube"].ip_address}:9000"
}

output "argocd_url" {
  value = "http://${local.lb_fqdn}:8443"
}

output "bastion_ip" {
  description = "ประตูเข้าเครื่องภายใน: ssh -J ubuntu@<ค่านี้> ubuntu@<private IP>"
  value       = azurerm_public_ip.vm["bastion"].ip_address
}

output "acr_login_server" {
  description = "ใช้แทน ecr_registry ใน Jenkins (.env) และ az acr login --name <ชื่อ registry>"
  value       = azurerm_container_registry.main.login_server
}

output "vm_list" {
  description = "รายชื่อเครื่องทั้งหมดและ IP (public = เข้าจากเน็ตได้, private = เข้าผ่าน bastion)"
  value = {
    for k, v in local.vms : azurerm_linux_virtual_machine.vm[k].name =>
    v.tier == "public" ? azurerm_public_ip.vm[k].ip_address : azurerm_network_interface.vm[k].private_ip_address
  }
}
