# Dealer & Distributor Management System — MVP Software Design Specification

## 1. Overview
The Dealer & Distributor Management System (DDMS) is a B2B platform that lets manufacturers, distributors, and dealers collaborate across the order-to-cash lifecycle. The MVP targets three interfaces:

1. **Admin Web Portal (React PWA):** Operations team configures catalogs, pricing, territories, credit, schemes, and analytics.
2. **Distributor Web/Mobile Portal (React PWA + React Native):** Distributors review inventory, place/approve orders, manage ledgers, and submit claims.
3. **Field Sales App (React Native):** Sales reps capture orders, check-in/out via GPS, manage beat plans, and work offline.

The backend is an API-first Node.js (NestJS) service with PostgreSQL, Redis cache, and event-driven integrations for ERP/CRM. The MVP focuses on automated order & return handling, multi-tier hierarchy, inventory visibility, credit and scheme enforcement, analytics dashboards, and integration hooks.

## 2. Goals & Non-Goals
- **Goals**
  - Provide a real-time operational view of orders, stock, and payments across distributors.
  - Digitize order placement, approvals, returns, and scheme claim workflows.
  - Enable field reps to capture orders offline with geo-tagged visits.
  - Surface actionable analytics on performance, fill rate, and secondary sales.
  - Offer secure APIs for ERP/CRM synchronization.
- **Non-Goals**
  - Full accounting suite or ERP replacement.
  - Advanced warehouse automation (WMS, robotics).
  - Custom UI themes per tenant (phase 2).
  - AI-based demand forecasting (phase 2).

## 3. Stakeholders & Personas
| Persona | Responsibilities | Pain Points | MVP Focus |
| --- | --- | --- | --- |
| **Head of Distribution** | Oversees territories, KPIs | Limited insight, manual reconciliation | Dashboards, alerts, credit compliance |
| **Distributor** | Maintains inventory, orders | Stockouts, scheme claims | Portal for orders, ledger, claims |
| **Field Sales Rep** | Visits outlets, captures orders | Offline areas, route tracking | Offline-first app, GPS check-ins |
| **Finance Controller** | Credit approvals, payments | Lack of credit visibility | Credit ledger, automated reminders |
| **System Integrator** | Connects DMS to ERP/CRM | Fragile manual imports | REST/Webhook integrations, iPaaS ready |

## 4. User Stories (Selected)
- As a distributor, I can place and track orders/returns with real-time status.
- As a sales rep, I can capture orders offline and sync when connectivity resumes.
- As finance, I can configure credit limits and auto-hold orders exceeding limits.
- As marketing, I can define schemes/discounts and audit claims.
- As management, I can view fill rate, stock aging, and secondary sales trends.

## 5. Functional Requirements
1. **Order & Return Management**
   - Supports new orders, edits, cancellations, returns with workflows.
   - Enforces approval rules (amount, discount, credit limit).
   - Real-time synchronization through WebSockets/webhooks.
2. **Inventory Visibility**
   - Multi-warehouse stock levels with safety stock alerts.
   - Movement history and stock aging per SKU.
3. **Credit & Payment Management**
   - Per-distributor credit limit, outstanding balance, ledger.
   - Reminders, promises-to-pay tracking, payment collection logs.
4. **Secondary Sales Tracking**
   - Capture distributor-to-retailer transactions and map to territories.
5. **Scheme & Discount Management**
   - Configurable scheme templates (volume, combo, period).
   - Eligibility calculation during order placement; claim workflows.
6. **Geo-Tagged Field Force**
   - Beat plans, GPS check-ins, visit notes, distance validation.
   - Route adherence analytics.
7. **Offline-First Mobile Apps**
   - Queued transactions, delta sync, push notifications.
8. **Multi-Tier Hierarchy & RBAC**
   - Distributors → sub-distributors → retailers with scoped data access.
   - Role templates: Super Admin, Regional Manager, Distributor Admin, Field Rep.
9. **Analytics Dashboards**
   - KPIs: sales trends, fill rate, top SKUs, overdue credit, route adherence.
   - Export to CSV/PDF.
10. **Integrations**
    - ERP/CRM connectors via REST hooks, SFTP batch, or message bus.

## 6. Data Model (MVP Entities)
- `users` (id, name, email, role, distributor_id, geo_role, status, auth_provider)
- `distributors` (id, parent_id, code, territory_id, credit_limit, outstanding_balance)
- `retailers` (id, distributor_id, geo, channel, status)
- `products` (id, sku, name, uom, category_id, price_list_id, tax_group)
- `inventory_snapshots` (id, warehouse_id, product_id, qty_on_hand, qty_reserved, snapshot_ts)
- `orders` (id, distributor_id, retailer_id?, sales_rep_id, status, total_amount, currency, approver_id, credit_hold_flag, created_at)
- `order_items` (id, order_id, product_id, qty, unit_price, scheme_id?, discount_amount)
- `returns` (id, parent_order_id, reason, status, refund_amount, pickup_slot)
- `schemes` (id, name, type, formula, start_date, end_date, budget, geo_scope)
- `scheme_claims` (id, scheme_id, distributor_id, status, claimed_amount)
- `credit_ledgers` (id, distributor_id, txn_type, reference_id, debit, credit, balance_after, due_date)
- `visits` (id, sales_rep_id, retailer_id, check_in_time, check_in_geo, check_out_time, status)
- `secondary_sales` (id, distributor_id, retailer_id, product_id, qty, amount, sale_date)
- `integrations` (id, connector, credentials_ref, status, last_sync_ts)

