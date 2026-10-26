# สองสภาพแวดล้อมใช้โค้ดเดียวกัน (for_each) ต่างกันที่ memory ของ Lambda, การสำรอง DynamoDB และอายุ log
locals {
  envs = {
    dev = { memory = 128, pitr = false, log_days = 7 }
    prd = { memory = 256, pitr = true, log_days = 30 }
  }
}
