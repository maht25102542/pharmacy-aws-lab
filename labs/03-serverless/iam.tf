# role ของ Lambda แยกตาม env: เขียน log ได้ + แตะได้เฉพาะ table ของ env ตัวเอง (least privilege)
data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  for_each = local.envs

  name               = "${var.project}-api-${each.key}-lambda"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

resource "aws_iam_role_policy_attachment" "logs" {
  for_each = local.envs

  role       = aws_iam_role.lambda[each.key].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "ddb" {
  for_each = local.envs

  statement {
    actions   = ["dynamodb:Scan", "dynamodb:GetItem", "dynamodb:PutItem"]
    resources = [aws_dynamodb_table.drugs[each.key].arn]
  }
}

resource "aws_iam_role_policy" "ddb" {
  for_each = local.envs

  name   = "ddb-access"
  role   = aws_iam_role.lambda[each.key].name
  policy = data.aws_iam_policy_document.ddb[each.key].json
}
