# ที่พักไฟล์ระหว่างขั้น (source zip, imagedefinitions.json) · ส่วนตัว ไม่เปิด public
resource "aws_s3_bucket" "artifacts" {
  bucket        = "${var.project}-pipeline-${local.account_id}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket                  = aws_s3_bucket.artifacts.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ต่อ GitHub: สร้างแล้วสถานะ PENDING ต้องกด "Update pending connection" ใน console เพื่อ authorize (Terraform ทำแทนไม่ได้)
resource "aws_codestarconnections_connection" "github" {
  name          = "${var.project}-github"
  provider_type = "GitHub"
}
