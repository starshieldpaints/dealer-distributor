import type { UserRole } from '../modules/users/user.types';
import type { Permission } from '../lib/permissions';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: UserRole;
      distributorId?: string | null;
      geoRole?: string | null;
      permissions: Permission[];
    };
  }
}
