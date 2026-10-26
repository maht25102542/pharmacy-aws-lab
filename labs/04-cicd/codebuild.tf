# CodeBuild: รัน docker build + push ขึ้น ECR แล้วเขียน imagedefinitions.json ให้ขั้น deploy
resource "aws_codebuild_project" "build" {
  name         = "${var.project}-api-build"
  service_role = aws_iam_role.codebuild.arn

  source {
    type      = "CODEPIPELINE"
    buildspec = <<-EOT
      version: 0.2
      phases:
        pre_build:
          commands:
            - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $ECR_REPO_URL
            - IMAGE_TAG=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c1-8)
        build:
          commands:
            - docker build -t $ECR_REPO_URL:$IMAGE_TAG .
        post_build:
          commands:
            - docker push $ECR_REPO_URL:$IMAGE_TAG
            - printf '[{"name":"%s","imageUri":"%s"}]' $CONTAINER_NAME $ECR_REPO_URL:$IMAGE_TAG > imagedefinitions.json
      artifacts:
        files:
          - imagedefinitions.json
    EOT
  }

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type    = "BUILD_GENERAL1_SMALL"
    image           = "aws/codebuild/standard:7.0"
    type            = "LINUX_CONTAINER"
    privileged_mode = true # ต้องเปิด ไม่งั้น docker build ใช้ไม่ได้ (Cannot connect to the Docker daemon)

    environment_variable {
      name  = "ECR_REPO_URL"
      value = local.ecr_repo_url
    }

    environment_variable {
      name  = "CONTAINER_NAME"
      value = var.container_name
    }
  }
}
