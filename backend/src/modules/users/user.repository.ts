import { pool } from '../../db/pool';
import type { User, UserRole } from './user.types';

interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  distributorId?: string | null;
  parentUserId?: string | null;
}

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const res = await pool.query<User>({
    text: `
      SELECT id,
             name,
             email,
             password_hash as "passwordHash",
             role,
             distributor_id as "distributorId",
             parent_user_id as "parentUserId",
             geo_role as "geoRole",
             auth_provider as "authProvider",
             status,
             approval_status as "approvalStatus",
             approved_at as "approvedAt",
             approved_by as "approvedBy",
             approval_notes as "approvalNotes",
             created_at as "createdAt",
             updated_at as "updatedAt"
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `,
    values: [email]
  });
  return res.rows[0] ?? null;
};

export const findUserById = async (id: string): Promise<User | null> => {
  const res = await pool.query<User>({
    text: `
      SELECT id,
             name,
             email,
             password_hash as "passwordHash",
             role,
             distributor_id as "distributorId",
             parent_user_id as "parentUserId",
             geo_role as "geoRole",
             auth_provider as "authProvider",
             status,
             approval_status as "approvalStatus",
             approved_at as "approvedAt",
             approved_by as "approvedBy",
             approval_notes as "approvalNotes",
             created_at as "createdAt",
             updated_at as "updatedAt"
      FROM users
      WHERE id = $1
    `,
    values: [id]
  });
  return res.rows[0] ?? null;
};

export const createUser = async (input: CreateUserInput): Promise<User> => {
  const res = await pool.query<User>({
    text: `
      INSERT INTO users (name, email, password_hash, role, distributor_id, parent_user_id, status)
      VALUES ($1, LOWER($2), $3, $4, $5, $6, 'active')
      RETURNING id,
                name,
                email,
                password_hash as "passwordHash",
                role,
                distributor_id as "distributorId",
                parent_user_id as "parentUserId",
                geo_role as "geoRole",
                auth_provider as "authProvider",
                status,
                approval_status as "approvalStatus",
                approved_at as "approvedAt",
                approved_by as "approvedBy",
                approval_notes as "approvalNotes",
                created_at as "createdAt",
                updated_at as "updatedAt"
    `,
    values: [
      input.name,
      input.email,
      input.passwordHash,
      input.role,
      input.distributorId ?? null,
      input.parentUserId ?? null
    ]
  });
  return res.rows[0];
};

export const updateUserPassword = async (
  userId: string,
  passwordHash: string
): Promise<void> => {
  await pool.query({
    text: `
      UPDATE users
      SET password_hash = $2,
          updated_at = NOW()
      WHERE id = $1
    `,
    values: [userId, passwordHash]
  });
};

interface PendingUserRow extends Omit<User, 'passwordHash'> {}

export interface PendingUserSummary extends PendingUserRow {
  pinCodes: string[];
}

export const listPendingUsers = async (): Promise<PendingUserSummary[]> => {
  const res = await pool.query<PendingUserRow>({
    text: `
      SELECT id,
             name,
             email,
             role,
             distributor_id as "distributorId",
             parent_user_id as "parentUserId",
             geo_role as "geoRole",
             auth_provider as "authProvider",
             status,
             approval_status as "approvalStatus",
             approved_at as "approvedAt",
             approved_by as "approvedBy",
             approval_notes as "approvalNotes",
             created_at as "createdAt",
             updated_at as "updatedAt"
      FROM users
      WHERE approval_status = 'pending'
      ORDER BY created_at ASC
    `
  });
  const users = res.rows;
  const assignments = await pool.query({
    text: `
      SELECT user_id, array_agg(pincode ORDER BY pincode) as pins
      FROM user_pin_assignments
      WHERE user_id = ANY($1)
      GROUP BY user_id
    `,
    values: [users.map((u) => u.id)]
  });
  const map = new Map<string, string[]>();
  assignments.rows.forEach((row: any) => {
    map.set(row.user_id, row.pins ?? []);
  });
  return users.map((user) => ({
    ...user,
    pinCodes: map.get(user.id) ?? []
  }));
};

export const updateApprovalStatus = async (input: {
  userId: string;
  status: 'approved' | 'rejected';
  notes?: string | null;
  approvedBy: string;
}): Promise<void> => {
  await pool.query({
    text: `
      UPDATE users
      SET approval_status = $2,
          approval_notes = $3,
          approved_by = $4,
          approved_at = CASE WHEN $2 = 'approved' THEN NOW() ELSE NULL END
      WHERE id = $1
    `,
    values: [input.userId, input.status, input.notes ?? null, input.approvedBy]
  });
};

interface UserSearchFilter {
  q?: string;
  roles?: UserRole[];
  limit?: number;
}

export const searchUsers = async (filter: UserSearchFilter): Promise<Pick<User, 'id' | 'name' | 'email' | 'role' | 'distributorId'>[]> => {
  const res = await pool.query({
    text: `
      SELECT id,
             name,
             email,
             role,
             distributor_id as "distributorId"
      FROM users
      WHERE ($1::text IS NULL
             OR name ILIKE '%' || $1 || '%'
             OR email ILIKE '%' || $1 || '%'
             OR id::text ILIKE '%' || $1 || '%')
        AND ($2::text[] IS NULL OR role = ANY($2))
      ORDER BY name
      LIMIT $3
    `,
    values: [
      filter.q ?? null,
      filter.roles ? filter.roles : null,
      filter.limit ?? 10
    ]
  });
  return res.rows as any;
};
