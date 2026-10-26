output "api_urls" {
  value = { for k, v in local.envs : k => "http://${aws_lb.main.dns_name}${v.port == 80 ? "" : ":${v.port}"}/" }
}

output "ecr_repository_url" {
  description = "docker tag / push ไปที่นี่ (ต้อง aws ecr get-login-password ก่อน)"
  value       = aws_ecr_repository.api.repository_url
}

output "db_endpoints" {
  value = { for k, d in aws_db_instance.db : k => d.address }
}

output "push_commands" {
  value = "aws ecr get-login-password --region ${var.region} | docker login --username AWS --password-stdin ${split("/", aws_ecr_repository.api.repository_url)[0]} && docker build -t ${aws_ecr_repository.api.repository_url}:${var.image_tag} ./api && docker push ${aws_ecr_repository.api.repository_url}:${var.image_tag}"
}
