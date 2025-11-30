export interface Visit {
  id: string;
  salesRepId: string;
  retailerId?: string;
  checkInTime?: string;
  checkOutTime?: string;
  status?: string;
  notes?: string;
  createdAt: string;
}
