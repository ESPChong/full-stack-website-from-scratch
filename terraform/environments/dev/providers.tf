provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "full-stack-website"
      Environment = var.environment
      ManagedBy   = "terraform"
      Repo        = "full-stack-website-from-scratch"
    }
  }
}