export interface InventorySnapshot {
  warehouseId: string;
  warehouseName?: string;
  productId: string;
  sku: string;
  quantityOnHand: number;
  quantityReserved: number;
  snapshotTs: string;
}
