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
  description = "port ที่แอปฟังจริง (ผิด = health check ไม่ผ่าน)"
  type        = string
  default     = "8000"
}

variable "envs" {
  description = "สร้าง service ต่อ env"
  type = map(object({
    cpu    = string
    memory = string
  }))
  default = {
    dev = { cpu = "256", memory = "512" }
    prd = { cpu = "1024", memory = "2048" }
  }
}
