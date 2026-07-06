// @ts-ignore

# ---------- Networking ----------
module "vpc" {
  source = "../../modules/vpc"

  project_name       = var.project_name
  environment        = var.environment
  vpc_cidr           = "10.0.0.0/16"
  availability_zones = ["ap-southeast-1a", "ap-southeast-1b"]
}

# ---------- Container Registry ----------
module "ecr" {
  source = "../../modules/ecr"

  project_name = var.project_name
  environment  = var.environment
}

# ---------- Kubernetes Cluster ----------
module "eks" {
  source = "../../modules/eks"

  project_name       = var.project_name
  environment        = var.environment
  cluster_version    = var.cluster_version
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  node_instance_type = var.node_instance_type
}

# ---------- DocumentDB (MongoDB-compatible) ----------
module "documentdb" {
  source = "../../modules/documentdb"

  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  instance_class     = "db.t3.medium"
  master_username    = "fsw_admin"
  master_password    = var.docdb_password # from secrets, never hardcode
}

# ---------- ElastiCache (Redis) ----------
module "elasticache" {
  source = "../../modules/elasticache"

  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  node_type          = "cache.t3.micro"
}