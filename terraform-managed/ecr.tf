# ที่เก็บ image (เทียบกับ registry ที่ docker push ไป)
resource "aws_ecr_repository" "app" {
  for_each = toset(["frontend", "backend"])

  name         = "${var.project}/${each.key}"
  force_delete = true # ให้ terraform destroy ลบได้แม้ยังมี image (สำหรับฝึกเท่านั้น)
}
