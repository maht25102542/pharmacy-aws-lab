# บอก AWS ว่าเชื่อ ID token ที่ GitHub ออกให้ (1 account ต่อ 1 provider ของ GitHub)
resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}
