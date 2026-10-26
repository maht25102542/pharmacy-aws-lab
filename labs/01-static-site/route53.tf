# โซน DNS ของโดเมน (ต้องไปตั้ง NS ที่ผู้ขายโดเมนให้ชี้มาที่ name_servers ที่ output ให้)
resource "aws_route53_zone" "main" {
  name = var.domain_name
}

# www.<โดเมน> → prd, dev.<โดเมน> → dev (A แบบ alias ไปที่ CloudFront)
resource "aws_route53_record" "site" {
  for_each = local.envs

  zone_id = aws_route53_zone.main.zone_id
  name    = each.value.host
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.site[each.key].domain_name
    zone_id                = aws_cloudfront_distribution.site[each.key].hosted_zone_id
    evaluate_target_health = false
  }
}
