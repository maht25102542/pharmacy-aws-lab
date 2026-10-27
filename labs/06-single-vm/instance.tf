resource "aws_key_pair" "admin" {
  key_name   = "${var.project}-single-admin"
  public_key = file(pathexpand(var.public_key_path))
}

# user_data รัน "ครั้งเดียวตอนบูตครั้งแรก" (cloud-init): ติดตั้ง docker → เขียน compose + Caddyfile → docker compose up
# แก้ user_data ทีหลังแล้ว apply เครื่องเดิมจะ "ไม่รันซ้ำ" (ต้อง replace เครื่อง หรือ ssh เข้าไปรันเอง)
resource "aws_instance" "web" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public.id
  key_name               = aws_key_pair.admin.key_name
  vpc_security_group_ids = [aws_security_group.web.id]

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  user_data = <<-EOT
    #!/bin/bash
    set -eux
    apt-get update
    apt-get install -y docker.io docker-compose-v2
    mkdir -p /opt/app && cd /opt/app
    cat > Caddyfile <<'CF'
    ${var.domain != "" ? var.domain : ":80"} {
      reverse_proxy app:8000
    }
    CF
    cat > docker-compose.yml <<'YML'
    services:
      app:
        image: ghcr.io/YOUR_GITHUB_USER/pharmacy-backend:latest
        restart: unless-stopped
      db:
        image: postgres:16
        restart: unless-stopped
        volumes: ["dbdata:/var/lib/postgresql/data"]
      caddy:
        image: caddy:2
        restart: unless-stopped
        ports: ["80:80", "443:443"]
        volumes: ["./Caddyfile:/etc/caddy/Caddyfile", "caddydata:/data"]
    volumes: { dbdata: {}, caddydata: {} }
    YML
    docker compose up -d
  EOT

  tags = {
    Name = "${var.project}-single"
  }
}

# public IP ธรรมดาเปลี่ยนทุกครั้งที่ stop/start · Elastic IP ตรึงไว้ (DNS จึงชี้ถูกตลอด)
resource "aws_eip" "web" {
  domain   = "vpc"
  instance = aws_instance.web.id
}

# A record ชื่อโดเมน → Elastic IP (สร้างเมื่อใส่ zone_id + domain)
resource "aws_route53_record" "web" {
  count = var.zone_id != "" && var.domain != "" ? 1 : 0

  zone_id = var.zone_id
  name    = var.domain
  type    = "A"
  ttl     = 60
  records = [aws_eip.web.public_ip]
}
