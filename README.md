# Full Stack Website

- Written from scratch

- Without AI generated code


## Cloud Infrastructure

This project uses Terraform to define AWS infrastructure as code. The Terraform source lives in /terraform and is organised into reusable modules under terraform/modules/ and environment-specific compositions under terraform/environments/.

  
## Planned AWS architecture (production target)

The Terraform code provisions the following resources when applied:

| Layer              | AWS Service              | Module                | Purpose                                                     |
| ------------------ | ------------------------ | --------------------- | ----------------------------------------------------------- |
| Networking         | VPC, Subnets, IGW, SGs   | `modules/vpc`         | Isolated network with public + private subnets across 2 AZs |
| Container Registry | ECR                      | `modules/ecr`         | Private Docker image storage with lifecycle policies        |
| Compute            | EKS + managed node group | `modules/eks`         | Kubernetes control plane + worker nodes                     |
| Database           | DocumentDB               | `modules/documentdb`  | Managed MongoDB-compatible cluster                          |
| Cache              | ElastiCache (Redis)      | `modules/elasticache` | Managed Redis replication group                             |

## Current deployment status

Status: Infrastructure-as-Code only — not deployed.

The Terraform scripts are complete and validated (terraform validate passes) but have not been applied to a real AWS account. This is a deliberate decision.

The recommended AWS stack (EKS + DocumentDB + ElastiCache) carries a baseline cost of approximately USD 150–200/month even when idle, because:

- **EKS control plane**: ~$73/month flat (no free tier)
- **NAT Gateway**: ~$32/month + data transfer
- **Application Load Balancer**: ~$16/month
- **DocumentDB**: ~$30–60/month minimum instance
- **ElastiCache**: ~$12–15/month minimum

AWS Free Tier covers EC2, S3, and RDS, but does not cover EKS, DocumentDB, or ElastiCache.

The Terraform code is preserved as the production target architecture and as a learning artifact for Infrastructure-as-Code best practices.

## How to Deploy in Future

**Bootstrap state storage (one-time, manual):**

aws s3api create-bucket --bucket fsw-tf-state --region ap-southeast-1aws dynamodb create-table \ --table-name tf-locks \ --attribute-definitions AttributeName=LockID,AttributeType=S \ --key-schema AttributeName=LockID,KeyType=HASH \ --billing-mode PAY_PER_REQUEST

**Configure AWS credentials:**

aws configure

Set secrets (never commit these):

cp terraform/environments/dev/terraform.tfvars.example \ terraform/environments/dev/terraform.tfvars# Edit terraform.tfvars and set docdb_password

**Plan and apply:**

cd terraform/environments/devterraform initterraform plan -out=tfplanterraform apply tfplan

Tear down when done (to stop charges):

terraform destroy

## Free alternatives (for future live deployment)

When a live deployment is needed without cost, swap the managed AWS servicesfor free-tier equivalents:

AWS (paid) Free alternative

EKS Fly.io free tier (3 shared VMs) or self-host k3s on Oracle Cloud Always-Free

ECR GitHub Container Registry (free for public) or Docker Hub

DocumentDB MongoDB Atlas M0 (512 MB, free forever)

ElastiCache Upstash Redis (10,000 commands/day free)