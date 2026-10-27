variable "project" {
  description = "ชื่อโปรเจกต์ ใช้เป็นคำนำหน้าชื่อของทุกอย่าง"
  default     = "pharmacy"
}

variable "region" {
  description = "AWS region (ap-southeast-1 = สิงคโปร์)"
  default     = "ap-southeast-1"
}

variable "my_ip" {
  description = "IP ของคุณ ใช้เปิด SSH (port 22) เช่น 1.2.3.4/32"
  type        = string
}

variable "public_key_path" {
  description = "ไฟล์ public key ที่ใช้ SSH เข้าเครื่อง"
  default     = "~/.ssh/id_ed25519.pub"
}

variable "instance_type" {
  description = "ขนาดเครื่อง (เครื่องเดียวรันทั้ง app + db + proxy จึงอย่าเล็กเกิน)"
  default     = "t3.small"
}

variable "domain" {
  description = "ชื่อโดเมนของเว็บ เช่น app.pharmacy.example.com (ว่าง = ใช้ HTTP ผ่าน IP เท่านั้น ไม่มี HTTPS)"
  default     = ""
}

variable "zone_id" {
  description = "Route 53 hosted zone id ที่จะสร้าง A record ให้ domain (ว่าง = ไม่สร้าง record ต้องไปตั้ง DNS เอง)"
  default     = ""
}
