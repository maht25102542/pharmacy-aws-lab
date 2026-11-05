variable "project" {
  description = "ชื่อโปรเจกต์ ใช้เป็นคำนำหน้าชื่อของทุกอย่าง"
  default     = "pharmacy"
}

variable "subscription_id" {
  description = "Azure subscription ID (az account show --query id -o tsv)"
  type        = string
}

variable "location" {
  description = "Azure region (southeastasia = สิงคโปร์ มี Availability Zone 1-3)"
  default     = "southeastasia"
}

variable "my_ip" {
  description = "IP ของคุณ สำหรับ SSH เข้า bastion และเปิดหน้า Jenkins/SonarQube/ArgoCD/dev เช่น 1.2.3.4/32"
  type        = string
}

variable "github_hook_cidrs" {
  description = "IP ที่ GitHub ใช้ยิง webhook เข้า Jenkins ดูค่าล่าสุดที่ https://api.github.com/meta ช่อง hooks"
  type        = list(string)
  default     = ["192.30.252.0/22", "185.199.108.0/22", "140.82.112.0/20", "143.55.64.0/20"]
}

variable "public_key_path" {
  description = "ที่อยู่ไฟล์กุญแจ SSH ดอก .pub ในเครื่องคุณ"
  default     = "~/.ssh/id_ed25519.pub"
}

variable "k8s_node_count" {
  description = "จำนวนเครื่อง Kubernetes (ทุกเครื่องเป็น k3s server แบบ HA: 3 เครื่อง = ทน 1 เครื่องล่ม วางคนละ Availability Zone)"
  default     = 3
}

variable "db_count" {
  description = "จำนวนเครื่องฐานข้อมูล Galera (ควรเป็นเลขคี่: 1 หรือ 3)"
  default     = 3
}

variable "vm_sizes" {
  description = "ขนาดเครื่องของแต่ละบทบาท (เทียบ t3.* ของ AWS: micro~B1s, small~B1ms, medium~B2s)"
  type        = map(string)
  default = {
    bastion   = "Standard_B1s"
    jenkins   = "Standard_B2s"
    sonarqube = "Standard_B2s"
    k8s       = "Standard_B2s"
    dev       = "Standard_B2s"
    db        = "Standard_B1ms"
  }
}
