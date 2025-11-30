import { apiClient } from './client';
import type { AuthUser } from './auth';

export interface PendingUser extends AuthUser {
  approvalNotes?: string | null;
  pinCodes: string[];
  createdAt: string;
}

export const fetchPendingUsers = async (): Promise<PendingUser[]> => {
  const { data } = await apiClient.get<{ data: PendingUser[] }>('/admin/approvals');
  return data.data;
};

export const approveUser = async (userId: string, notes?: string): Promise<void> => {
  await apiClient.post(`/admin/approvals/${userId}/approve`, { notes });
};

export const rejectUser = async (userId: string, notes?: string): Promise<void> => {
  await apiClient.post(`/admin/approvals/${userId}/reject`, { notes });
};
