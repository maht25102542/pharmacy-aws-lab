data "aws_ecr_repository" "api" {
  name = "${var.project}/api"
}

resource "aws_ecs_cluster" "express" {
  name = "${var.project}-express"
}

resource "aws_cloudwatch_log_group" "api" {
  for_each = var.envs

  name              = "/ecs/${var.project}-express-${each.key}"
  retention_in_days = 7
}

resource "aws_ecs_express_gateway_service" "api" {
  for_each = var.envs

  service_name            = "${var.project}-api-${each.key}"
  cluster                 = aws_ecs_cluster.express.name
  execution_role_arn      = aws_iam_role.execution.arn
  infrastructure_role_arn = aws_iam_role.infrastructure.arn
  health_check_path       = "/healthz"
  cpu                     = each.value.cpu
  memory                  = each.value.memory

  primary_container {
    image          = "${data.aws_ecr_repository.api.repository_url}:${var.image_tag}"
    container_port = var.port

    aws_logs_configuration {
      log_group = aws_cloudwatch_log_group.api[each.key].name
    }

    environment {
      name  = "APP_ENV"
      value = each.key
    }
  }

  scaling_target {
    min_task_count            = each.value.min
    max_task_count            = each.value.max
    auto_scaling_metric       = "AVERAGE_CPU"
    auto_scaling_target_value = 60
  }

  # ลบ service ต้องใช้ infrastructure role: ถ้า policy หายก่อน service จะค้าง DRAINING
  depends_on = [
    aws_iam_role_policy_attachment.execution,
    aws_iam_role_policy_attachment.infrastructure,
  ]
}
