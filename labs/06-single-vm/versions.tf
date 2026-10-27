# รันจาก: เครื่องของคุณ (laptop)  |  หน้าที่: เว็บ/API บนเครื่อง EC2 เครื่องเดียว + Docker Compose + Caddy (HTTPS อัตโนมัติ) · แบบที่ทีมเล็ก/ฟรีแลนซ์นิยม
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
