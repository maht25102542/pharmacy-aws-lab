# 80/443 เปิดให้ทุกคน (เว็บ + ให้ Let's Encrypt ตรวจโดเมนผ่าน port 80) · SSH เฉพาะ IP ของเรา
resource "aws_security_group" "web" {
  name        = "${var.project}-single-web"
  description = "web 80/443 from anywhere, ssh from my ip"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "http (และ ACME challenge ของ Let's Encrypt)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "https"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "ssh เฉพาะเครื่องเรา"
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
