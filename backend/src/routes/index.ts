import { Router, type Application } from 'express';
import { authRouter } from '../modules/auth/auth.router';
import { ordersRouter } from '../modules/orders/order.router';
import { inventoryRouter } from '../modules/inventory/inventory.router';
import { creditRouter } from '../modules/credit/credit.router';
import { schemesRouter } from '../modules/schemes/scheme.router';
import { analyticsRouter } from '../modules/analytics/analytics.router';
import { secondarySalesRouter } from '../modules/secondarySales/secondarySales.router';
import { visitRouter } from '../modules/visits/visit.router';
import { notificationRouter } from '../modules/notificationLog/notificationLog.router';
import { authenticate } from '../middleware/authenticate';
import { catalogRouter } from '../modules/catalog/catalog.router';
import { distributorRouter } from '../modules/distributors/distributor.router';
import { integrationsRouter } from '../modules/integrations/integration.router';
import { territoryRouter } from '../modules/territories/territory.router';
import { usersRouter } from '../modules/users/user.router';
import { pincodeRouter } from '../modules/pincodes/pincode.router';
import { approvalRouter } from '../modules/users/user.approval.router';
import { authorize } from '../middleware/authorize';

export const registerRoutes = (app: Application): void => {
  const api = Router();

  api.use('/pincodes', pincodeRouter);
  api.use('/auth', authRouter);
  api.use('/territories', territoryRouter);
  api.use(authenticate);
  api.use('/users', usersRouter);
  api.use('/admin/approvals', approvalRouter);
  api.use('/catalog', catalogRouter);
  api.use('/orders', ordersRouter);
  api.use('/distributors', distributorRouter);
  api.use('/inventory', inventoryRouter);
  api.use('/credit', creditRouter);
  api.use('/schemes', schemesRouter);
  api.use('/analytics', analyticsRouter);
  api.use('/secondary-sales', secondarySalesRouter);
  api.use('/visits', visitRouter);
  api.use('/notifications', notificationRouter);
  api.use('/integrations', integrationsRouter);

  app.use('/api/v1', api);
};
