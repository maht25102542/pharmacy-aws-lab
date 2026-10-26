# ไฟร์วอลล์ น้อยกว่าแบบ VM: ไม่มี SG bastion/base (ไม่มี SSH), ไม่มี SG ของ Galera, SG ของ node EKS สร้างให้เอง

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

# Jenkins / SonarQube: ไม่มี ingress จากเน็ตเลย (เปิดหน้าเว็บผ่าน SSM port forward)
resource "aws_security_group" "jenkins" {
  name   = "${var.project}-jenkins"
  vpc_id = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "sonarqube" {
  name   = "${var.project}-sonarqube"
  vpc_id = aws_vpc.main.id

  ingress {
    description     = "Scan results from Jenkins"
    from_port       = 9000
    to_port         = 9000
    protocol        = "tcp"
    security_groups = [aws_security_group.jenkins.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# SG ที่ EKS สร้างให้ node (cluster security group): เปิดเพิ่มให้ ALB และ Jenkins เข้าได้
locals {
  node_sg = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}

resource "aws_security_group_rule" "node_from_alb" {
  type                     = "ingress"
  description              = "NodePort 30080 prd, 30081 dev from ALB only"
  from_port                = 30080
  to_port                  = 30081
  protocol                 = "tcp"
  security_group_id        = local.node_sg
  source_security_group_id = aws_security_group.alb.id
}

resource "aws_security_group_rule" "node_argocd_from_alb" {
  type                     = "ingress"
  description              = "ArgoCD UI NodePort 30443 from ALB only"
  from_port                = 30443
  to_port                  = 30443
  protocol                 = "tcp"
  security_group_id        = local.node_sg
  source_security_group_id = aws_security_group.alb.id
}

resource "aws_security_group_rule" "node_from_jenkins" {
  type                     = "ingress"
  description              = "ArgoCD API from Jenkins (argocd app sync)"
  from_port                = 30443
  to_port                  = 30443
  protocol                 = "tcp"
  security_group_id        = local.node_sg
  source_security_group_id = aws_security_group.jenkins.id
}

resource "aws_security_group" "db" {
  name   = "${var.project}-db"
  vpc_id = aws_vpc.main.id

  ingress {
    description     = "MySQL from EKS nodes only"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [local.node_sg]
  }
}
