# รันจาก: เครื่องของคุณ (laptop)  |  หน้าที่: รัน container จาก ECR ด้วย App Runner (PaaS) ไม่ต้องมี cluster / ALB
# ต้องมี labs/02-ecs-fargate อยู่ก่อน (ECR pharmacy/api + image tag ที่ push แล้ว)
terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.81"
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
