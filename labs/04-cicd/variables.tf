variable "project" {
  description = "ชื่อโปรเจกต์ ใช้เป็นคำนำหน้าชื่อของทุกอย่าง"
  default     = "pharmacy"
}

variable "region" {
  description = "AWS region (ap-southeast-1 = สิงคโปร์)"
  default     = "ap-southeast-1"
}

variable "github_repo" {
  description = "repo ที่จะ build รูปแบบ owner/repo"
  default     = "YOUR_GITHUB_USER/pharmacy-backend"
}

variable "branch" {
  description = "branch ที่ pipeline เฝ้าดู"
  default     = "main"
}

variable "ecr_repo" {
  description = "ชื่อ ECR repo ที่ lab 02 สร้างไว้"
  default     = "pharmacy/api"
}

variable "container_name" {
  description = "ชื่อ container ใน task definition ของ lab 02 (ต้องตรงกับ imagedefinitions.json)"
  default     = "api"
}
