# -----------------------------------------------------------------------------
# EKS Cluster — uses the community terraform-aws-modules/eks/aws module
# Reference: https://github.com/terraform-aws-modules/terraform-aws-eks
# -----------------------------------------------------------------------------
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.24"

  cluster_name    = "${var.project_name}-${var.environment}"
  cluster_version = var.cluster_version

  # API server access — public for dev convenience, tighten in prod
  cluster_endpoint_public_access       = var.cluster_endpoint_public_access
  cluster_endpoint_public_access_cidrs = var.api_access_cidrs
  cluster_endpoint_private_access      = true

  # Networking — control plane ENIs go in private subnets, node groups too
  vpc_id                   = var.vpc_id
  subnet_ids               = var.private_subnet_ids
  control_plane_subnet_ids = var.private_subnet_ids

  # IRSA (IAM Roles for Service Accounts) — required for pods to assume IAM roles
  enable_irsa = true

  # ----- Cluster logging — send all control plane logs to CloudWatch -----
  cluster_enabled_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  # ----- Managed node group -----
  eks_managed_node_groups = {
    main = {
      name           = "${var.project_name}-${var.environment}-nodes"
      description    = "Managed node group for ${var.project_name} ${var.environment}"
      instance_types = [var.node_instance_type]
      capacity_type  = var.node_capacity_type

      min_size     = var.node_min_size
      max_size     = var.node_max_size
      desired_size = var.node_desired_size

      disk_size = var.node_disk_size_gb
      disk_type = "gp3"

      # Let the module auto-create the node IAM role
      create_iam_role = true

      labels = {
        Environment = var.environment
        Project     = var.project_name
      }
    }
  }

  # ----- Cluster add-ons -----
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent              = true
      service_account_role_arn = module.eks.eks_managed_node_groups["main"].iam_role_arn
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

# -----------------------------------------------------------------------------
# IAM policy allowing EKS worker nodes to pull from ECR
# -----------------------------------------------------------------------------
data "aws_iam_policy_document" "ecr_pull" {
  statement {
    sid    = "ECRPullAccess"
    effect = "Allow"

    actions = [
      "ecr:GetAuthorizationToken",
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
    ]

    resources = ["*"]
  }
}

resource "aws_iam_policy" "ecr_pull" {
  name        = "${var.project_name}-${var.environment}-ecr-pull"
  description = "Allow EKS nodes to pull images from ECR"
  policy      = data.aws_iam_policy_document.ecr_pull.json
}

resource "aws_iam_role_policy_attachment" "ecr_pull" {
  role       = module.eks.eks_managed_node_groups["main"].iam_role_name
  policy_arn = aws_iam_policy.ecr_pull.arn
}
