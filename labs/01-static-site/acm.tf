# ใบรับรอง HTTPS (ฟรี) ครอบทั้ง www (prd) และ dev · ต้องอยู่ us-east-1 เพราะ CloudFront ใช้ได้แค่ที่นั่น
resource "aws_acm_certificate" "site" {
  provider = aws.use1

  domain_name               = local.envs["prd"].host
  subject_alternative_names = [local.envs["dev"].host]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# พิสูจน์ว่าเราเป็นเจ้าของโดเมนด้วยการสร้าง CNAME ใน Route 53 (ACM เช็กแล้วเปลี่ยนสถานะเป็น Issued)
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.site.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id         = aws_route53_zone.main.zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

# รอจนใบรับรอง Issued จริง ก่อนให้ CloudFront ใช้ (ไม่รอ = CloudFront สร้างไม่ผ่าน)
resource "aws_acm_certificate_validation" "site" {
  provider = aws.use1

  certificate_arn         = aws_acm_certificate.site.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}
