# 2 role ที่ ECS ใช้ (คนละหน้าที่ มักสับสน):
#   execution role = ให้ "ECS/Fargate" ดึง image จาก ECR + เขียน log + อ่าน secret ตอน "เริ่ม" task
#   task role      = ให้ "โค้ดในคอนเทนเนอร์" เรียก AWS (ตัวอย่างนี้ไม่ต้องใช้อะไร จึงไม่แนบ policy)
data "aws_iam_policy_document" "ecs_tasks_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "execution" {
  name               = "${var.project}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}

resource "aws_iam_role_policy_attachment" "execution" {
  for_each = toset([
    "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy", # ดึง image ECR + เขียน CloudWatch Logs
    "arn:aws:iam::aws:policy/SecretsManagerReadWrite",                       # อ่านรหัสผ่าน DB จาก Secrets Manager (ของจริงควรเขียน policy เฉพาะ secret)
  ])
  role       = aws_iam_role.execution.name
  policy_arn = each.value
}

resource "aws_iam_role" "task" {
  name               = "${var.project}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}
