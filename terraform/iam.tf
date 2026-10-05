# สิทธิ์ของเครื่อง: ให้เครื่องเรียก AWS ได้โดยไม่ต้องฝัง access key

data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

# Jenkins: push image ขึ้น ECR ได้
resource "aws_iam_role" "jenkins" {
  name               = "${var.project}-jenkins"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

resource "aws_iam_role_policy_attachment" "jenkins_ecr" {
  role       = aws_iam_role.jenkins.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"
}

resource "aws_iam_instance_profile" "jenkins" {
  name = "${var.project}-jenkins"
  role = aws_iam_role.jenkins.name
}

# Kubernetes: pull image จาก ECR ได้อย่างเดียว
resource "aws_iam_role" "k8s" {
  name               = "${var.project}-k8s"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

resource "aws_iam_role_policy_attachment" "k8s_ecr" {
  role       = aws_iam_role.k8s.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_instance_profile" "k8s" {
  name = "${var.project}-k8s"
  role = aws_iam_role.k8s.name
}
