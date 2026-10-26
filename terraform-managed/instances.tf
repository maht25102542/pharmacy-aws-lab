# เหลือเครื่องเองแค่ 2 ตัว (Jenkins, SonarQube) อยู่ private subnet ไม่มี public IP ไม่มี key pair
# เข้าผ่าน SSM Session Manager: aws ssm start-session --target <instance-id>
# (ต้องมี SSM agent: Ubuntu AMI ของ Canonical ติดตั้งมาให้แล้ว และออกไปหา SSM ผ่าน NAT)

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
}

resource "aws_instance" "jenkins" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.ci_instance_type
  subnet_id              = aws_subnet.private[0].id
  vpc_security_group_ids = [aws_security_group.jenkins.id]
  iam_instance_profile   = aws_iam_instance_profile.jenkins.name

  # Jenkins รันใน container จึงต้องเพิ่ม hop เป็น 2
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
    Tier = "private"
  }
}

resource "aws_instance" "sonarqube" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.ci_instance_type
  subnet_id              = aws_subnet.private[1].id
  vpc_security_group_ids = [aws_security_group.sonarqube.id]
  iam_instance_profile   = aws_iam_instance_profile.sonarqube.name

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  tags = {
    Name = "${var.project}-sonarqube"
    Role = "sonarqube"
    Tier = "private"
  }
}
