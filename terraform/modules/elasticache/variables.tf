variable "project_name" {
  description = "Short project identifier used as a prefix on all resources"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC where ElastiCache will be deployed"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs (>= 2 for HA)"
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "Security group IDs allowed to reach Redis on port 6379 (typically the EKS node SG)"
  type        = list(string)
}

variable "engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.1"
}

variable "node_type" {
  description = "ElastiCache node type (smallest: cache.t3.micro)"
  type        = string
  default     = "cache.t3.micro"
}

variable "cluster_size" {
  description = "Number of cache nodes (1 = single node, 2+ enables replication)"
  type        = number
  default     = 2
}

variable "multi_az_enabled" {
  description = "Enable Multi-AZ for automatic failover (requires cluster_size >= 2)"
  type        = bool
  default     = true
}

variable "parameter_group_name" {
  description = "Parameter group name (use default.redis7 for Redis 7.x)"
  type        = string
  default     = "default.redis7"
}

variable "auth_token" {
  description = "AUTH token required for Redis connections (16-128 chars) — pass via secrets, NEVER hardcode"
  type        = string
  sensitive   = true
}

variable "snapshot_retention_limit" {
  description = "Number of days to retain automatic snapshots (0 = disabled)"
  type        = number
  default     = 7
}
