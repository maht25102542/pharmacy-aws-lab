# รันจาก: เครื่องของคุณ (laptop)  |  หน้าที่: CI/CD pipeline (CodePipeline + CodeBuild) ส่งโค้ด → ECR → ECS dev → อนุมัติ → ECS prd
# ต้องมี labs/02-ecs-fargate อยู่ก่อน (cluster pharmacy-dev / pharmacy-prd + service pharmacy-api + ECR repo pharmacy/api)
terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform"
    }
  }
}
