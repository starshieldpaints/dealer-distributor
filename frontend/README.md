# DDMS Frontend (React + Vite)

This folder contains the web client for the Dealer & Distributor Management System. It targets three personas in a single responsive Progressive Web App:

- **HQ Admin** - configures catalog, credit, schemes, analytics dashboards.
- **Distributor Ops** - manages orders, stock, ledger, trade claims.
- **Field Force Supervisors** - monitors beat plans, geo check-ins, visit compliance.

## Stack
- React 18 + TypeScript + Vite 5
- React Router 6 for multi-surface routing
- Zustand for lightweight UI state (role switching, layout state)
- React Query for API data fetching/caching (paired with backend `/api/v1`)
- CSS Modules + global variables for neumorphic dark UI
- Recharts placeholder ready for analytics widgets

## Structure
```
src/
  api/         Axios client + React Query hooks
  components/  Layout + common UI building blocks
  data/        Mock data (until backend is wired)
  features/    Route-level views (dashboard, orders, inventory, credit, schemes, field, integrations)
  routes/      Central router definition
  store/       Global UI state (role switcher, sidebar)
  styles/      Global CSS tokens
```

## Getting Started
```bash
cd frontend
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api` calls to the backend at `http://localhost:4000`. Set up the backend per `../backend/README.md` for live data; otherwise the UI renders mock data defined in `src/data/mockData.ts`.

### Mock Authentication
- `/register` hits `POST /api/v1/auth/register` to create distributor/dealer accounts; `/login` calls `POST /api/v1/auth/login`.
- JWT + user info are persisted in `localStorage`; axios interceptors attach `Authorization: Bearer <token>` for every request.
- Dealers are auto-routed to the Orders screen; HQ/Distributor users see the full control tower.

### Orders Workflow (Live API)
- Orders list + creation dialog now use the real `/api/v1/orders` endpoints via React Query.
- Admins must supply a distributor UUID to view/create orders; other roles are auto-scoped.
- Drawer captures a single product line (UUID, quantity, price) and invalidates the orders cache after creation.
- Orders that exceed credit limits are marked on credit hold (`credit_hold_flag`) and require finance approval server-side; admins see a live "Credit Holds" panel in the Orders screen.

### Inventory & Credit Screens
- Inventory page queries `/api/v1/inventory/snapshots`, with optional warehouse/distributor filters (admins must provide a distributor).
- Credit page queries `/api/v1/credit/:distributorId/ledger`, auto-scoping non-admin users to their assigned distributor.

### Secondary Sales & Field Visits
- `Secondary Sales` page captures distributor-to-retailer sales via `/api/v1/secondary-sales`.
- `Field Ops` page now lets field reps start/complete visits through `/api/v1/visits`; non-field roles still see aggregate actions.

## Production Build
```bash
npm run build
npm run preview
```

Artifacts will be emitted to `dist/` and can be served via any static host or bundled behind an Nginx reverse proxy that also forwards `/api` traffic to the Node.js backend.

## Next Steps
1. Replace mock data hooks with actual React Query hooks hitting authenticated backend endpoints.
2. Add role-based routing/guards and integrate a design system (e.g., Chakra, Mantine) if preferred.
3. Extend the field app view with offline caching using Service Workers or integrate a dedicated React Native codebase for field reps.
4. Implement charts for analytics (Recharts/VisX) once backend metrics endpoints are ready.
5. Configure Cypress/Playwright E2E flows for the critical journeys (place order, approve credit, update scheme, track visits).
