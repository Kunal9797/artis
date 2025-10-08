import api from './api';

export interface Product {
  id: string;
  artisCodes: string[];
  name?: string;
  supplier: string;
  category?: string;
  supplierCode: string;
  currentStock: number;
  avgConsumption: number;
  lastUpdated: string;
  minStockLevel?: number;
  gsm?: string;
  catalogs?: string[];
  texture?: string;
  thickness?: string;
  leadTimeDays?: number;
  safetyStockDays?: number;
  reorderPoint?: number;
  orderQuantity?: number;
  isImported?: boolean;
  lastOrderDate?: string;
  nextReorderDate?: string;
}

class ProductService {
  async getProducts(params?: {
    supplier?: string;
    category?: string;
    catalog?: string;
    thickness?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await api.get('/products', { params });
    return response.data;
  }

  async getProduct(id: string): Promise<Product> {
    const response = await api.get(`/products/${id}`);
    return response.data.data;
  }

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const response = await api.put(`/products/${id}`, data);
    return response.data.data;
  }

  async getCategories(): Promise<string[]> {
    const response = await api.get('/products/categories');
    return response.data.data;
  }

  async getSuppliers(): Promise<string[]> {
    const response = await api.get('/products/suppliers');
    return response.data.data;
  }
}

export default new ProductService();