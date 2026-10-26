# ที่เก็บไฟล์เว็บ: บัคเก็ตส่วนตัว (ไม่เปิดเว็บไซต์ผ่าน S3 ตรงๆ) ให้ CloudFront อ่านผ่าน OAC เท่านั้น
resource "aws_s3_bucket" "site" {
  for_each = local.envs

  bucket        = "${var.project}-web-${each.key}-${data.aws_caller_identity.current.account_id}"
  force_destroy = true # ให้ terraform destroy ลบได้แม้ยังมีไฟล์ (สำหรับฝึกเท่านั้น)
}

resource "aws_s3_bucket_public_access_block" "site" {
  for_each = local.envs

  bucket                  = aws_s3_bucket.site[each.key].id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# อนุญาตเฉพาะ CloudFront ของ env นี้ (เช็กจาก ARN ของ distribution) ให้อ่านไฟล์ได้
data "aws_iam_policy_document" "site" {
  for_each = local.envs

  statement {
    sid       = "AllowCloudFrontServicePrincipalReadOnly"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site[each.key].arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.site[each.key].arn]
    }
  }
}

resource "aws_s3_bucket_policy" "site" {
  for_each = local.envs

  bucket = aws_s3_bucket.site[each.key].id
  policy = data.aws_iam_policy_document.site[each.key].json

  depends_on = [aws_s3_bucket_public_access_block.site]
}

# หน้าแรกของแต่ละ env (ของจริงอัปโหลดจากขั้นตอน build ด้วย aws s3 sync)
resource "aws_s3_object" "index" {
  for_each = local.envs

  bucket       = aws_s3_bucket.site[each.key].id
  key          = "index.html"
  content      = "<h1>${var.project} ${each.value.title}</h1><p>version 1</p>"
  content_type = "text/html"
}
