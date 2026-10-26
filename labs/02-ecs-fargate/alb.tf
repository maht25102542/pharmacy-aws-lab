# ALB หน้าบ้าน: :80 → prd, :8080 → dev · target group แบบ "ip" เพราะ Fargate (awsvpc) ให้ task มี IP ของตัวเอง
resource "aws_lb" "main" {
  name               = "${var.project}-api-alb"
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
}

resource "aws_lb_target_group" "api" {
  for_each = local.envs

  name        = "${var.project}-api-${each.key}"
  port        = local.container_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_vpc.main.id

  health_check {
    path = "/healthz" # ต้องตรงกับ path ที่แอปตอบ 200 ไม่งั้น ECS ฆ่า task วนไปมา
  }
}

resource "aws_lb_listener" "api" {
  for_each = local.envs

  load_balancer_arn = aws_lb.main.arn
  port              = each.value.port
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api[each.key].arn
  }
}
