variable "project_name" {
  description = "Short project identifier used as a prefix on all resources"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}

variable "image_tag_mutability" {
  description = "Whether image tags can be overwritten (MUTABLE) or not (IMMUTABLE)"
  type        = string
  default     = "MUTABLE"

  validation {
    condition     = contains(["MUTABLE", "IMMUTABLE"], var.image_tag_mutability)
    error_message = "image_tag_mutability must be MUTABLE or IMMUTABLE."
  }
}

variable "scan_on_push" {
  description = "Scan images for vulnerabilities on push"
  type        = bool
  default     = true
}

variable "encryption_type" {
  description = "Encryption type for ECR (AES256 or KMS)"
  type        = string
  default     = "AES256"
}

variable "force_delete" {
  description = "Delete repository even if it contains images (use only in dev)"
  type        = bool
  default     = true
}

variable "keep_tagged_images" {
  description = "Number of tagged images to retain"
  type        = number
  default     = 10
}

variable "untagged_retention_days" {
  description = "Days to retain untagged images before deletion"
  type        = number
  default     = 3
}

variable "tag_prefixes_to_keep" {
  description = "Image tag prefixes considered for the keep-tagged rule"
  type        = list(string)
  default     = ["v", "sha-", "latest", "main", "dev"]
}
