import type { UserRole } from '../modules/users/user.types';

export type Permission =
  | 'catalog:read'
  | 'catalog:write'
  | 'distributors:read'
  | 'distributors:write'
  | 'retailers:read'
  | 'retailers:write'
  | 'orders:read'
  | 'orders:write'
  | 'inventory:read'
  | 'inventory:write'
  | 'credit:read'
  | 'credit:write'
  | 'integrations:read'
  | 'integrations:write';

const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    'catalog:read',
    'catalog:write',
    'distributors:read',
    'distributors:write',
    'retailers:read',
    'retailers:write',
    'orders:read',
    'orders:write',
    'inventory:read',
    'inventory:write',
    'credit:read',
    'credit:write',
    'integrations:read',
    'integrations:write'
  ],
  distributor: [
    'catalog:read',
    'distributors:read',
    'retailers:read',
    'retailers:write',
    'orders:read',
    'orders:write',
    'inventory:read',
    'inventory:write',
    'credit:read',
    'credit:write'
  ],
  dealer: [
    'catalog:read',
    'orders:read',
    'orders:write',
    'inventory:read',
    'retailers:read'
  ],
  field_rep: ['orders:write', 'orders:read', 'retailers:read', 'inventory:read']
};

export const getPermissionsForRole = (role: UserRole): Permission[] =>
  rolePermissions[role] ?? [];

export const roleHasPermission = (
  role: UserRole,
  permission: Permission
): boolean => getPermissionsForRole(role).includes(permission);
