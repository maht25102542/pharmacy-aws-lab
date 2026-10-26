data "aws_caller_identity" "current" {}

# แยก 2 สภาพแวดล้อมในโค้ดชุดเดียว: dev (ทดลอง) กับ prd (ผู้ใช้จริง) · ของจริงมักแยก state/ไดเรกทอรี หรือ workspace ต่อ env
locals {
  envs = {
    dev = { host = "dev.${var.domain_name}", title = "DEV" }
    prd = { host = "www.${var.domain_name}", title = "PRD" }
  }
}
