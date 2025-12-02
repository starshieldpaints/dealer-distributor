// import { Router, type Application } from 'express';
// import { authRouter } from '../modules/auth/auth.router';
// import { ordersRouter } from '../modules/orders/order.router';
// import { inventoryRouter } from '../modules/inventory/inventory.router';
// import { creditRouter } from '../modules/credit/credit.router';
// import { schemesRouter } from '../modules/schemes/scheme.router';
// import { analyticsRouter } from '../modules/analytics/analytics.router';
// import { secondarySalesRouter } from '../modules/secondarySales/secondarySales.router';
// import { visitRouter } from '../modules/visits/visit.router';
// import { notificationRouter } from '../modules/notificationLog/notificationLog.router';
// import { authenticate } from '../middleware/authenticate';
// import { catalogRouter } from '../modules/catalog/catalog.router';
// import { distributorRouter } from '../modules/distributors/distributor.router';
// import { integrationsRouter } from '../modules/integrations/integration.router';
// import { territoryRouter } from '../modules/territories/territory.router';
// import { usersRouter } from '../modules/users/user.router';
// import { pincodeRouter } from '../modules/pincodes/pincode.router';
// import { approvalRouter } from '../modules/users/user.approval.router';
// import { authorize } from '../middleware/authorize';

// export const registerRoutes = (app: Application): void => {
//   const api = Router();

//   api.use('/pincodes', pincodeRouter);
//   api.use('/auth', authRouter);
//   api.use('/territories', territoryRouter);
//   api.use(authenticate);
//   api.use('/users', usersRouter);
//   api.use('/admin/approvals', approvalRouter);
//   api.use('/catalog', catalogRouter);
//   api.use('/orders', ordersRouter);
//   api.use('/distributors', distributorRouter);
//   api.use('/inventory', inventoryRouter);
//   api.use('/credit', creditRouter);
//   api.use('/schemes', schemesRouter);
//   api.use('/analytics', analyticsRouter);
//   api.use('/secondary-sales', secondarySalesRouter);
//   api.use('/visits', visitRouter);
//   api.use('/notifications', notificationRouter);
//   api.use('/integrations', integrationsRouter);

//   app.use('/api/v1', api);
// };

import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.router';
import { usersRouter } from '../modules/users/user.router';
import { catalogRouter } from '../modules/catalog/catalog.router';
import { orderRouter } from '../modules/orders/order.router';
import { inventoryRouter } from '../modules/inventory/inventory.router';
import { creditRouter } from '../modules/credit/credit.router';
import { schemeRouter } from '../modules/schemes/scheme.router';
import { secondarySalesRouter } from '../modules/secondarySales/secondarySales.router';
import { visitRouter } from '../modules/visits/visit.router';
import { territoryRouter } from '../modules/territories/territory.router';
import { analyticsRouter } from '../modules/analytics/analytics.router';
import { auditRouter } from '../modules/audit/audit.router';
import { notificationLogRouter } from '../modules/notificationLog/notificationLog.router';

export const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- SAFE MOUNT FUNCTION ---
// This prevents the server from crashing if a router file is missing or broken.
const safeMount = (path: string, routeModule: any, name: string) => {
  if (!routeModule) {
    console.warn(`⚠️ SKIPPING ${name}: Module is undefined (Circular dependency or missing export).`);
    return;
  }
  
  // Ensure it is a valid middleware function (Router)
  if (typeof routeModule !== 'function') {
     console.warn(`⚠️ SKIPPING ${name}: Export is not a valid Router function. Type: ${typeof routeModule}`);
     return;
  }

  try {
    router.use(path, routeModule);
    console.log(`✅ Mounted ${name} at ${path}`);
  } catch (error) {
    console.error(`❌ FAILED to mount ${name}:`, error);
  }
};

console.log('--- MOUNTING ROUTES ---');

safeMount('/auth', authRouter, 'authRouter');
safeMount('/users', usersRouter, 'usersRouter');
safeMount('/catalog', catalogRouter, 'catalogRouter');
safeMount('/orders', orderRouter, 'orderRouter');
safeMount('/inventory', inventoryRouter, 'inventoryRouter');
safeMount('/credit', creditRouter, 'creditRouter');
safeMount('/schemes', schemeRouter, 'schemeRouter');
safeMount('/secondary-sales', secondarySalesRouter, 'secondarySalesRouter');
safeMount('/visits', visitRouter, 'visitRouter');
safeMount('/territories', territoryRouter, 'territoryRouter');
safeMount('/analytics', analyticsRouter, 'analyticsRouter');
safeMount('/notifications', notificationLogRouter, 'notificationLogRouter');
safeMount('/audit', auditRouter, 'auditRouter');

console.log('--- ROUTES READY ---');