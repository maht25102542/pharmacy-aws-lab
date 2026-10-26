# 2 สภาพแวดล้อมในโค้ดชุดเดียว (ของจริงมักแยก state/ไดเรกทอรี/account ต่อ env)
#   dev: เล็กและถูก · 1 task · DB เครื่องเดียว · เปิดเฉพาะ IP ของเรา (ALB :8080)
#   prd: 2 task คนละ AZ · DB Multi-AZ · เปิดทุกคน (ALB :80)
locals {
  envs = {
    dev = { tasks = 1, cpu = 256, memory = 512, multi_az = false, port = 8080, db_class = "db.t4g.micro", backup = 1 }
    prd = { tasks = 2, cpu = 512, memory = 1024, multi_az = true, port = 80, db_class = "db.t4g.small", backup = 7 }
  }
  container_port = 8000
}
