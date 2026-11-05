# รันจาก: เครื่องของคุณ (laptop)  |  หน้าที่: เว็บ static บน Azure (Storage static website) แยก dev / prd
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
