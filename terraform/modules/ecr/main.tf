# -----------------------------------------------------------------------------
# ECR Repository — stores Docker images for the Next.js app, nginx, etc.
# -----------------------------------------------------------------------------
resource "aws_ecr_repository" "this" {
  name                 = "${var.project_name}/${var.environment}"
  image_tag_mutability = var.image_tag_mutability
  force_delete         = var.force_delete

  image_scanning_configuration {
    scan_on_push = var.scan_on_push
  }

  encryption_configuration {
    encryption_type = var.encryption_type
  }

  tags = {
    Name        = "${var.project_name}/${var.environment}"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

# -----------------------------------------------------------------------------
# Lifecycle policy — keeps costs down by pruning old/untagged images
# -----------------------------------------------------------------------------
resource "aws_ecr_lifecycle_policy" "this" {
  repository = aws_ecr_repository.this.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last ${var.keep_tagged_images} tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = var.tag_prefixes_to_keep
          countType     = "imageCountMoreThan"
          countNumber   = var.keep_tagged_images
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Delete untagged images older than ${var.untagged_retention_days} days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = var.untagged_retention_days
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
