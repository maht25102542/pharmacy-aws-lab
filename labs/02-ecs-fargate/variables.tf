variable "project" {
  description = "ชื่อโปรเจกต์ ใช้เป็นคำนำหน้าชื่อของทุกอย่าง"
  default     = "pharmacy"
}

variable "region" {
  description = "AWS region (ap-southeast-1 = สิงคโปร์)"
  default     = "ap-southeast-1"
}

variable "my_ip" {
  description = "IP ของคุณ ใช้เปิดพอร์ต 8080 (dev) บน ALB เช่น 1.2.3.4/32"
  type        = string
}

variable "image_tag" {
  description = "tag ของ image ใน ECR ที่จะรัน (ต้อง docker push ขึ้น ECR ก่อน ไม่งั้น task ดึง image ไม่ได้)"
  default     = "v1.0.0"
}
