# ที่เก็บ image ของ API (ใช้ร่วม dev/prd แยกด้วย tag: dev ใช้ tag ทดลอง prd ใช้ tag เวอร์ชัน vN.N.N)
resource "aws_ecr_repository" "api" {
  name                 = "${var.project}/api"
  image_tag_mutability = "IMMUTABLE"
  force_delete         = true # ฝึกเท่านั้น: ลบได้แม้ยังมี image
}
