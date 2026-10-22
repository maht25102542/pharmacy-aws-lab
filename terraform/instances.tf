# VM ทั้งหมดของระบบ
#   ป้าย Role = หน้าที่ (Ansible ใช้แยกกลุ่ม) · ป้าย Tier = public | private (Ansible ใช้ตัดสินว่าต้องเข้าผ่าน bastion ไหม)
#   public : bastion, Jenkins, SonarQube   (มี public IP)
#   private: Kubernetes ×3, dev, DB ×3      (ไม่มี public IP, วางคนละ AZ)

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
}

resource "aws_key_pair" "admin" {
  key_name   = "${var.project}-admin"
  public_key = file(pathexpand(var.public_key_path))
}

# ---------- VM: bastion (ประตูเข้าเครื่องภายใน) ----------
resource "aws_instance" "bastion" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_types["bastion"]
  subnet_id              = aws_subnet.public[0].id
  key_name               = aws_key_pair.admin.key_name
  vpc_security_group_ids = [aws_security_group.bastion.id]

  root_block_device {
    volume_size = 8
    volume_type = "gp3"
  }

  tags = {
    Name = "${var.project}-bastion"
    Role = "bastion"
    Tier = "public"
  }
}

# ---------- VM: Jenkins (1 เครื่อง) ----------
resource "aws_instance" "jenkins" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_types["jenkins"]
  subnet_id              = aws_subnet.public[0].id
  key_name               = aws_key_pair.admin.key_name
  vpc_security_group_ids = [aws_security_group.base.id, aws_security_group.jenkins.id]
  iam_instance_profile   = aws_iam_instance_profile.jenkins.name

  # Jenkins รันใน container จึงต้องเพิ่ม hop เป็น 2
  # ไม่อย่างนั้น container จะขอสิทธิ์ AWS จากเครื่องไม่ได้
  metadata_options {
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
  }

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  tags = {
    Name = "${var.project}-jenkins"
    Role = "jenkins"
    Tier = "public"
  }
}

# ---------- VM: SonarQube (1 เครื่อง) ----------
resource "aws_instance" "sonarqube" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_types["sonarqube"]
  subnet_id              = aws_subnet.public[0].id
  key_name               = aws_key_pair.admin.key_name
  vpc_security_group_ids = [aws_security_group.base.id, aws_security_group.sonarqube.id]

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  tags = {
    Name = "${var.project}-sonarqube"
    Role = "sonarqube"
    Tier = "public"
  }
}

# ---------- VM: Kubernetes (รัน FE, BE และ ArgoCD) ----------
# ทุกเครื่องเป็น k3s server แบบ HA (etcd ในตัว) วางคนละ AZ: ล่มได้ 1 เครื่อง/1 AZ แล้ว cluster ยังทำงาน
resource "aws_instance" "k8s" {
  count                  = var.k8s_node_count
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_types["k8s"]
  subnet_id              = aws_subnet.private[count.index % 3].id
  key_name               = aws_key_pair.admin.key_name
  vpc_security_group_ids = [aws_security_group.base.id, aws_security_group.k8s.id]
  iam_instance_profile   = aws_iam_instance_profile.k8s.name

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  tags = {
    Name = "${var.project}-k8s-${count.index + 1}"
    Role = "k8s_server"
    Tier = "private"
  }
}

# ---------- VM: dev (k3s เครื่องเดียว รัน FE/BE ของ dev; ArgoCD ที่ k8s-1 คุมให้) ----------
resource "aws_instance" "dev" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_types["dev"]
  subnet_id              = aws_subnet.private[0].id
  key_name               = aws_key_pair.admin.key_name
  vpc_security_group_ids = [aws_security_group.base.id, aws_security_group.k8s.id] # ใช้ SG เดียวกับ k8s: ArgoCD เข้า :6443 ได้, ต่อ DB ได้
  iam_instance_profile   = aws_iam_instance_profile.k8s.name                       # ดึง ECR ได้

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  tags = {
    Name = "${var.project}-dev"
    Role = "k8s_dev"
    Tier = "private"
  }
}

# ---------- VM: ฐานข้อมูล MariaDB Galera ----------
# 3 เครื่อง คนละ AZ: Galera ต้องมีเสียงข้างมาก (2 ใน 3) AZ ไหนล่มก็ยังเหลือ 2 เครื่อง DB ไม่หยุด
resource "aws_instance" "db" {
  count                  = var.db_count
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_types["db"]
  subnet_id              = aws_subnet.private[count.index % 3].id
  key_name               = aws_key_pair.admin.key_name
  vpc_security_group_ids = [aws_security_group.base.id, aws_security_group.db.id]

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  tags = {
    Name = "${var.project}-db-${count.index + 1}"
    Role = "db"
    Tier = "private"
  }
}
