# -----------------------------------------------------------------------------
# Security group — allow MongoDB (port 27017) from the EKS node SG only
# -----------------------------------------------------------------------------
resource "aws_security_group" "this" {
  name        = "${var.project_name}-${var.environment}-docdb"
  description = "Allow MongoDB access from EKS worker nodes"
  vpc_id      = var.vpc_id

  ingress {
    description     = "MongoDB from EKS nodes"
    from_port       = 27017
    to_port         = 27017
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
    Name        = "${var.project_name}-${var.environment}-docdb-sg"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

# -----------------------------------------------------------------------------
# Subnet group — span across the private subnets for HA
# -----------------------------------------------------------------------------
resource "aws_docdb_subnet_group" "this" {
  name        = "${var.project_name}-${var.environment}-docdb"
  description = "DocumentDB subnet group for ${var.project_name} ${var.environment}"
  subnet_ids  = var.private_subnet_ids

  tags = {
    Name        = "${var.project_name}-${var.environment}-docdb-subnet-group"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

# -----------------------------------------------------------------------------
# DocumentDB cluster parameter group — enable TLS and audit logs
# -----------------------------------------------------------------------------
resource "aws_docdb_cluster_parameter_group" "this" {
  name        = "${var.project_name}-${var.environment}-docdb"
  family      = "docdb5.0"
  description = "DocumentDB parameter group for ${var.project_name} ${var.environment}"

  parameter {
    name  = "tls"
    value = "enabled"
  }

  parameter {
    name  = "audit_logs"
    value = "enabled"
  }

  parameter {
    name  = "profiler"
    value = "enabled"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

# -----------------------------------------------------------------------------
# DocumentDB cluster
# -----------------------------------------------------------------------------
resource "aws_docdb_cluster" "this" {
  cluster_identifier              = "${var.project_name}-${var.environment}-docdb"
  engine                          = "docdb"
  engine_version                  = var.engine_version
  master_username                 = var.master_username
  master_password                 = var.master_password
  backup_retention_period         = var.backup_retention_period
  preferred_backup_window         = "07:00-09:00"
  preferred_maintenance_window    = "sun:09:00-sun:10:00"
  db_subnet_group_name            = aws_docdb_subnet_group.this.name
  vpc_security_group_ids          = [aws_security_group.this.id]
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.this.name
  storage_encrypted               = true
  kms_key_id                      = var.kms_key_arn
  skip_final_snapshot             = var.skip_final_snapshot
  deletion_protection             = var.deletion_protection
  apply_immediately               = var.apply_immediately

  enabled_cloudwatch_logs_exports = ["profiler", "audit"]

  tags = {
    Name        = "${var.project_name}-${var.environment}-docdb"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

# -----------------------------------------------------------------------------
# Cluster instances — spread across AZs
# -----------------------------------------------------------------------------
resource "aws_docdb_cluster_instance" "this" {
  count = var.instance_count

  identifier         = "${var.project_name}-${var.environment}-docdb-${count.index + 1}"
  cluster_identifier = aws_docdb_cluster.this.id
  instance_class     = var.instance_class
  engine             = "docdb"
  promotion_tier     = count.index == 0 ? 0 : 1

  tags = {
    Name        = "${var.project_name}-${var.environment}-docdb-${count.index + 1}"
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}
