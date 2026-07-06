output "repository_id" {
  description = "ID of the ECR repository"
  value       = aws_ecr_repository.this.id
}

output "repository_arn" {
  description = "ARN of the ECR repository"
  value       = aws_ecr_repository.this.arn
}

output "repository_name" {
  description = "Name of the ECR repository"
  value       = aws_ecr_repository.this.name
}

output "repository_url" {
  description = "URL of the ECR repository — use as image registry in docker/k8s"
  value       = aws_ecr_repository.this.repository_url
}

output "registry_id" {
  description = "Registry ID (12-digit AWS account ID)"
  value       = aws_ecr_repository.this.registry_id
}
