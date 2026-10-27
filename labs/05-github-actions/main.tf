data "aws_caller_identity" "me" {}

locals {
  account_id = data.aws_caller_identity.me.account_id

  # sub = ข้อความที่ GitHub ใส่ใน token ว่า job นี้มาจากไหน · trust policy ต้องจับคู่ให้ตรง
  #   job ปกติ (push branch)          → repo:OWNER/REPO:ref:refs/heads/BRANCH
  #   job ที่ใส่ environment: ...     → repo:OWNER/REPO:environment:NAME   (ไม่ใช่ branch/tag อีกต่อไป!)
  allowed_subs = [
    "repo:${var.github_repo}:ref:refs/heads/${var.branch}",
    "repo:${var.github_repo}:environment:${var.prd_environment}",
  ]
}
