# DynamoDB: ฐานข้อมูล NoSQL ไม่มีเซิร์ฟเวอร์ จ่ายตามจำนวนคำขอ (PAY_PER_REQUEST)
resource "aws_dynamodb_table" "drugs" {
  for_each = local.envs

  name         = "${var.project}-drugs-${each.key}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = each.value.pitr
  }
}
