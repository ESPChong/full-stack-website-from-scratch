output "replication_group_id" {
  description = "ID of the ElastiCache replication group"
  value       = aws_elasticache_replication_group.this.id
}

output "replication_group_arn" {
  description = "ARN of the ElastiCache replication group"
  value       = aws_elasticache_replication_group.this.arn
}

output "endpoint" {
  description = "Primary endpoint — use as REDIS_HOST"
  value       = aws_elasticache_replication_group.this.primary_endpoint_address
  sensitive   = true
}

output "reader_endpoint" {
  description = "Reader endpoint (load-balanced across replicas)"
  value       = aws_elasticache_replication_group.this.reader_endpoint_address
  sensitive   = true
}

output "port" {
  description = "Port the Redis cluster is listening on"
  value       = aws_elasticache_replication_group.this.port
}

output "security_group_id" {
  description = "Security group ID attached to the Redis cluster"
  value       = aws_security_group.this.id
}

output "subnet_group_name" {
  description = "Subnet group name"
  value       = aws_elasticache_subnet_group.this.name
}

output "connection_string_template" {
  description = "Redis connection string template — replace <AUTH_TOKEN> at runtime"
  value       = "rediss://:<AUTH_TOKEN>@${aws_elasticache_replication_group.this.primary_endpoint_address}:${aws_elasticache_replication_group.this.port}"
  sensitive   = true
}
