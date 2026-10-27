# รันจาก: เครื่องของคุณ (laptop)  |  หน้าที่: ให้ GitHub Actions ขอสิทธิ์ AWS แบบ OIDC (ไม่มี access key ถาวร) แล้ว deploy ลง ECS
# ต้องมี labs/02-ecs-fargate อยู่ก่อน (ECR pharmacy/api, cluster/service ของ dev และ prd)
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
