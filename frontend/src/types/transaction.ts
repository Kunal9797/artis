import { Product } from './product';

export interface Transaction {
  id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  date: string;
  notes?: string;
  productId: string;
  balance: number;
}

export interface ProductDetails {
  supplierCode: string;
  supplier: string;
  artisCodes: string;
  currentStock: number;
  transactions: Transaction[];
}

export interface TransactionData {
  productId: string;
  type: 'IN' | 'OUT';
  quantity: number;
  notes?: string;
  date?: string;
} 