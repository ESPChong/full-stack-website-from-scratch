output "ecr_repository_url" {
  value = module.ecr.repository_url
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "documentdb_endpoint" {
  value     = module.documentdb.endpoint
  sensitive = true
}

output "elasticache_endpoint" {
  value     = module.elasticache.endpoint
  sensitive = true
}