variable "project" {
  description = "ชื่อโปรเจกต์ ใช้เป็นคำนำหน้าชื่อของทุกอย่าง"
  default     = "pharmacy"
}

variable "region" {
  description = "region ของ S3 และ Route 53 (CloudFront เป็น global, ใบรับรองอยู่ us-east-1)"
  default     = "ap-southeast-1"
}

variable "domain_name" {
  description = "โดเมนที่คุณเป็นเจ้าของ (ต้องชี้ NS ไปที่ hosted zone ที่ Terraform สร้างจึงจะเปิดจากอินเทอร์เน็ตจริงได้) · example.com ใช้ในตัวจำลองเท่านั้น"
  default     = "pharmacy.example.com"
}
