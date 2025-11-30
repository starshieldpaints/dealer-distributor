# Infrastructure & Operations Guide

This document captures the deployment architecture that now ships with the DDMS repository and explains how to operate it across local development, staging, and production.

## 1. Containerized Services

### Docker images
- `backend/Dockerfile` builds a production-ready Node.js container (multi-stage with `npm ci`, `tsc`, and a slim runtime).
- `frontend/Dockerfile` compiles the Vite SPA and serves it from hardened Nginx 1.27 (SPA-friendly config).
- `.dockerignore` files keep build contexts small and secrets out of images.

### Local orchestration
Run the whole stack (API, SPA, Postgres, Redis) with:

```bash
cp infrastructure/docker/.env.example infrastructure/docker/.env
docker compose --env-file infrastructure/docker/.env up --build
```

This spins up TLS-less local containers; TLS termination, load balancing, and monitoring are handled in Kubernetes as described below.

## 2. Kubernetes Workloads (Helm)

`infrastructure/helm/ddms` bundles both workloads:

| Template | Purpose |
| --- | --- |
| `backend-*.yaml` | Deployment, service, HPA, config, and secret for the API (health probes, autoscaling, JWT/db/redis secrets). |
| `frontend-*.yaml` | Stateless SPA deployment + service + HPA. |
| `ingress.yaml` | Dual-host ingress (`app.<domain>`, `api.<domain>`) with TLS issued by cert-manager/Let's Encrypt and routed through `ingress-nginx`. |
| `networkpolicy.yaml` | Locks ingress/egress so only approved pods can talk to DB/Redis. |
| `prometheusrule.yaml` | Alerts on ≥5% ingress 5xx rate and replica shortages. |

Usage:

```bash
# create a values override with secrets that should live outside git
cp infrastructure/helm/ddms/values.yaml my-values.yaml
# edit backend.secrets.*, ingress hosts, image tags, etc.
helm upgrade --install ddms infrastructure/helm/ddms -f my-values.yaml
```

## 3. Terraform Baseline

`infrastructure/terraform` provisions all cloud dependencies in AWS:

| Component | Highlights |
| --- | --- |
| VPC + subnets | Public/private topology with managed NAT and Kubernetes ELB tags. |
| EKS | v1.30 control plane, IRSA enabled, autoscaling managed node group. |
| Data tier | Multi-AZ PostgreSQL 16 (RDS) + encrypted Redis (ElastiCache) with security groups constrained to worker nodes. |
| Edge | `ingress-nginx`, AWS Load Balancer Controller, ExternalDNS, cert-manager (Let's Encrypt ClusterIssuer). |
| Observability | `kube-prometheus-stack` with Alertmanager Slack hook + Grafana ingress. |
| Backups & DR | AWS Backup plan for RDS snapshots, Velero + dedicated S3 bucket for cluster state/volume snapshots (scheduled nightly). |

Usage:

```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
# set AWS_REGION, root_domain, DB creds, Slack webhook, etc.
terraform init
terraform plan
terraform apply
```

> **Secrets**: never commit `terraform.tfvars`. Use `TF_VAR_database_password` env vars or a secrets manager when running Terraform remotely (the CI workflow expects AWS credentials in GitHub secrets).

## 4. CI/CD Pipeline (GitHub Actions)

Workflow: `.github/workflows/ci-cd.yml`

| Stage | Description |
| --- | --- |
| `lint-test` | Runs ESLint + unit tests for backend & frontend on all pushes/PRs. |
| `docker-build-push` | On merges to `main`, builds backend/frontend images and pushes to the ECR repos defined in secrets. |
| `terraform` | Plans/applies the AWS infra on `main` pushes (Terraform Cloud-style approvals can be layered with GitHub Environments). |
| `deploy` | Fetches kubeconfig from EKS, renders Helm overrides from secrets (DB URLs, JWT secret, allowed origins) and upgrades the release. |

Expected secrets (GitHub → repository → Settings → Secrets and variables → Actions):

- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
- `ECR_BACKEND_REPO`, `ECR_FRONTEND_REPO`
- `FRONTEND_FQDN`, `API_FQDN`
- `POSTGRES_URL`, `REDIS_URL`, `JWT_SECRET`, `ALLOWED_ORIGINS`

Optional: `API_FQDN` also feeds the frontend Docker build arg so the SPA points at the right API host.

## 5. TLS & Load Balancing
- `cert-manager` installs CRDs + Let's Encrypt `ClusterIssuer` (email configurable via Terraform variable `ssl_contact_email`).
- `ingress-nginx` provides Layer-7 load balancing with cross-zone NLB, health checks, and metrics scraped by Prometheus.
- ExternalDNS programs Route53 records for the API & SPA hosts directly from Ingress definitions.

## 6. Monitoring, Alerting & Logging
- `kube-prometheus-stack` -> Prometheus, Alertmanager, Grafana, node exporters, kube-state-metrics.
- Grafana gets its own TLS ingress at `https://grafana.app.<domain>` (override in Terraform `locals` if desired).
- Alertmanager routes Slack notifications when `alertmanager_slack_webhook_url` is set; otherwise alerts land in a `devnull` receiver until you configure a destination.
- Application-level alerting currently leverages ingress metrics; instrumenting the backend with Prometheus metrics (or OpenTelemetry) is recommended for deeper insight.

## 7. Automated Backups & Disaster Recovery
- **Database**: AWS Backup plan keeps 30 days of encrypted RDS snapshots; automated retention period on the instance ensures PITR.
- **Redis**: ElastiCache nightly snapshots (see `aws_elasticache_replication_group` config).
- **Kubernetes**: Velero runs nightly backups (configurable cron) covering namespaces, CRDs, and persistent volumes into the dedicated, versioned S3 bucket (`<project>-<env>-velero-backups`), with IAM role limited to the bucket & EBS snapshot operations.
- **Recovery runbook** (high level):
  1. Restore latest RDS snapshot into a new instance and flip the connection string.
  2. Recreate Redis replication group from the automated snapshot.
  3. Use Velero to restore namespaces or individual apps (`velero restore create --from-backup ...`).
  4. Re-run Helm deploy (CI job) once data layers are restored.

## 8. Operational Tips
- Rotate JWT secrets and database credentials regularly; store them in AWS Secrets Manager or SSM Parameter Store and surface them to Helm via CI.
- Enable AWS GuardDuty + CloudTrail for security monitoring (outside scope of this PR but recommended).
- Consider splitting environments by Terraform workspace (`environment` variable) and GitHub environments (prod, staging) to gate applies/deploys.
- For blue/green deploys, leverage Helm's `--atomic` + `--wait` flags (already in the workflow) and set `backend.autoscaling.minReplicas >= 2`.

With these assets, the repo now covers the full lifecycle: Dockerized developer experience, reproducible infrastructure, Kubernetes deployments with TLS/LB, observability, automated backups, and CI/CD hooks to keep everything synchronized.
