# รันจาก: เครื่องของคุณ (laptop)  |  หน้าที่: รัน container จาก ECR ด้วย ECS Express Mode (ได้ ALB + auto scaling + URL ให้เอง)
# ต้องมี labs/02-ecs-fargate อยู่ก่อน (ECR pharmacy/api + image tag ที่ push แล้ว)
terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.23" # aws_ecs_express_gateway_service เริ่มมีใน provider 6.23.0 (26 พ.ย. 2025)
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
