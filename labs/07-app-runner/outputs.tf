output "service_urls" {
  value = { for k, s in aws_apprunner_service.api : k => "https://${s.service_url}" }
}
