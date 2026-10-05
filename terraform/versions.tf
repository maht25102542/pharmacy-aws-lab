# รันจาก: เครื่องของคุณ (laptop)  |  หน้าที่: สร้าง VM และโครงสร้างทั้งหมดบน AWS
terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
    local = {
      source  = "hashicorp/local"
      version = ">= 2.4"
    }
  }
}

provider "aws" {
  region = var.region

  # ทุก resource จะถูกติดป้ายนี้อัตโนมัติ Ansible ใช้ป้าย Project ค้นหาเครื่อง
  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform"
    }
  }
}
