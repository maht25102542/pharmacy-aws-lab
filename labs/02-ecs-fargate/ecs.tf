# ECS Fargate: cluster → task definition (แม่แบบของคอนเทนเนอร์) → service (รักษาจำนวน task + ผูก ALB)
resource "aws_cloudwatch_log_group" "api" {
  for_each = local.envs

  name              = "/ecs/${var.project}-api-${each.key}"
  retention_in_days = 14
}

resource "aws_ecs_cluster" "main" {
  for_each = local.envs

  name = "${var.project}-${each.key}"
}

resource "aws_ecs_task_definition" "api" {
  for_each = local.envs

  family                   = "${var.project}-api-${each.key}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = each.value.cpu
  memory                   = each.value.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name         = "api"
      image        = "${aws_ecr_repository.api.repository_url}:${var.image_tag}"
      essential    = true
      portMappings = [{ containerPort = local.container_port }]
      environment = [
        { name = "APP_ENV", value = each.key },
        { name = "DB_HOST", value = aws_db_instance.db[each.key].address },
      ]
      secrets = [
        { name = "DB_PASSWORD", valueFrom = "${aws_db_instance.db[each.key].master_user_secret[0].secret_arn}:password::" },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.api[each.key].name
          awslogs-region        = var.region
          awslogs-stream-prefix = "api"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "api" {
  for_each = local.envs

  name            = "${var.project}-api"
  cluster         = aws_ecs_cluster.main[each.key].id
  task_definition = aws_ecs_task_definition.api[each.key].arn
  desired_count   = each.value.tasks
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.task.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api[each.key].arn
    container_name   = "api"
    container_port   = local.container_port
  }

  # listener ต้องพร้อมก่อน ไม่งั้น service ผูก target group ที่ยังไม่มี listener ไม่ได้
  # NAT ต้องพร้อมก่อน เพราะ task ต้องออกเน็ตไปดึง image
  depends_on = [aws_lb_listener.api, aws_nat_gateway.main, aws_route_table_association.private, aws_route_table_association.public, aws_iam_role_policy_attachment.execution]
}
