# เครือข่ายแบบที่ระบบจริงใช้: 3 Availability Zone, แยก subnet สาธารณะ/ส่วนตัว
#   public  (10.0.1-3.0/24)  : ALB, NAT gateway, bastion, Jenkins, SonarQube  (มี public IP, ออกเน็ตผ่าน IGW)
#   private (10.0.11-13.0/24): Kubernetes, DB                                  (ไม่มี public IP, ออกเน็ตผ่าน NAT)
# เครื่องที่เก็บแอปและข้อมูลจึงไม่มีทางถูกเข้าตรงจากอินเทอร์เน็ต
# ข้อแลกเปลี่ยน: ใช้ NAT เครื่องเดียว (ประหยัด) ถ้า AZ ของ NAT ล่ม เครื่องใน private จะออกเน็ตไม่ได้
#               ระบบจริงที่ต้องการ HA เต็มรูปแบบใช้ NAT ต่อ AZ (3 ตัว)

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true

  tags = {
    Name = "${var.project}-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_subnet" "public" {
  count                   = 3
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 1)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project}-public-${count.index + 1}"
  }
}

resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 11)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${var.project}-private-${count.index + 1}"
  }
}

# NAT gateway: ให้เครื่องใน private subnet ออกอินเทอร์เน็ตได้ (apt, docker, ECR) แต่ขาเข้าจากเน็ตเข้าไม่ได้
resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "${var.project}-nat"
  }

  depends_on = [aws_internet_gateway.main]
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.project}-public"
  }
}

resource "aws_route_table_association" "public" {
  count          = 3
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Name = "${var.project}-private"
  }
}

resource "aws_route_table_association" "private" {
  count          = 3
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}
