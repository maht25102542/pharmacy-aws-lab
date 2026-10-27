output "role_arn" {
  description = "ใส่ที่ workflow: role-to-assume"
  value       = aws_iam_role.deploy.arn
}

output "allowed_subs" {
  description = "sub ที่ role ยอมรับ (job ที่ใส่ environment จะส่ง sub แบบ environment)"
  value       = local.allowed_subs
}
