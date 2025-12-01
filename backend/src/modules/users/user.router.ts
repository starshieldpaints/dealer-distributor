// import { Router } from 'express';
// import { validateRequest } from '../../middleware/validateRequest';
// import { registerSchema } from '../auth/auth.schemas';
// import { asyncHandler } from '../../utils/asyncHandler';
// import { HttpError } from '../../lib/httpError';
// import { createManagedUserAccount } from '../auth/auth.service';
// import { z } from 'zod';
// import { searchUsers } from './user.repository';

// export const usersRouter = Router();

// const allowedRolesMap: Record<string, Array<'distributor' | 'dealer' | 'field_rep'>> = {
//   admin: ['distributor', 'dealer', 'field_rep'],
//   distributor: ['dealer', 'field_rep'],
//   dealer: ['field_rep']
// };

// usersRouter.post(
//   '/',
//   validateRequest(registerSchema),
//   asyncHandler(async (req, res) => {
//     const actor = req.user;
//     if (!actor) {
//       throw new HttpError(401, 'Authentication required');
//     }
//     const allowedRoles =
//       allowedRolesMap[actor.role] ?? [];
//     if (!allowedRoles.includes(req.body.role)) {
//       throw new HttpError(403, 'You do not have permission to create this role');
//     }
//     const payload = { ...req.body };
//     if (actor.role === 'distributor' || actor.role === 'dealer') {
//       payload.parentUserId = actor.id;
//       payload.distributorId = payload.distributorId ?? actor.distributorId ?? null;
//     }
//     if (
//       (payload.role === 'dealer' || payload.role === 'field_rep') &&
//       !payload.distributorId
//     ) {
//       throw new HttpError(
//         422,
//         'A distributor context is required when creating dealers or field reps'
//       );
//     }
//     const result = await createManagedUserAccount(payload, { ip: req.ip });
//     res.status(201).json({ data: result });
//   })
// );

// const searchSchema = {
//   query: z.object({
//     q: z.string().optional(),
//     roles: z
//       .string()
//       .optional()
//       .transform((val) => (val ? val.split(',').map((r) => r.trim()) : undefined)),
//     limit: z.coerce.number().int().min(1).max(50).optional()
//   })
// };

// usersRouter.get(
//   '/search',
//   validateRequest(searchSchema),
//   asyncHandler(async (req, res) => {
//     const { q, roles, limit } = req.query as any;
//     const results = await searchUsers({
//       q: q ?? undefined,
//       roles: roles as any,
//       limit: limit ? Number(limit) : 10
//     });
//     res.json({ data: results });
//   })
// );
import { Router } from 'express';
import { validateRequest } from '../../middleware/validateRequest';
import { registerSchema } from '../auth/auth.schemas';
import { asyncHandler } from '../../utils/asyncHandler';
import { HttpError } from '../../lib/httpError';
import { createManagedUserAccount } from '../auth/auth.service';
import { z } from 'zod';
import { searchUsers } from './user.repository';

export const usersRouter = Router();

const allowedRolesMap: Record<string, Array<'distributor' | 'dealer' | 'field_rep'>> = {
  admin: ['distributor', 'dealer', 'field_rep'],
  distributor: ['dealer', 'field_rep'],
  dealer: ['field_rep']
};

usersRouter.post(
  '/',
  validateRequest(registerSchema),
  asyncHandler(async (req, res) => {
    const actor = req.user;
    if (!actor) {
      throw new HttpError(401, 'Authentication required');
    }
    const allowedRoles =
      allowedRolesMap[actor.role] ?? [];
    if (!allowedRoles.includes(req.body.role)) {
      throw new HttpError(403, 'You do not have permission to create this role');
    }
    const payload = { ...req.body };
    if (actor.role === 'distributor' || actor.role === 'dealer') {
      payload.parentUserId = actor.id;
      payload.distributorId = payload.distributorId ?? actor.distributorId ?? null;
    }
    if (
      (payload.role === 'dealer' || payload.role === 'field_rep') &&
      !payload.distributorId
    ) {
      throw new HttpError(
        422,
        'A distributor context is required when creating dealers or field reps'
      );
    }
    const result = await createManagedUserAccount(payload, { ip: req.ip });
    res.status(201).json({ data: result });
  })
);

const searchSchema = {
  query: z.object({
    q: z.string().optional(),
    roles: z
      .string()
      .optional()
      .transform((val) => (val ? val.split(',').map((r) => r.trim()) : undefined)),
    distributorId: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(50).optional()
  })
};

usersRouter.get(
  '/search',
  validateRequest(searchSchema),
  asyncHandler(async (req, res) => {
    const { q, roles, limit, distributorId } = req.query as any;
    
    // Scope query: Admins can search globally (or filter by dist ID).
    // Distributors are forced to their own distributorId.
    // Dealers/Reps shouldn't be searching users generally, but if they do, strict scoping.
    let effectiveDistributorId = distributorId;
    if (req.user?.role !== 'admin') {
       effectiveDistributorId = req.user?.distributorId;
    }

    const results = await searchUsers({
      q: q ?? undefined,
      roles: roles as any,
      distributorId: effectiveDistributorId,
      limit: limit ? Number(limit) : 10
    });
    res.json({ data: results });
  })
);