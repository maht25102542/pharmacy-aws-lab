# รันจาก: เครื่องของคุณ (laptop)  |  หน้าที่: API แบบ serverless (API Gateway + Lambda + DynamoDB) แยก dev / prd
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
