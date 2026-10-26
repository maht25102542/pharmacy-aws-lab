# API Gateway แบบ HTTP API (ถูกและเร็วกว่า REST API): API → integration (Lambda) → route → stage
resource "aws_apigatewayv2_api" "api" {
  for_each = local.envs

  name          = "${var.project}-api-${each.key}"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "lambda" {
  for_each = local.envs

  api_id                 = aws_apigatewayv2_api.api[each.key].id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api[each.key].invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_drugs" {
  for_each = local.envs

  api_id    = aws_apigatewayv2_api.api[each.key].id
  route_key = "GET /drugs"
  target    = "integrations/${aws_apigatewayv2_integration.lambda[each.key].id}"
}

resource "aws_apigatewayv2_route" "post_drugs" {
  for_each = local.envs

  api_id    = aws_apigatewayv2_api.api[each.key].id
  route_key = "POST /drugs"
  target    = "integrations/${aws_apigatewayv2_integration.lambda[each.key].id}"
}

resource "aws_apigatewayv2_stage" "env" {
  for_each = local.envs

  api_id      = aws_apigatewayv2_api.api[each.key].id
  name        = each.key
  auto_deploy = true
}
