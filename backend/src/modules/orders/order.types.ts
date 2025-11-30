export type OrderStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'dispatched'
  | 'delivered'
  | 'returned'
  | 'cancelled';

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  schemeId?: string;
  discountAmount?: number;
}

export interface Order {
  id: string;
  distributorId: string;
  retailerId?: string;
  salesRepId?: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  creditHoldFlag?: boolean;
  assignedWarehouseId?: string | null;
  createdAt: string;
  updatedAt: string;
}
