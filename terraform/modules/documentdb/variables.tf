variable "project_name" {
  description = "Short project identifier used as a prefix on all resources"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC where DocumentDB will be deployed"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs (>= 2 for HA)"
  type        = list(string)
}

variable "allowed_security_group_ids" {
  description = "Security group IDs allowed to reach DocumentDB on port 27017 (typically the EKS node SG)"
  type        = list(string)
}

variable "master_username" {
  description = "Master username for the DocumentDB cluster"
  type        = string
  default     = "fsw_admin"
}

variable "master_password" {
  description = "Master password — pass via a tfvars file or secret manager, NEVER hardcode"
  type        = string
  sensitive   = true
}

variable "engine_version" {
  description = "DocumentDB engine version"
  type        = string
  default     = "5.0.0"
}

variable "instance_class" {
  description = "Instance class for DocumentDB nodes (smallest: db.t3.medium)"
  type        = string
  default     = "db.t3.medium"
}

variable "instance_count" {
  description = "Number of DocumentDB instances (1 primary + N replicas)"
  type        = number
  default     = 1
}

variable "backup_retention_period" {
  description = "Days to retain automated backups"
  type        = number
  default     = 7
}

variable "kms_key_arn" {
  description = "Optional KMS key ARN for storage encryption (default uses AWS-managed key)"
  type        = string
  default     = null
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot when destroying (use false in prod)"
  type        = bool
  default     = true
}

variable "deletion_protection" {
  description = "Protect the cluster from accidental deletion"
  type        = bool
  default     = false
}

variable "apply_immediately" {
  description = "Apply changes immediately rather than waiting for the next maintenance window"
  type        = bool
  default     = true
}
