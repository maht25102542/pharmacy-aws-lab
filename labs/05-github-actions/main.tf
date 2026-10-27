data "aws_caller_identity" "me" {}

locals {
  account_id = data.aws_caller_identity.me.account_id

  # sub = ข้อความที่ GitHub ใส่ใน token ว่า job นี้มาจากไหน · trust policy ต้องจับคู่ให้ตรง
  #   job ปกติ (push branch)          → repo:OWNER/REPO:ref:refs/heads/BRANCH
  #   job ที่ใส่ environment: ...     → repo:OWNER/REPO:environment:NAME   (ไม่ใช่ branch/tag อีกต่อไป!)
  # repo ที่สร้างหลัง 15 ก.ค. 2026 (หรือ opt-in) ส่ง sub แบบ immutable: repo:OWNER@<owner id>/REPO@<repo id>:...
  # ใส่ทั้งสองแบบ (StringLike, * แทน id) ไม่ต้องรู้ id ล่วงหน้า · ถ้าอยากเข้มงวด ใส่ id จริงแทน *
  owner = split("/", var.github_repo)[0]
  repo  = split("/", var.github_repo)[1]

  allowed_subs = [
    "repo:${var.github_repo}:ref:refs/heads/${var.branch}",
    "repo:${local.owner}@*/${local.repo}@*:ref:refs/heads/${var.branch}",
    "repo:${var.github_repo}:environment:${var.prd_environment}",
    "repo:${local.owner}@*/${local.repo}@*:environment:${var.prd_environment}",
  ]
}
