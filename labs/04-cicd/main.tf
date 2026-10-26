data "aws_caller_identity" "me" {}

locals {
  account_id   = data.aws_caller_identity.me.account_id
  ecr_repo_url = "${local.account_id}.dkr.ecr.${var.region}.amazonaws.com/${var.ecr_repo}"

  # ปลายทางของ deploy: cluster/service เหล่านี้สร้างไว้แล้วใน lab 02
  deploy = {
    dev = { cluster = "${var.project}-dev" }
    prd = { cluster = "${var.project}-prd" }
  }
  service = "${var.project}-api"
}
