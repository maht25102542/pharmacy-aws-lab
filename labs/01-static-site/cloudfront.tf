# OAC = ใบอนุญาตให้ CloudFront เซ็นคำขอ (SigV4) ไปอ่าน S3 ส่วนตัว (แทน OAI รุ่นเก่า)
resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${var.project}-web-oac"
  description                       = "CloudFront reads private S3 buckets"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "site" {
  for_each = local.envs

  enabled             = true
  comment             = "${var.project} web ${each.key}"
  default_root_object = "index.html"
  aliases             = [each.value.host]
  price_class         = "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.site[each.key].bucket_regional_domain_name
    origin_id                = "s3-${each.key}"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-${each.key}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # Managed-CachingOptimized (TTL ค่าเริ่มต้น 1 วัน)
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
