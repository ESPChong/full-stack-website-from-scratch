resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.project_name}-${var.environment}-vpc"
  }
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
}

resource "aws_subnet" "public" {
  for_each = toset(var.availability_zones)

  vpc_id                  = aws_vpc.this.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, index(var.availability_zones, each.value))
  availability_zone       = each.value
  map_public_ip_on_launch = true

  tags = { Name = "${var.project_name}-${var.environment}-public-${each.value}" }
}

resource "aws_subnet" "private" {
  for_each = toset(var.availability_zones)

  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, index(var.availability_zones, each.value) + 8)
  availability_zone = each.value

  tags = { Name = "${var.project_name}-${var.environment}-private-${each.value}" }
}

resource "aws_security_group" "eks_nodes" {
  name        = "${var.project_name}-${var.environment}-eks-nodes"
  vpc_id      = aws_vpc.this.id

  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}