export interface CreditLedgerEntry {
  id: string;
  distributorId: string;
  txnType: 'invoice' | 'payment' | 'adjustment';
  referenceId: string;
  debit: number;
  credit: number;
  balanceAfter: number;
  dueDate?: string;
  createdAt: string;
}

export interface CreditSummary {
  distributorId: string;
  creditLimit: number | null;
  outstanding: number;
  holds: number;
  utilization: number;
}

export interface AgingBuckets {
  current: number;
  bucket30: number;
  bucket60: number;
  bucket90: number;
  bucket90plus: number;
}
