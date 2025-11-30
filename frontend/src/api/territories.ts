import { apiClient } from './client';

export interface Territory {
  id: string;
  name: string;
  code: string;
  region?: string | null;
}

export const fetchTerritories = async (): Promise<Territory[]> => {
  const { data } = await apiClient.get<{ data: Territory[] }>('/territories');
  return data.data;
};
