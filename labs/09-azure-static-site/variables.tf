variable "subscription_id" {
  description = "Azure subscription ID (az account show --query id -o tsv)"
  type        = string
}

variable "project" {
  description = "คำนำหน้าชื่อทุกอย่าง (ตัวพิมพ์เล็กและตัวเลขเท่านั้น เพราะเป็นส่วนหนึ่งของชื่อ storage account)"
  default     = "pharmacy"
}

variable "location" {
  description = "Azure region (southeastasia = สิงคโปร์)"
  default     = "southeastasia"
}

variable "name_suffix" {
  description = "ต่อท้ายชื่อ storage account ให้ไม่ซ้ำทั้งโลก (ชื่อซ้ำกับของคนอื่นจะสร้างไม่ได้) เช่น 01"
  default     = "01"
}
