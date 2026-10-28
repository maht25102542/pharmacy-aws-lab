output "service_endpoints" {
  value = { for k, s in aws_ecs_express_gateway_service.api : k => [for p in s.ingress_paths : p.endpoint] }
}
