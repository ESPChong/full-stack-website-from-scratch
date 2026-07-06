# Terraform — AWS Infrastructure as Code

This directory provisions the AWS infrastructure for the **Full Stack Website**
project. The code is organised into **reusable modules** and **environment
compositions**:

```
terraform/
├── modules/                 # Reusable, environment-agnostic building blocks
│   ├── vpc/                 # VPC + public/private subnets + NAT gateways
│   ├── ecr/                 # ECR repository + lifecycle policy
│   ├── eks/                 # EKS cluster (uses terraform-aws-modules/eks)
│   ├── documentdb/          # DocumentDB (MongoDB-compatible) cluster
│   └── elasticache/         # ElastiCache (Redis) replication group
└── environments/            # One folder per environment
    └── dev/                 # Dev environment composition
```

## Current status

> **Status: Infrastructure-as-Code only — NOT deployed.**

The scripts are complete and pass `terraform validate`, but have **not been
applied** to a real AWS account. This is a deliberate decision to avoid the
~USD 150–200/month baseline cost of EKS + DocumentDB + ElastiCache. See the
main project README for the cost breakdown and free-tier alternatives.

## Prerequisites (only needed when you actually deploy)

- Terraform >= 1.5
- AWS CLI v2 with credentials configured (`aws configure`)
- An AWS account with permission to create VPC, EKS, ECR, DocumentDB,
  ElastiCache, and IAM resources

## Workflow

```bash
cd terraform/environments/dev

# 1. Initialise providers and download modules
terraform init

# 2. Copy and fill in secrets
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — set docdb_password and redis_auth_token

# 3. Format and validate (run before every commit)
terraform fmt -recursive
terraform validate

# 4. Preview what would change — ALWAYS read this carefully
terraform plan -out=tfplan

# 5. Apply (only when ready to spend money)
terraform apply tfplan

# 6. Get kubeconfig for kubectl
aws eks update-kubeconfig --region ap-southeast-1 --name fsw-dev

# 7. Inspect outputs
terraform output

# 8. Tear everything down (stops ongoing charges)
terraform destroy
```

## Bootstrapping remote state (one-time, manual)

Before the first real `terraform apply`, create the S3 bucket and DynamoDB lock
table, then uncomment the `backend "s3"` block in `environments/dev/versions.tf`:

```bash
aws s3api create-bucket \
  --bucket fsw-tf-state \
  --region ap-southeast-1 \
  --create-bucket-configuration LocationConstraint=ap-southeast-1

# Enable versioning on the state bucket (recommended)
aws s3api put-bucket-versioning \
  --bucket fsw-tf-state \
  --versioning-configuration Status=Enabled

aws dynamodb create-table \
  --table-name tf-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

## Modules at a glance

| Module | Creates | Approx. Monthly Cost (idle) |
|---|---|---|
| `vpc` | VPC, 2× public + 2× private subnets, 2× NAT gateway, IGW, route tables | ~$64 (mostly NAT gateways) |
| `ecr` | ECR repository with scan-on-push + lifecycle policy | ~$1 (within free tier) |
| `eks` | EKS control plane + 2× t3.medium managed node group | ~$133 ($73 control plane + ~$60 nodes) |
| `documentdb` | DocumentDB cluster (1× db.t3.medium) | ~$30 |
| `elasticache` | Redis replication group (2× cache.t3.micro, Multi-AZ) | ~$24 |
| **Total (idle)** | | **~$252/month** |

> Costs are approximate, Singapore region, as of 2024. Real usage will add
> data transfer, storage growth, and snapshot storage on top.

## Free-tier alternatives (when a live deployment is needed)

| AWS (paid) | Free alternative |
|---|---|
| EKS + EC2 nodes | Fly.io free tier (3 shared VMs) or Oracle Cloud Always-Free + `k3s` |
| ECR | GitHub Container Registry (free for public) or Docker Hub |
| DocumentDB | MongoDB Atlas M0 (512 MB, free forever) |
| ElastiCache | Upstash Redis (10,000 commands/day free) |
