import { apiClient } from './client';

export interface Pincode {
  code: string;
  officeName?: string | null;
  officeType?: string | null;
  districtName?: string | null;
  stateName?: string | null;
}

export const searchPincodes = async (query: string): Promise<Pincode[]> => {
  const { data } = await apiClient.get<{ data: Pincode[] }>('/pincodes/search', {
    params: { q: query }
  });
  return data.data;
};
