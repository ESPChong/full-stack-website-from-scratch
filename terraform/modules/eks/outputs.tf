output "cluster_id" {
  description = "ID of the EKS cluster"
  value       = module.eks.cluster_id
}

output "cluster_arn" {
  description = "ARN of the EKS cluster"
  value       = module.eks.cluster_arn
}

output "cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "Endpoint for the EKS Kubernetes API server"
  value       = module.eks.cluster_endpoint
}

output "cluster_certificate_authority_data" {
  description = "Base64-encoded CA data for the cluster (used in kubeconfig)"
  value       = module.eks.cluster_certificate_authority_data
  sensitive   = true
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = module.eks.cluster_security_group_id
}

output "cluster_iam_role_name" {
  description = "IAM role name attached to the EKS cluster"
  value       = module.eks.cluster_iam_role_name
}

output "cluster_iam_role_arn" {
  description = "IAM role ARN attached to the EKS cluster"
  value       = module.eks.cluster_iam_role_arn
}

output "eks_managed_node_groups" {
  description = "Map of managed node group attributes"
  value       = module.eks.eks_managed_node_groups
}

output "node_group_iam_role_arn" {
  description = "IAM role ARN of the worker nodes (for IRSA / ECR pull)"
  value       = module.eks.eks_managed_node_groups["main"].iam_role_arn
}

output "node_group_iam_role_name" {
  description = "IAM role name of the worker nodes"
  value       = module.eks.eks_managed_node_groups["main"].iam_role_name
}
