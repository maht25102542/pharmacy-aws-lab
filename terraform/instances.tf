# VM ทั้งหมดของระบบ ป้าย Role คือสิ่งที่ Ansible ใช้แยกว่าเครื่องไหนทำหน้าที่อะไร

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
  }
}

# ---------- VM: Kubernetes (รัน FE, BE และ ArgoCD) ----------
resource "aws_instance" "k8s" {
  count                  = var.k8s_node_count
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_types["k8s"]
  subnet_id              = aws_subnet.public[count.index % 2].id
  key_name               = aws_key_pair.admin.key_name
  vpc_security_group_ids = [aws_security_group.base.id, aws_security_group.k8s.id]
  iam_instance_profile   = aws_iam_instance_profile.k8s.name

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  tags = {
    Name = "${var.project}-k8s-${count.index + 1}"
    Role = count.index == 0 ? "k8s_server" : "k8s_agent"
  }
}

# ---------- VM: dev (k3s เครื่องเดียว รัน FE/BE ของ dev; ArgoCD ที่ k8s-1 คุมให้) ----------
resource "aws_instance" "dev" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_types["dev"]
  subnet_id              = aws_subnet.public[0].id
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
  }
}

# ---------- VM: ฐานข้อมูล MariaDB Galera ----------
resource "aws_instance" "db" {
  count                  = var.db_count
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_types["db"]
  subnet_id              = aws_subnet.public[count.index % 2].id
  key_name               = aws_key_pair.admin.key_name
  vpc_security_group_ids = [aws_security_group.base.id, aws_security_group.db.id]

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  tags = {
    Name = "${var.project}-db-${count.index + 1}"
    Role = "db"
  }
}
