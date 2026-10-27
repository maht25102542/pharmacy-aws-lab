data "aws_ecr_repository" "api" {
  name = "${var.project}/api"
}

resource "aws_apprunner_service" "api" {
  for_each = var.envs

  service_name = "${var.project}-api-${each.key}"

  source_configuration {
    auto_deployments_enabled = false

    authentication_configuration {
      access_role_arn = aws_iam_role.access.arn
    }

    image_repository {
      image_identifier      = "${data.aws_ecr_repository.api.repository_url}:${var.image_tag}"
      image_repository_type = "ECR"

      image_configuration {
        port = var.port
        runtime_environment_variables = {
          APP_ENV = each.key
        }
      }
    }
  }

  instance_configuration {
    cpu    = each.value.cpu
    memory = each.value.memory
  }

  health_check_configuration {
    protocol = "HTTP"
    path     = "/healthz"
  }

  depends_on = [aws_iam_role_policy_attachment.access]
}