Use PostgreSQL for relational data. Redis caches common catalog data (products, price lists, scheme metadata). Time-series metrics stream to ClickHouse or BigQuery in later phases.

## 7. System Architecture
- **Frontend Layer**
  - React admin portal (Next.js or Vite) with component library (MUI) and service worker for offline caching.
  - React Native mobile app with SQLite/WatermelonDB for offline queueing, background sync worker, push notifications via FCM/APNS.
- **Backend Layer**
  - NestJS services (Orders, Inventory, Payments, Schemes, Auth).
  - REST + GraphQL API gateway with JWT (Auth0 or Keycloak optional).
  - Event bus (Kafka or AWS SNS/SQS) for async workflows (inventory update, notifications).
- **Persistence**
  - PostgreSQL with Prisma ORM.
  - Redis for cache/session, S3-compatible storage for attachments (proof of delivery).
- **Integration Layer**
  - Webhooks, SFTP importer, and optional middleware (MuleSoft/Camel) connectors.
- **Observability**
  - OpenTelemetry for traces, Prometheus metrics, ELK stack for logs.

## 8. API Blueprint (Samples)
### Authentication
`POST /api/v1/auth/login` → JWT tokens; supports OAuth/SAML for enterprise.

### Orders
- `GET /api/v1/orders?status=open&distributorId=...`
- `POST /api/v1/orders` payload includes items, scheme codes, payment mode.
- `PATCH /api/v1/orders/{id}` for status transitions (approve/reject/dispatched/delivered).
- WebSocket topic `/orders/{distributorId}` for updates.

### Inventory
- `GET /api/v1/inventory/snapshots?warehouseId=...&sku=...`
- `POST /api/v1/inventory/adjustments` (bulk).

### Credit
- `GET /api/v1/credit-ledger/{distributorId}`
- `POST /api/v1/credit-hold/{orderId}`

### Schemes
- `POST /api/v1/schemes` for admins.
- `POST /api/v1/schemes/{id}/claims`

### Secondary Sales
- `POST /api/v1/secondary-sales/import` (CSV upload).

### Integrations
- `POST /api/v1/integrations/webhooks` register ERP endpoints.
- Outbound webhook events: `order.created`, `order.shipped`, `payment.collected`, `stock.updated`.

All APIs secured with OAuth2 scopes + per-role RBAC.

## 9. External Integrations
- **ERP (SAP, Oracle, MS Dynamics):** Push confirmed orders + returns; pull product master, price lists, tax codes.
- **CRM (Salesforce, Zoho):** Sync distributor contacts, opportunities.
- **Payment Gateways:** Stripe/Adyen for online collections.
- **Maps/Geo:** Google Maps/Mapbox for routing, geofencing.
- **Messaging:** Twilio/WhatsApp Business API for notifications (phase 2).

## 10. Non-Functional Requirements
- **Scalability:** Handle 10k concurrent mobile users, 50k orders/day, <3s P95 response.
- **Availability:** 99.5% MVP, target 99.9% with active-active deployment.
- **Security:** SOC2-ready controls, data encryption in transit (TLS 1.2+) and at rest (AES-256). Field device data encrypted via OS keystore.
- **Compliance:** GDPR-ready data processing, audit trails for all transactions, configurable data retention.
- **Performance:** Offline sync <30s for 500 queued records. Geo check-in validation under 2s.
- **Supportability:** Feature flags, environment promotion pipelines (dev/test/stage/prod).

## 11. MVP Scope & Release Plan
1. **Sprint 0 (2 weeks):** Infra setup, CI/CD pipelines, auth scaffolding.
2. **Sprint 1:** Product/catalog + distributor onboarding.
3. **Sprint 2:** Order + return workflows + approval rules.
4. **Sprint 3:** Inventory visibility + credit ledger.
5. **Sprint 4:** Schemes, claims, notifications.
6. **Sprint 5:** Field app offline sync + GPS check-ins.
7. **Sprint 6:** Analytics dashboards + ERP webhook integration.

Exit criteria: 3 pilot distributors live, 95% of orders captured digitally, sub-5m sync lag, penetration of offline-first flows.

## 12. Testing & QA Strategy
- **Unit Tests:** Jest for backend, React Testing Library for web, Detox for mobile flows.
- **Integration Tests:** Postman/Newman suites covering core APIs and approval workflows.
- **E2E Tests:** Cypress (web) + Appium (mobile) for top 5 paths (place order, return, claim scheme, update stock, credit hold).
- **Performance Tests:** k6/Gatling to simulate 10k reps syncing simultaneously.
- **Security Tests:** OWASP Zap scan, dependency scanning via Snyk/GitHub Advanced Security.
- **UAT:** Distributor pilot with scripted scenarios.

## 13. Deployment & Operations
- Environments: Dev → QA → Staging → Production, each isolated VPC.
- Deploy via GitHub Actions: lint/test → build Docker images → push to registry → ArgoCD to Kubernetes (EKS/AKS).
- Feature toggles handled via LaunchDarkly/OpenFeature.
- Monitoring dashboards in Grafana; incident runbooks documented in Ops wiki.

## 14. Future Enhancements
- AI-based demand forecasting and route optimization.
- In-app expense management for reps.
- WhatsApp conversational ordering bot.
- Multi-language localization beyond English/Hindi.

This SDS serves as the blueprint for the MVP delivery. Detailed user flows, wireframes, and UI kits should be captured in the Product Design repository referenced by this spec.
