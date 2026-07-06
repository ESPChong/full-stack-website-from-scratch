variable "project_name" {
  description = "Short project identifier used as a prefix on all resources"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
}

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.30"
}

variable "vpc_id" {
  description = "ID of the VPC where the cluster will be deployed"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for the EKS cluster and node groups"
  type        = list(string)
}

variable "api_access_cidrs" {
  description = "CIDR blocks allowed to reach the EKS public API endpoint"
  type        = list(string)
  default     = ["0.0.0.0/0"]

  # For prod: restrict to your office/VPN CIDR, e.g. ["203.0.113.10/32"]
}

variable "cluster_endpoint_public_access" {
  description = "Whether the EKS API server is reachable from the public internet"
  type        = bool
  default     = true
}

# ----- Node group configuration -----
variable "node_instance_type" {
  description = "EC2 instance type for EKS worker nodes"
  type        = string
  default     = "t3.medium"
}

variable "node_capacity_type" {
  description = "Capacity type for node group: ON_DEMAND (stable) or SPOT (cheaper, can be reclaimed)"
  type        = string
  default     = "ON_DEMAND"

  validation {
    condition     = contains(["ON_DEMAND", "SPOT"], var.node_capacity_type)
    error_message = "node_capacity_type must be ON_DEMAND or SPOT."
  }
}

variable "node_min_size" {
  description = "Minimum number of nodes (for autoscaling)"
  type        = number
  default     = 1
}

variable "node_max_size" {
  description = "Maximum number of nodes (for autoscaling)"
  type        = number
  default     = 4
}

variable "node_desired_size" {
  description = "Desired (initial) number of nodes"
  type        = number
  default     = 2
}

variable "node_disk_size_gb" {
  description = "EBS volume size (GB) for each worker node"
  type        = number
  default     = 50
}
