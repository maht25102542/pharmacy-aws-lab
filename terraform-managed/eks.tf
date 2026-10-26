# Kubernetes แบบ managed: AWS ดูแล control plane (API server, etcd) ให้
# แทนที่: k3s ×3 + dev VM + ansible/k8s.yml (ติดตั้ง, join, ต่ออายุ token ECR) ทั้งหมด
# จุดต่างจากแบบ VM: cluster เดียว แยก dev/prd ด้วย namespace (ถ้าต้องการแยกแน่นหนา ให้สร้าง cluster ที่สอง)

resource "aws_eks_cluster" "main" {
  name     = "${var.project}-eks"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = var.eks_version

  vpc_config {
    subnet_ids              = aws_subnet.private[*].id
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = [var.my_ip] # kubectl จากเครื่องคุณเท่านั้น
  }

  access_config {
    authentication_mode                         = "API"
    bootstrap_cluster_creator_admin_permissions = true
  }

  depends_on = [aws_iam_role_policy_attachment.eks_cluster]
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.project}-nodes"
  node_role_arn   = aws_iam_role.eks_node.arn
  subnet_ids      = aws_subnet.private[*].id # กระจายคนละ AZ ให้เอง
  instance_types  = [var.node_instance_type]

  scaling_config {
    desired_size = var.node_count
    min_size     = var.node_count
    max_size     = var.node_count + 3
  }

  # node ต้องออกเน็ตได้ตั้งแต่บูต (ไปเรียก EKS API/ECR) จึงต้องรอเส้นทางให้พร้อมก่อน: private → NAT และ public (ที่ NAT อยู่) → IGW
  # ถ้าไม่รอ จะเจอ NodeCreationFailure: Instances failed to join the kubernetes cluster
  depends_on = [aws_iam_role_policy_attachment.eks_node, aws_nat_gateway.main, aws_route_table_association.public, aws_route_table_association.private]
}
