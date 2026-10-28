# Express Mode ใช้ role 2 ตัว (คนละหน้าที่):
#  1) execution role      = ให้ "task" ดึง image จาก ECR + เขียน log ลง CloudWatch (ใช้ตอน task สตาร์ท)
#  2) infrastructure role = ให้ "ECS" สร้าง/แก้/ลบ ALB, target group, security group, auto scaling แทนเรา (ใช้ตอน create/update/delete เท่านั้น)
data "aws_iam_policy_document" "execution_trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "execution" {
  name               = "${var.project}-express-execution"
  assume_role_policy = data.aws_iam_policy_document.execution_trust.json
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "infrastructure_trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "infrastructure" {
  name               = "${var.project}-express-infrastructure"
  assume_role_policy = data.aws_iam_policy_document.infrastructure_trust.json
}

resource "aws_iam_role_policy_attachment" "infrastructure" {
  role       = aws_iam_role.infrastructure.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSInfrastructureRoleforExpressGatewayServices"
}
