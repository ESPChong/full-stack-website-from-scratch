output "cluster_identifier" {
  description = "Identifier of the DocumentDB cluster"
  value       = aws_docdb_cluster.this.cluster_identifier
}

output "cluster_arn" {
  description = "ARN of the DocumentDB cluster"
  value       = aws_docdb_cluster.this.arn
}

output "endpoint" {
  description = "Cluster writer endpoint — use this as the MongoDB host"
  value       = aws_docdb_cluster.this.endpoint
  sensitive   = true
}

output "reader_endpoint" {
  description = "Cluster reader endpoint (for read replicas)"
  value       = aws_docdb_cluster.this.reader_endpoint
  sensitive   = true
}

output "port" {
  description = "Port the cluster is listening on"
  value       = aws_docdb_cluster.this.port
}

output "security_group_id" {
  description = "Security group ID attached to the DocumentDB cluster"
  value       = aws_security_group.this.id
}

output "subnet_group_name" {
  description = "Subnet group name"
  value       = aws_docdb_subnet_group.this.name
}

output "connection_string_template" {
  description = "MongoDB connection string template — replace <PASSWORD> at runtime"
  value       = "mongodb://${var.master_username}:<PASSWORD>@${aws_docdb_cluster.this.endpoint}:${aws_docdb_cluster.this.port}/?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"
  sensitive   = true
}
