# ฐานข้อมูลแบบ managed: RDS MariaDB Multi-AZ
# แทนที่: Galera ×3 + vm-db/60-galera.cnf.j2 + ansible/db.yml (bootstrap, join, ตรวจ quorum)
# Multi-AZ = AWS วาง standby คนละ AZ และสลับให้อัตโนมัติ (~1-2 นาที) · backup, patch ทำให้
# รหัสผ่านอยู่ใน Secrets Manager (ไม่อยู่ใน group_vars แบบข้อความเปล่าอีก)
# dev กับ prd ใช้ instance เดียวกัน แยก database (pharmacy_dev / pharmacy_prd) เหมือนแบบ VM

resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-db"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_db_instance" "main" {
  identifier        = "${var.project}-db"
  engine            = "mariadb"
  engine_version    = "10.11"
  instance_class    = var.db_instance_class
  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  username                    = "pharmacy"
  manage_master_user_password = true # Secrets Manager สร้างและหมุนรหัสให้

  multi_az               = true
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false

  backup_retention_period = 7
  skip_final_snapshot     = true # สำหรับฝึกเท่านั้น (ของจริงต้องเก็บ snapshot ก่อนลบ)
  deletion_protection     = false
}
