# Lambda: โค้ดอยู่ใน src/app.py · zip ก่อน apply:  cd src && zip ../build/app.zip app.py
resource "aws_cloudwatch_log_group" "api" {
  for_each = local.envs

  name              = "/aws/lambda/${var.project}-api-${each.key}"
  retention_in_days = each.value.log_days
}

resource "aws_lambda_function" "api" {
  for_each = local.envs

  function_name = "${var.project}-api-${each.key}"
  role          = aws_iam_role.lambda[each.key].arn
  runtime       = "python3.12"
  handler       = "app.handler"
  filename      = "${path.module}/build/app.zip"
  memory_size   = each.value.memory
  timeout       = 10

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.drugs[each.key].name
      APP_ENV    = each.key
    }
  }

  # log group + สิทธิ์เขียน log ต้องพร้อมก่อน ไม่งั้น Lambda สร้าง log group เอง (ไม่มี retention)
  depends_on = [aws_cloudwatch_log_group.api, aws_iam_role_policy_attachment.logs, aws_iam_role_policy.ddb]
}

# อนุญาตให้ API Gateway เรียก Lambda (console ใส่ให้เองตอน Add trigger · Terraform ต้องเขียนเอง)
resource "aws_lambda_permission" "apigw" {
  for_each = local.envs

  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api[each.key].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api[each.key].execution_arn}/*/*"
}
