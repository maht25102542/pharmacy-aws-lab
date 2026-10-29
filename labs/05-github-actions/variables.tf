variable "project" {
  description = "ชื่อโปรเจกต์ ใช้เป็นคำนำหน้าชื่อของทุกอย่าง"
  default     = "pharmacy"
}

variable "region" {
  description = "AWS region (ap-southeast-1 = สิงคโปร์)"
  default     = "ap-southeast-1"
}

variable "github_repo" {
  description = "repo ที่อนุญาตให้ขอ role นี้ รูปแบบ owner/repo (ห้ามใช้ wildcard ทั้ง org)"
  default     = "YOUR_GITHUB_USER/pharmacy-backend"
}

variable "branch" {
  description = "branch ที่ deploy dev อัตโนมัติ (git flow: feature → develop → main · prd = tag v* บน main)"
  default     = "develop"
}

variable "prd_environment" {
  description = "ชื่อ GitHub Environment ของ prd (ตั้ง Required reviewers ที่ Settings › Environments)"
  default     = "production"
}

variable "ecr_repo" {
  description = "ชื่อ ECR repo จาก lab 02"
  default     = "pharmacy/api"
}
