# DDMS Backend Scaffold

This folder houses the Node.js + TypeScript API for the Dealer & Distributor Management System (see `../docs/SDS.md`).

## Stack
- Express + TypeScript
- PostgreSQL (pg pool)
- Zod validation, Pino logging
- JWT auth (Bearer tokens)
- Background workers via `node-cron`

## Available API Domains
- `/auth` — register/login (distributor/dealer) and issue JWTs.
- `/orders` — primary orders (create, list, status transitions, returns, credit-hold queue).
- `/inventory` — warehouse snapshots & adjustments (scoped by distributor).
- `/credit` — ledgers, credit holds, payment logging.
- `/schemes` — scheme config, claim submission, eligibility checks.
- `/secondary-sales` — distributor→retailer sell-out capture.
- `/visits` — field rep visit logging (field_rep role only).
- `/analytics` — KPI summaries (GMV, fill rate, return rates).
- `/notifications` — recent payment-reminder notifications.
- `/reminders` worker — hourly cron (`npm run reminders`) sending payment reminders and logging them.

All non-auth routes require `Authorization: Bearer <token>`.

## API Usage

### Orders
- `GET /api/v1/orders?status=submitted` (admins include `distributorId`).
- `POST /api/v1/orders` — auto credit-hold if limit exceeded.
- `POST /api/v1/orders/:id/returns` — delivered orders only.
- `GET /api/v1/orders/credit-holds` (admin).
- `POST /api/v1/orders/:id/release-hold` (admin).
- `GET /api/v1/orders/returns` — list returns (auto-scoped to distributor; admin filters by `distributorId`).

### Inventory
- `GET /api/v1/inventory/snapshots?warehouseId=...`
- `POST /api/v1/inventory/adjustments`

### Credit
- `GET /api/v1/credit/:distributorId/ledger`
- `POST /api/v1/credit/holds` / `/payments`

### Schemes
- `GET /api/v1/schemes?status=active`
- `POST /api/v1/schemes`
- `POST /api/v1/schemes/claims`
- `POST /api/v1/schemes/:schemeId/eligibility`

### Secondary Sales
- `GET /api/v1/secondary-sales`
- `POST /api/v1/secondary-sales`

### Field Visits
- `GET /api/v1/visits`
- `POST /api/v1/visits`
- `POST /api/v1/visits/:id/complete`

### Notifications
- `GET /api/v1/notifications?distributorId=...` (admin must supply distributor; others auto-scoped).

## Local Development
```bash
cp .env.example .env
npm install
npm run migrate      # runs Knex migrations (version table + checksums)
npm run seed         # NODE_ENV-aware seed set (dev/test/prod)
npm run dev
```

- Database migrations are powered by Knex (`knex/migrations`). Each SQL release has an _up/down_ pair and an entry in `_app_migrations`.
- Seeds live under `knex/seeds/<env>` so dev/test/prod data stay isolated. Set `NODE_ENV=test` before running `npm run seed` to hydrate CI databases.
- `.env.example` documents every required variable; validation happens at boot via Zod so the API fails fast if something is missing.
- Rotate critical secrets from GCP Secret Manager with `npm run secrets:rotate` (requires `SECRET_MANAGER_PREFIX` and gcloud auth).

### Background Job & Notifications
```bash
npm run reminders
```
Runs the hourly payment-reminder cron. `sendNotification` currently logs to console; wire up email/SMS/push providers for production.

## Testing
```bash
npm test
```
Runs Vitest suites for service-layer logic (orders, inventory, credit). Expand coverage for new modules.

## Auth & Security Enhancements
- `/auth/login` now issues short-lived access tokens and rotating refresh tokens (stored hashed in `auth_refresh_tokens`).
- `/auth/refresh` & `/auth/logout` manage refresh tokens; all routes enforce redis-backed rate limiting.
- MFA enrollment/verification endpoints (`/auth/mfa/*`) support TOTP or SMS (Twilio). Audit logs capture every auth action.
- Password reset flow uses signed tokens + SendGrid (falls back to log output if unset).
- Secret rotation script syncs JWT/refresh/reset secrets from GCP Secret Manager.
- Identity verification now captures Aadhaar, PAN, bank info, optional UPI, scanned documents, and live face captures. Sensitive fields are encrypted via AES-256-GCM (`PII_ENCRYPTION_KEY`) and supporting artifacts are stored under `uploads/`.
- Email/SMS OTP verification flows (`/auth/verify-email`, `/auth/verify-phone`, `/auth/verification/resend`) enforce contact validation using SendGrid/Twilio.
- Face liveness checks leverage Google Cloud Vision when `GOOGLE_APPLICATION_CREDENTIALS` is configured; otherwise submissions fall back to manual review status.
- All India PIN-code master data can be synced via `npm run sync:pincodes` (requires `DATA_GOV_API_KEY`). Registrations now collect one or more PIN-codes per account and store them under `user_pin_assignments`.
- Every new distributor/dealer/field rep starts in `approval_status=pending`. Superadmins review via `/admin/approvals` endpoints before credentials become active.

## Production Checklist
- Harden RBAC on every route (middleware + per-module guards).
- Expand tests (unit, integration, E2E).
- Wire real notification channels + preferences.
- Containerize + add CI/CD (Docker/K8s, Terraform).
- Implement ERP/CRM integrations & observability stack (logs/metrics/traces).
- Add security scanning, rate limiting, and incident runbooks.

Refer to `../docs/SDS.md` for the full requirements, data model, and rollout roadmap. Extend modules under `src/modules/` following the domain-driven structure already in place.
