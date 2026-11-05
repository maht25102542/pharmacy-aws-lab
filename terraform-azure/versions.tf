# รันจาก: เครื่องของคุณ (laptop)  |  หน้าที่: สร้าง VM และโครงสร้างทั้งหมดบน Azure (คู่ขนานของ terraform/ บน AWS)
terraform {
  required_version = ">= 1.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
  }
}

# ต้อง az login ก่อน · azurerm 4.x บังคับระบุ subscription_id
provider "azurerm" {
  subscription_id = var.subscription_id

  features {
    resource_group {
      prevent_deletion_if_contains_resources = false # ให้ terraform destroy ลบได้ (สำหรับฝึกเท่านั้น)
    }
  }
}

data "azurerm_client_config" "current" {}

# ทุก resource ติดป้ายนี้ (Ansible/azure_rm ใช้ป้าย Project ค้นหาเครื่อง)
locals {
  tags = {
    Project   = var.project
    ManagedBy = "terraform"
  }
}
