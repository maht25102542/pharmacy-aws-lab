# ฐานข้อมูลของแต่ละ env (PostgreSQL) อยู่ private subnet · รหัสผ่านให้ Secrets Manager จัดการ
resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-api-db"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_db_instance" "db" {
  for_each = local.envs

  identifier        = "${var.project}-api-${each.key}"
  engine            = "postgres"
  engine_version    = "16"
  instance_class    = each.value.db_class
  allocated_storage = 20
  db_name           = "pharmacy"
  username          = "pharmacy"

  manage_master_user_password = true
  multi_az                    = each.value.multi_az
  db_subnet_group_name        = aws_db_subnet_group.main.name
  vpc_security_group_ids      = [aws_security_group.db.id]
  publicly_accessible         = false

  backup_retention_period = each.value.backup
  skip_final_snapshot     = true # ฝึกเท่านั้น
}
