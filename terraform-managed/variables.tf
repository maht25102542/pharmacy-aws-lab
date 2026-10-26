variable "project" {
  description = "ชื่อโปรเจกต์ ใช้เป็นคำนำหน้าชื่อของทุกอย่าง"
  default     = "pharmacy"
}

variable "region" {
  description = "AWS region (ap-southeast-1 = สิงคโปร์)"
  default     = "ap-southeast-1"
}

variable "my_ip" {
  description = "IP ของคุณ สำหรับเรียก EKS API (kubectl) และเปิด ArgoCD/dev ผ่าน ALB เช่น 1.2.3.4/32"
  type        = string
}

variable "eks_version" {
  description = "เวอร์ชัน Kubernetes ของ EKS (ดูเวอร์ชันที่รองรับปัจจุบันก่อน apply)"
  default     = "1.31"
}

variable "node_count" {
  description = "จำนวน worker node (กระจายคนละ AZ) 3 = ทน 1 AZ ล่ม"
  default     = 3
}

variable "node_instance_type" {
  default = "t3.medium"
}

variable "db_instance_class" {
  description = "ขนาด RDS (Multi-AZ: มี standby อีก 1 ตัวคนละ AZ ให้เอง)"
  default     = "db.t4g.small"
}

variable "ci_instance_type" {
  description = "ขนาดเครื่อง Jenkins และ SonarQube"
  default     = "t3.medium"
}
