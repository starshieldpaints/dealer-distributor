export interface SecondarySale {
  id: string;
  distributorId: string;
  retailerId: string;
  productId: string;
  quantity: number;
  amount: number;
  saleDate: string;
  capturedBy?: string;
  createdAt: string;
}
