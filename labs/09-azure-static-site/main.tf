# แยก 2 สภาพแวดล้อมในโค้ดชุดเดียว: dev (ทดลอง) กับ prd (ผู้ใช้จริง) · ของจริงมักแยก state/ไดเรกทอรี หรือ workspace ต่อ env
locals {
  envs = {
    dev = { title = "DEV" }
    prd = { title = "PRD" }
  }
}
