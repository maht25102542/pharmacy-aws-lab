# สิทธิ์ทั้งหมด ไม่ฝัง access key
# SSM: ทุกเครื่องที่ต้องเข้าไปดูแล ใช้ policy AmazonSSMManagedInstanceCore แทนการเปิด SSH + bastion

data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "eks_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["eks.amazonaws.com"]
    }
  }
}

# ---------- Jenkins: push image ขึ้น ECR + เข้าได้ทาง SSM ----------
resource "aws_iam_role" "jenkins" {
  name               = "${var.project}-jenkins"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

resource "aws_iam_role_policy_attachment" "jenkins" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser",
    "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
  ])
  role       = aws_iam_role.jenkins.name
  policy_arn = each.value
}

resource "aws_iam_instance_profile" "jenkins" {
  name = "${var.project}-jenkins"
  role = aws_iam_role.jenkins.name
}

# ---------- SonarQube: เข้าได้ทาง SSM อย่างเดียว ----------
resource "aws_iam_role" "sonarqube" {
  name               = "${var.project}-sonarqube"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

resource "aws_iam_role_policy_attachment" "sonarqube" {
  role       = aws_iam_role.sonarqube.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "sonarqube" {
  name = "${var.project}-sonarqube"
  role = aws_iam_role.sonarqube.name
}

# ---------- EKS control plane ----------
resource "aws_iam_role" "eks_cluster" {
  name               = "${var.project}-eks-cluster"
  assume_role_policy = data.aws_iam_policy_document.eks_assume.json
}

resource "aws_iam_role_policy_attachment" "eks_cluster" {
  role       = aws_iam_role.eks_cluster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

# ---------- EKS worker node: ดึง image จาก ECR ได้เอง (แทน ecr-refresh.timer ทุก 12 ชม. ของแบบ VM) ----------
resource "aws_iam_role" "eks_node" {
  name               = "${var.project}-eks-node"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

resource "aws_iam_role_policy_attachment" "eks_node" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
  ])
  role       = aws_iam_role.eks_node.name
  policy_arn = each.value
}
