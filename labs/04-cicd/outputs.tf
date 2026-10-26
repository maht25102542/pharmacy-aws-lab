output "pipeline_name" {
  value = aws_codepipeline.api.name
}

output "connection_status" {
  description = "ต้องเป็น AVAILABLE ก่อน pipeline ถึงจะดึงโค้ดได้ (PENDING = ไป authorize ใน console)"
  value       = aws_codestarconnections_connection.github.connection_status
}

output "authorize_hint" {
  value = "console → Developer Tools → Settings → Connections → ${var.project}-github → Update pending connection"
}
