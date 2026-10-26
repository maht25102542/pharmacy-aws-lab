# ALB เหมือนแบบ VM ต่างที่เป้าหมาย: node ของ EKS อยู่ใน Auto Scaling group ที่ EKS สร้างให้
# จึงผูก target group กับ ASG (node เพิ่ม/ลด/ถูกแทนที่ จะลงทะเบียนเข้า ALB เอง) แทนการผูกทีละเครื่อง
#   :80 prd (NodePort 30080) · :8080 dev (NodePort 30081) · :8443 ArgoCD (NodePort 30443, HTTPS)

resource "aws_lb" "main" {
  name               = "${var.project}-alb"
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
}

locals {
  node_asg = aws_eks_node_group.main.resources[0].autoscaling_groups[0].name
  targets = {
    prd    = { port = 30080, protocol = "HTTP", listen = 80 }
    dev    = { port = 30081, protocol = "HTTP", listen = 8080 }
    argocd = { port = 30443, protocol = "HTTPS", listen = 8443 }
  }
}

resource "aws_lb_target_group" "t" {
  for_each = local.targets

  name     = "${var.project}-${each.key}"
  port     = each.value.port
  protocol = each.value.protocol
  vpc_id   = aws_vpc.main.id

  health_check {
    path     = "/healthz"
    protocol = each.value.protocol
  }
}

resource "aws_autoscaling_attachment" "t" {
  for_each = local.targets

  autoscaling_group_name = local.node_asg
  lb_target_group_arn    = aws_lb_target_group.t[each.key].arn
}

resource "aws_lb_listener" "t" {
  for_each = local.targets

  load_balancer_arn = aws_lb.main.arn
  port              = each.value.listen
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.t[each.key].arn
  }
}
