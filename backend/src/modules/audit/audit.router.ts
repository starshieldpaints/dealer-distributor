import { Router } from 'express';

export const auditRouter = Router();

auditRouter.get('/', (req, res) => {
  res.json({ message: 'Audit logs endpoint active' });
});