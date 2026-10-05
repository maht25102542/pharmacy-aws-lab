data "aws_caller_identity" "current" {}

locals {
  ecr_registry = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.region}.amazonaws.com"
}

output "site_prd" {
  value = "http://${aws_lb.main.dns_name}"
}

output "site_dev" {
  value = "http://${aws_lb.main.dns_name}:8080"
}

output "jenkins_url" {
  value = "http://${aws_instance.jenkins.public_ip}:8080"
}

output "sonarqube_url" {
  value = "http://${aws_instance.sonarqube.public_ip}:9000"
}

output "argocd_url" {
  value = "https://${aws_instance.k8s[0].public_ip}:30443"
}

output "ecr_registry" {
  value = local.ecr_registry
}

output "vm_list" {
  description = "รายชื่อเครื่องทั้งหมดและ IP"
  value = merge(
    { (aws_instance.jenkins.tags.Name) = aws_instance.jenkins.public_ip },
    { (aws_instance.sonarqube.tags.Name) = aws_instance.sonarqube.public_ip },
    { (aws_instance.dev.tags.Name) = aws_instance.dev.public_ip },
    { for i in aws_instance.k8s : i.tags.Name => i.public_ip },
    { for i in aws_instance.db : i.tags.Name => i.public_ip },
  )
}

# ส่งค่าที่ Ansible ต้องใช้ไปเป็นไฟล์ตัวแปร (จุดเชื่อม Terraform -> Ansible)
resource "local_file" "ansible_vars" {
  filename        = "${path.module}/../ansible/group_vars/all/terraform.yml"
  file_permission = "0644"
  content         = <<-EOT
    # ไฟล์นี้ถูกสร้างโดย Terraform ห้ามแก้ด้วยมือ
    aws_region: "${var.region}"
    ecr_registry: "${local.ecr_registry}"
    alb_dns_name: "${aws_lb.main.dns_name}"
  EOT
}
