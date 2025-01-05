export interface Product {
  id: string;
  artisCodes: string[];
  name: string;
  supplier: string;
  category?: string;
  supplierCode: string;
  currentStock: number;
  avgConsumption: number;
  lastUpdated: Date;
  minStockLevel?: number;
  catalogs: string[];
  gsm?: string;
  texture?: string;
  thickness?: string;
}

export interface ProductDetails extends Product {
  transactions?: Transaction[];
}

export interface Transaction {
  id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  date: string;
  notes?: string;
  createdAt: string;
  product?: {
    artisCodes: string[];
    name: string;
  };
} 