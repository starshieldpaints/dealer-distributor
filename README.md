# Dealer & Distributor Management System (DDMS)

This repository contains the product vision, MVP software design specification, and a TypeScript/Node.js reference implementation scaffold for a dealer & distributor management platform. The goal is to provide a production-ready blueprint that teams can extend into full web/mobile applications (React + React Native) backed by a scalable API-first backend.

## Repository Structure
| Path | Description |
| --- | --- |
| `docs/SDS.md` | Full MVP Software Design Specification (requirements, data model, APIs, NFRs). |
| `backend/` | Node.js (TypeScript + Express) service scaffolding with modular domains (orders, inventory, credit, schemes, analytics). |
| `frontend/` | React + Vite single-page app covering HQ, distributor, and field personas with dashboards and workflow UIs. |

## Tech Stack (Recommended)
- **Web Admin Portal:** React (Next.js) + Material UI, service worker for offline caching.
- **Field & Distributor Mobile Apps:** React Native + SQLite/WatermelonDB + FCM/APNS for sync & notifications.
- **Backend Services:** Node.js (NestJS/Express) with PostgreSQL, Redis, Prisma ORM, Kafka/SQS for async workflows.
- **Infrastructure:** Docker/Kubernetes, AWS/GCP/Azure managed PostgreSQL, Redis, object storage, OpenTelemetry observability.

## Getting Started

### Backend API
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

The scaffold provides:
- Domain-driven folder structure with controllers, services, repositories, and validation schemas.
- PostgreSQL access via `pg` pool (replace with Prisma/Knex if preferred).
- Centralized config, logging (pino), request validation (zod), health checks, and error handling middleware.
- Sample routes for orders, inventory, credit, schemes, secondary sales, and analytics.
- Catalog/distributor APIs now expose onboarding flows for distributors, retailers, products, price lists, and warehouses while integration endpoints cover webhook registration/dispatch aligned to the SDS events (`order.*`, `payment.collected`, `stock.updated`).
- `/api/v1/auth/register` + `/api/v1/auth/login` issue JWTs; include `Authorization: Bearer <token>` on all other endpoints.
- Run `npm run migrate && npm run seed` to hydrate territories, distributors, warehouses, retailers, price lists, catalog SKUs, and default ERP/CRM webhooks so the catalog/onboarding endpoints have real data to operate on.
- Use `npm run register-webhooks` (configurable via `API_BASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`) against a running backend to register ERP/CRM webhook URLs through the `/api/v1/integrations/webhooks` endpoint.
- Security hardening now includes strong password policies, RBAC-backed permission middleware, audit logging (`audit_logs` table), express-rate-limit + WAF middleware, and sanitised input validation across every route.

### Frontend Web App
```bash
cd frontend
npm install
npm run dev
```

- React Router drives multi-surface navigation (dashboard, orders, inventory, credit, schemes, field ops, integrations).
- Zustand manages UI/auth state (JWT-backed login/registration) and React Query handles API calls; mock data keeps the UI functional until backend endpoints are fully implemented.
- CSS modules + global tokens implement the dark control-center aesthetic described in the SDS.

### Containerized Local Stack
```bash
cp infrastructure/docker/.env.example infrastructure/docker/.env
docker compose --env-file infrastructure/docker/.env up --build
```

This launches Postgres, Redis, the backend API, and the React SPA with the same artifacts that flow into the production pipeline.

### Security Middleware Snapshot
- Global `/api/v1` rate limiting plus tighter auth throttling using `express-rate-limit` and `hpp`.
- Custom request-shield WAF middleware blocks SQL/XSS payloads before hitting the routers.
- RBAC permissions (`src/lib/permissions.ts`) guard every sensitive endpoint via `requirePermission(...)`.
- Audit logs persist high-value actions (logins, integrations, orders, inventory, credit events) in the `audit_logs` table for compliance.

## Infrastructure & Operations
- **Helm chart** (`infrastructure/helm/ddms`) packages the backend + frontend workloads, TLS-enabled ingress, autoscaling, network policies, and alerting rules.
- **Terraform** (`infrastructure/terraform`) provisions AWS networking, EKS, RDS, ElastiCache, cert-manager, ingress-nginx, kube-prometheus-stack, ExternalDNS, AWS Backup, and Velero-based disaster recovery.
- **CI/CD** (`.github/workflows/ci-cd.yml`) runs lint/tests on every change and, on merges to `main`, builds/pushes Docker images, applies Terraform, and deploys via Helm with secrets injected from GitHub Actions.
- **Docs**: see `docs/infrastructure.md` for the full runbook (TLS termination, load balancing, monitoring, alerting, automated backups, and DR flow).

## Next Steps to Reach Production
1. Flesh out database migrations (Prisma, Sequelize, or Flyway) based on entities defined in `docs/SDS.md`.
2. Build React/React Native clients that consume the backend APIs, implement offline-first sync, and design UX around beat plans, scheme claims, and analytics dashboards.
3. Implement auth & RBAC (e.g., Auth0/Keycloak) and enforce JWT scopes across the API.
4. Add automated testing, CI/CD pipelines, and infrastructure-as-code templates (Terraform/CloudFormation) following the deployment plan outlined in the SDS.
5. Integrate ERP/CRM connectors and monitoring/alerting stacks to operate in production with 99.5%+ availability.

Refer to `docs/SDS.md` for detailed requirements, architecture, testing strategy, and roadmap. Extend the scaffold by adding more modules (returns, payments, notifications) and hooking up the UI clients to deliver a complete DDMS experience.
