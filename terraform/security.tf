# ไฟร์วอลล์ แยกตามบทบาทของเครื่อง
# หลักคิด: อนุญาต "จาก SG ที่ต้องคุยกัน" ไม่ใช้ IP · เครื่องภายในไม่รับ SSH จากอินเทอร์เน็ต (เข้าผ่าน bastion เท่านั้น)

# bastion: ประตูเดียวที่รับ SSH จากอินเทอร์เน็ต (เฉพาะ IP ของคุณ)
resource "aws_security_group" "bastion" {
  name   = "${var.project}-bastion"
  vpc_id = aws_vpc.main.id

  ingress {
    description = "SSH from admin"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ใช้กับทุกเครื่องภายใน (Jenkins, SonarQube, k8s, dev, db): SSH จาก bastion เท่านั้น และออกอินเทอร์เน็ตได้
resource "aws_security_group" "base" {
  name   = "${var.project}-base"
  vpc_id = aws_vpc.main.id

  ingress {
    description     = "SSH from bastion"
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "alb" {
  name   = "${var.project}-alb"
  vpc_id = aws_vpc.main.id

  ingress {
    description = "prd: open to everyone"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "dev: admin only"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
  }

  ingress {
    description = "ArgoCD UI: admin only"
    from_port   = 8443
    to_port     = 8443
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "jenkins" {
  name   = "${var.project}-jenkins"
  vpc_id = aws_vpc.main.id

  ingress {
    description = "Jenkins UI from admin"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
  }
}

resource "aws_security_group" "sonarqube" {
  name   = "${var.project}-sonarqube"
  vpc_id = aws_vpc.main.id

  ingress {
    description = "SonarQube UI from admin"
    from_port   = 9000
    to_port     = 9000
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
  }

  ingress {
    description     = "Scan results from Jenkins"
    from_port       = 9000
    to_port         = 9000
    protocol        = "tcp"
    security_groups = [aws_security_group.jenkins.id]
  }
}

resource "aws_security_group" "k8s" {
  name   = "${var.project}-k8s"
  vpc_id = aws_vpc.main.id

  ingress {
    description = "Kubernetes nodes talk to each other (API 6443, etcd, flannel)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }

  ingress {
    description     = "Frontend NodePort (prd 30080, dev 30081) from ALB only"
    from_port       = 30080
    to_port         = 30081
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "ArgoCD UI (NodePort 30443) from ALB only"
    from_port       = 30443
    to_port         = 30443
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "ArgoCD API from Jenkins (argocd app sync)"
    from_port       = 30443
    to_port         = 30443
    protocol        = "tcp"
    security_groups = [aws_security_group.jenkins.id]
  }
}

resource "aws_security_group" "db" {
  name   = "${var.project}-db"
  vpc_id = aws_vpc.main.id

  ingress {
    description = "Galera replication between DB nodes"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }

  ingress {
    description     = "MySQL from Kubernetes nodes only"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.k8s.id]
  }
}
