# CodePipeline: Source (GitHub) → Build (CodeBuild) → Deploy dev (ECS) → Approve (คน) → Deploy prd (ECS)
resource "aws_codepipeline" "api" {
  name     = "${var.project}-api"
  role_arn = aws_iam_role.pipeline.arn

  # policy ต้องแนบ role ก่อน ไม่งั้น execution แรก (ที่รันทันทีหลังสร้าง) ล้มด้วยสิทธิ์ไม่พอ
  depends_on = [aws_iam_role_policy.pipeline, aws_iam_role_policy.codebuild]

  artifact_store {
    location = aws_s3_bucket.artifacts.bucket
    type     = "S3"
  }

  stage {
    name = "Source"

    action {
      name             = "GitHub"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source"]

      configuration = {
        ConnectionArn    = aws_codestarconnections_connection.github.arn
        FullRepositoryId = var.github_repo
        BranchName       = var.branch
      }
    }
  }

  stage {
    name = "Build"

    action {
      name             = "DockerBuild"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source"]
      output_artifacts = ["image"]

      configuration = {
        ProjectName = aws_codebuild_project.build.name
      }
    }
  }

  stage {
    name = "DeployDev"

    action {
      name            = "EcsDev"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "ECS"
      version         = "1"
      input_artifacts = ["image"]

      configuration = {
        ClusterName = local.deploy["dev"].cluster
        ServiceName = local.service
        FileName    = "imagedefinitions.json"
      }
    }
  }

  stage {
    name = "Approve"

    action {
      name     = "PromoteToProd"
      category = "Approval"
      owner    = "AWS"
      provider = "Manual"
      version  = "1"

      configuration = {
        CustomData = "ตรวจ dev แล้วกดอนุมัติเพื่อ deploy prd"
      }
    }
  }

  stage {
    name = "DeployPrd"

    action {
      name            = "EcsPrd"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "ECS"
      version         = "1"
      input_artifacts = ["image"]

      configuration = {
        ClusterName = local.deploy["prd"].cluster
        ServiceName = local.service
        FileName    = "imagedefinitions.json"
      }
    }
  }
}
