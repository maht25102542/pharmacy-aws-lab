# ไฟร์วอลล์ 3 ชั้น: ผู้ใช้ → ALB → task → DB (แต่ละชั้นรับเฉพาะจากชั้นก่อนหน้า ผ่าน security group ไม่ใช้ IP)
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

# task: รับจาก ALB เท่านั้น · ขาออกเปิด (ดึง image / secret / ส่ง log ผ่าน NAT)
resource "aws_security_group" "task" {
  name   = "${var.project}-task"
  vpc_id = aws_vpc.main.id

  ingress {
    description     = "container port from ALB only"
    from_port       = local.container_port
    to_port         = local.container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# DB: รับ 5432 จาก task เท่านั้น (ไม่เปิดให้ IP ใดๆ)
resource "aws_security_group" "db" {
  name   = "${var.project}-db"
  vpc_id = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from ECS tasks only"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.task.id]
  }
}
