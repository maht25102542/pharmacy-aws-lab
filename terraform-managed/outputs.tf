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

output "argocd_url" {
  value = "http://${aws_lb.main.dns_name}:8443"
}

output "kubeconfig_command" {
  description = "สร้างไฟล์ kubeconfig ให้ kubectl"
  value       = "aws eks update-kubeconfig --region ${var.region} --name ${aws_eks_cluster.main.name}"
}

output "db_endpoint" {
  description = "ใส่เป็น DB_HOST ของ backend (รหัสผ่านอยู่ใน Secrets Manager)"
  value       = aws_db_instance.main.address
}

output "db_secret_arn" {
  value = aws_db_instance.main.master_user_secret[0].secret_arn
}

output "jenkins_ssm" {
  description = "เปิดหน้า Jenkins ที่ http://localhost:8080 โดยไม่เปิด port ใดๆ"
  value       = "aws ssm start-session --target ${aws_instance.jenkins.id} --document-name AWS-StartPortForwardingSession --parameters portNumber=8080,localPortNumber=8080"
}

output "sonarqube_ssm" {
  value = "aws ssm start-session --target ${aws_instance.sonarqube.id} --document-name AWS-StartPortForwardingSession --parameters portNumber=9000,localPortNumber=9000"
}

output "ecr_registry" {
  value = local.ecr_registry
}
