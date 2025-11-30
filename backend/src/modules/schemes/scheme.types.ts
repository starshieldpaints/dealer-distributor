export interface Scheme {
  id: string;
  name: string;
  type: 'volume' | 'combo' | 'period' | 'price';
  startDate: string;
  endDate: string;
  geoScope?: string;
  budget?: number;
  createdAt: string;
}

export interface SchemeClaim {
  id: string;
  schemeId: string;
  distributorId: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  claimedAmount: number;
  createdAt: string;
}
