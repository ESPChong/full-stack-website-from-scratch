# -----------------------------------------------------------------------------
# Security group — allow Redis (port 6379) from the EKS node SG only
# -----------------------------------------------------------------------------
resource "aws_security_group" "this" {
  name        = "${var.project_name}-${var.environment}-redis"
  description = "Allow Redis access from EKS worker nodes"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Redis from EKS nodes"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-redis-sg"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

# -----------------------------------------------------------------------------
# Subnet group — span across private subnets for HA
# -----------------------------------------------------------------------------
resource "aws_elasticache_subnet_group" "this" {
  name        = "${var.project_name}-${var.environment}-redis"
  description = "ElastiCache subnet group for ${var.project_name} ${var.environment}"
  subnet_ids  = var.private_subnet_ids

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

# -----------------------------------------------------------------------------
# Replication group — Redis with automatic failover across AZs
# -----------------------------------------------------------------------------
resource "aws_elasticache_replication_group" "this" {
  replication_group_id = "${var.project_name}-${var.environment}"
  description          = "Redis replication group for ${var.project_name} ${var.environment}"

  engine                     = "redis"
  engine_version             = var.engine_version
  node_type                  = var.node_type
  num_cache_clusters         = var.cluster_size
  multi_az_enabled           = var.multi_az_enabled
  automatic_failover_enabled = var.multi_az_enabled

  parameter_group_name = var.parameter_group_name

  subnet_group_name  = aws_elasticache_subnet_group.this.name
  security_group_ids = [aws_security_group.this.id]

  # ----- Security -----
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.auth_token

  # ----- Snapshots -----
  snapshot_retention_limit = var.snapshot_retention_limit
  snapshot_window          = "07:00-09:00"
  maintenance_window       = "sun:09:00-sun:10:00"

  # ----- Behaviour -----
  apply_immediately = true

  tags = {
    Name        = "${var.project_name}-${var.environment}-redis"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}
