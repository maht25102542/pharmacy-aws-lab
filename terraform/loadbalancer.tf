# Load balancer หน้าระบบ: รับคำขอจากผู้ใช้ แล้วส่งให้ frontend บนเครื่อง Kubernetes
#   port 80   -> prd (NodePort 30080)
#   port 8080 -> dev (NodePort 30081 บน VM pharmacy-dev)
#   port 8443 -> หน้า ArgoCD (NodePort 30443 เป็น HTTPS) เปิดเฉพาะ IP ของคุณ
# ALB อยู่ใน public subnet ครบ 3 AZ ส่วนเครื่องเป้าหมายอยู่ private subnet

resource "aws_lb" "main" {
  name               = "${var.project}-alb"
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
}

resource "aws_lb_target_group" "prd" {
  name     = "${var.project}-prd"
  port     = 30080
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    path = "/healthz"
  }
}

resource "aws_lb_target_group" "dev" {
  name     = "${var.project}-dev"
  port     = 30081
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    path = "/healthz"
  }
}

resource "aws_lb_target_group" "argocd" {
  name     = "${var.project}-argocd"
  port     = 30443
  protocol = "HTTPS"
  vpc_id   = aws_vpc.main.id

  health_check {
    path     = "/healthz"
    protocol = "HTTPS"
  }
}

resource "aws_lb_target_group_attachment" "prd" {
  count            = var.k8s_node_count
  target_group_arn = aws_lb_target_group.prd.arn
  target_id        = aws_instance.k8s[count.index].id
}

resource "aws_lb_target_group_attachment" "argocd" {
  count            = var.k8s_node_count
  target_group_arn = aws_lb_target_group.argocd.arn
  target_id        = aws_instance.k8s[count.index].id
}

resource "aws_lb_target_group_attachment" "dev" {
  target_group_arn = aws_lb_target_group.dev.arn
  target_id        = aws_instance.dev.id
}

resource "aws_lb_listener" "prd" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.prd.arn
  }
}

resource "aws_lb_listener" "dev" {
  load_balancer_arn = aws_lb.main.arn
  port              = 8080
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.dev.arn
  }
}

resource "aws_lb_listener" "argocd" {
  load_balancer_arn = aws_lb.main.arn
  port              = 8443
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.argocd.arn
  }
}
