export type UserRole = 'admin' | 'distributor' | 'dealer' | 'field_rep';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  distributorId?: string | null;
  parentUserId?: string | null;
  geoRole?: string | null;
  authProvider: string;
  status: 'active' | 'suspended';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedAt?: string | null;
  approvedBy?: string | null;
  approvalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}
