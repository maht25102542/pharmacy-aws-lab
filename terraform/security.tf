# ไฟร์วอลล์ แยกตามบทบาทของเครื่อง

# ใช้กับทุกเครื่อง: SSH จาก IP ของคุณ และออกอินเทอร์เน็ตได้
resource "aws_security_group" "base" {
  name   = "${var.project}-base"
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
    description = "Kubernetes nodes talk to each other"
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
    description = "ArgoCD UI from admin"
    from_port   = 30443
    to_port     = 30443
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
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
