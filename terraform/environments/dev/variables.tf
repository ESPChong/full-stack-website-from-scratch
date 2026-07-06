variable "aws_region" {
  type    = string
  default = "ap-southeast-1"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "project_name" {
  type    = string
  default = "fsw"
}

variable "cluster_version" {
  type    = string
  default = "1.30"
}

variable "node_instance_type" {
  type    = string
  default = "t3.medium"
}