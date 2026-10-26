output "api_urls" {
  description = "เปิด GET /drugs ที่ Browser หรือ curl"
  value       = { for k, s in aws_apigatewayv2_stage.env : k => "${s.invoke_url}/drugs" }
}

output "tables" {
  value = { for k, t in aws_dynamodb_table.drugs : k => t.name }
}

output "zip_command" {
  value = "mkdir -p build && cd src && zip ../build/app.zip app.py"
}
