# รันจาก: เครื่องของคุณ (laptop)  |  หน้าที่: เว็บ static (HTML/JS) บน S3 + CloudFront + Route 53 + ACM แยก dev / prd
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

# CloudFront ใช้ใบรับรองจาก ACM ที่อยู่ region us-east-1 เท่านั้น (ไม่ว่าบัคเก็ตจะอยู่ที่ไหน)
provider "aws" {
  alias  = "use1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform"
    }
  }
}
