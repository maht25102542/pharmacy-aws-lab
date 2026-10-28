variable "region" {
  type    = string
  default = "ap-southeast-1"
}

variable "project" {
  type    = string
  default = "pharmacy"
}

variable "image_tag" {
  description = "tag ใน ECR pharmacy/api ที่ push ไว้แล้ว (lab 02)"
  type        = string
  default     = "v1.0.0"
}

variable "port" {
  description = "port ที่แอปฟังจริง (ผิด = target ไม่ healthy → 503 จาก ALB)"
  type        = number
  default     = 8000
}

variable "envs" {
  description = "สร้าง Express service ต่อ env (อยู่ cluster เดียวกัน → แชร์ ALB ตัวเดียว)"
  type = map(object({
    cpu    = string
    memory = string
    min    = number
    max    = number
  }))
  default = {
    dev = { cpu = "256", memory = "512", min = 1, max = 2 }
    prd = { cpu = "512", memory = "1024", min = 2, max = 6 }
  }
}
