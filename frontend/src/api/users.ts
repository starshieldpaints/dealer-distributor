import { apiClient } from './client';
import type { RegisterPayload, VerificationStatus } from './auth';

export interface ManagedAccountResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    distributorId?: string | null;
    parentUserId?: string | null;
  };
  verification: VerificationStatus;
}

export const createManagedAccount = async (
  payload: RegisterPayload
): Promise<ManagedAccountResponse> => {
  const { data } = await apiClient.post<{ data: ManagedAccountResponse }>('/users', payload);
  return data.data;
};
