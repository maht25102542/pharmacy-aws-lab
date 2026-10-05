variable "project" {
  description = "ชื่อโปรเจกต์ ใช้เป็นคำนำหน้าชื่อของทุกอย่าง"
  default     = "pharmacy"
}

variable "region" {
  description = "AWS region (ap-southeast-1 = สิงคโปร์)"
  default     = "ap-southeast-1"
}

variable "my_ip" {
  description = "IP ของคุณ สำหรับ SSH และเปิดหน้า Jenkins/SonarQube/ArgoCD เช่น 1.2.3.4/32"
  type        = string
}

variable "public_key_path" {
  description = "ที่อยู่ไฟล์กุญแจ SSH ดอก .pub ในเครื่องคุณ"
  default     = "~/.ssh/id_ed25519.pub"
}

variable "k8s_node_count" {
  description = "จำนวนเครื่อง Kubernetes (เครื่องแรกเป็น server ที่เหลือเป็น agent)"
  default     = 3
}

variable "db_count" {
  description = "จำนวนเครื่องฐานข้อมูล Galera (ควรเป็นเลขคี่: 1 หรือ 3)"
  default     = 3
}

variable "instance_types" {
  description = "ขนาดเครื่องของแต่ละบทบาท"
  type        = map(string)
  default = {
    jenkins   = "t3.medium"
    sonarqube = "t3.medium"
    k8s       = "t3.medium"
    dev       = "t3.medium"
    db        = "t3.small"
  }
}
