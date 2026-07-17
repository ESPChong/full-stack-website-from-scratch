# Full Stack Website

- Written from scratch

- With AI assisted coding

---

# URL Shortener — Cache-First Redirect Engine

A production-ready full-stack URL shortener with Redis cache-first redirection, async click analytics pipeline (BullMQ), and an analytics dashboard built with Next.js and Recharts.

## Architecture

```
Browser
  │
  ▼
┌─────────────┐      ┌─────────────┐
│   Nginx     │◄────►│  Frontend   │
│  :80        │      │  Next.js    │
│  rate limit │      │  :3000      │
│  gzip       │      └─────────────┘
└──────┬──────┘
       │ /api/* & /:code
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Backend    │     │  MongoDB    │     │  Redis      │
│  Express    │◄───►│  :27017     │◄───►│  :6379      │
│  ×2 :5001   │     │  Urls+Clicks│     │  url:{code} │
└──────┬──────┘     └──────▲──────┘     └─────────────┘
       │ fire-and-forget    │
       ▼                    │
┌─────────────┐             │
│  Worker     │─────────────┘
│  BullMQ     │ batch insert
│  clickWorker│ 100/5s
└─────────────┘
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js ≥20

### Run locally
```bash
git clone <this-repo>
cd url-shortener
docker compose up -d --build
```

Open [http://localhost:8080](http://localhost:8080).

## API Reference

### Create Short URL
```http
POST /api/urls
Content-Type: application/json

{
  "url": "https://example.com/very/long/path",
  "customCode?": "my-link",        // optional, 4-12 chars [a-zA-Z0-9_-]
  "expiresInDays?": 30             // optional, 1-365
}
```
**Response 201:**
```json
{ "success": true, "data": { "shortCode": "abc123", "shortUrl": "abc123", ... } }
```
**Response 409:** Code already taken.  
**Response 400:** Validation error.

### Redirect (public)
```http
GET /:code
```
→ **302** to original URL (Redis cache-first, <5ms p95)  
→ **404** if not found  
→ **410** if expired

### List URLs (paginated)
```http
GET /api/urls?page=1&limit=20
```

### Get Single URL
```http
GET /api/urls/:code
```

### Analytics — Overview
```http
GET /api/urls/:code/stats/overview
```
```json
{ "totalClicks": 42, "uniqueIPs": 15, "last7Days": 30, "last30Days": 42 }
```

### Analytics — Timeseries
```http
GET /api/urls/:code/stats/timeseries?range=7d|30d
```

### Analytics — Geo
```http
GET /api/urls/:code/stats/geo
```

### Analytics — Devices
```http
GET /api/urls/:code/stats/devices
```
Returns `deviceTypes`, `browsers`, `oss` arrays.

### Analytics — Referrers
```http
GET /api/urls/:code/stats/referrers
```

### Health
```http
GET /api/health → 200 { "status": "healthy" }
GET /api/ready → 200 { "message": "Backend is successfully connected!" }
```

## Performance (k6 Load Test)

| Scenario | Rate | p95 Latency | Threshold |
|----------|------|-------------|-----------|
| Redis hit redirect | 100 RPS | **4.22ms** | <30ms ✅ |
| Mongo fallback | 100 RPS | 3.73ms | <200ms ✅ |
| Create URLs | 50 RPS | 4.90ms | — |

Run: `k6 run loadtests/redirect.js -e BASE_URL=http://localhost:8080 -e SHORT_CODE=yourcode`

## Services

| Service | Port | Container |
|---------|------|-----------|
| Nginx (reverse proxy) | 8080→80 | local-nginx |
| Next.js Frontend | 3000 | local-frontend |
| Express Backend ×2 | 5001 | backend-1, backend-2 |
| Click Worker (BullMQ) | — | local-click-worker |
| MongoDB 8.2 | 27017 | local-mongo |
| Redis (Alpine) | 6379 | local-redis |

## Development

```bash
# Install deps
npm install

# Run tests
npm test -w backend       # 43 unit + integration tests
npm test -w frontend      # Frontend component tests

# Coverage
npm test -w backend -- --coverage   # ≥85% target

# Lint
npm run -w backend lint
npm run -w frontend lint
```

## Production Deployment

1. **Set environment variables** in CI secrets:
   - `GITLEAKS_LICENSE` (for Gitleaks secret scanning)
2. **Configure ECR** repository and update the `deploy` job environment.
3. **Update `CORS_ORIGIN`** in `docker-compose.yaml` to your frontend domain.
4. **Set `NODE_ENV=production`** in Docker Compose environment.
5. **Run:**
   ```bash
   docker compose -f docker-compose.yaml up -d --build
   ```

### Security Hardening
- All Docker containers run as non-root (`USER node`, uid=1000)
- Helmet security headers (CSP, HSTS, X-Frame-Options, etc.)
- Nginx rate limiting: API 2r/s, redirects 100r/s burst=200
- Per-endpoint Express rate limits: POST 30/15min, GET 200/min
- Request ID middleware for log correlation
- gzip/brotli compression
- CI: Gitleaks secret scan, Semgrep SAST, Trivy image scan, npm audit

## Project Structure

```
├── backend/
│   ├── config/          DB, Redis, BullMQ queue
│   ├── models/          Mongoose: Url, Click
│   ├── routes/          API: urls, redirect, stats
│   ├── utils/           Redis cache helpers
│   ├── validators/      Zod schemas
│   ├── workers/         BullMQ clickWorker
│   ├── app.js           Express app (routes + inline stats)
│   └── server.js        Entry point + graceful shutdown
├── frontend/
│   └── app/             Next.js App Router pages
│       ├── page.tsx     Landing page + shorten form
│       └── dashboard/   URL list + analytics dashboard
├── loadtests/           k6 scripts + results
├── nginx/               Nginx configuration
├── docker-compose.yaml  Service orchestration
└── .github/workflows/   CI/CD pipeline
```

---

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

## Current deployment status of Infrastructure as Code

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