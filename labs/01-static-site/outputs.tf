output "site_urls" {
  value = { for k, v in local.envs : k => "https://${v.host}" }
}

output "cloudfront_domains" {
  description = "ลองเปิดตรงๆ ได้เลยโดยไม่ต้องรอ DNS"
  value       = { for k, d in aws_cloudfront_distribution.site : k => "https://${d.domain_name}" }
}

output "name_servers" {
  description = "ไปตั้งที่ผู้ขายโดเมน"
  value       = aws_route53_zone.main.name_servers
}

output "buckets" {
  value = { for k, b in aws_s3_bucket.site : k => b.id }
}

output "deploy_commands" {
  description = "ปล่อยเวอร์ชันใหม่ของ prd แล้วล้างแคช"
  value       = "aws s3 sync ./dist s3://${aws_s3_bucket.site["prd"].id} --delete && aws cloudfront create-invalidation --distribution-id ${aws_cloudfront_distribution.site["prd"].id} --paths '/*'"
}
