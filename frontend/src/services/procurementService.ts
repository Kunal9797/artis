import api from './api';

export interface StockoutRisk {
  productId: string;
  artisCodes: string[];
  name?: string;
  supplier: string;
  currentStock: number;
  avgConsumption: number;
  daysUntilStockout: number | null;
  leadTimeDays: number;
  riskLevel: 'STOCKOUT' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE';
  recommendedOrderQty: number;
  recommendedOrderDate: string;
  estimatedStockoutDate: string | null;
}

export interface ProcurementAlerts {
  critical: StockoutRisk[];
  upcoming: StockoutRisk[];
  overstock: Array<{
    id: string;
    artisCodes: string[];
    name?: string;
    supplier: string;
    currentStock: number;
    avgConsumption: number;
    monthsOfStock: string | null;
  }>;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  productId: string;
  supplier: string;
  quantity: number;
  unitPrice?: number;
  totalAmount?: number;
  orderDate: string;
  expectedDeliveryDate: string;
  actualDeliveryDate?: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  leadTimeDays: number;
  actualLeadTimeDays?: number;
  notes?: string;
  trackingNumber?: string;
  invoiceNumber?: string;
  product?: {
    id: string;
    artisCodes: string[];
    name?: string;
    supplier: string;
    category?: string;
  };
}

export interface SupplierPerformance {
  supplier: string;
  total_orders: number;
  delivered_orders: number;
  avg_actual_lead_time: number | null;
  avg_expected_lead_time: number;
  avg_lead_time_variance: number | null;
  late_delivery_percentage: number | null;
}

export interface ConsumptionForecast {
  productId: string;
  forecastMonth: string;
  predictedConsumption: number;
  confidence: number;
  method: string;
  seasonalFactor?: number;
  trendFactor?: number;
}

class ProcurementService {
  async getStockoutRisks() {
    const response = await api.get('/api/procurement/stockout-risks');
    return response.data.data;
  }

  async getProcurementAlerts(): Promise<ProcurementAlerts> {
    const response = await api.get('/api/procurement/alerts');
    return response.data.data;
  }

  async generateForecast(productId: string, months: number = 3): Promise<ConsumptionForecast[]> {
    const response = await api.post('/api/procurement/forecast', {
      productId,
      months
    });
    return response.data.data;
  }

  async generateAllForecasts(months: number = 3) {
    const response = await api.post('/api/procurement/forecast-all', { months });
    return response.data.data;
  }

  async updateProcurementSettings(productId: string, settings: {
    leadTimeDays?: number;
    safetyStockDays?: number;
    orderQuantity?: number;
    isImported?: boolean;
    minStockLevel?: number;
  }) {
    const response = await api.put(`/api/procurement/products/${productId}/settings`, settings);
    return response.data.data;
  }

  async createPurchaseOrder(orderData: {
    productId: string;
    quantity: number;
    supplier?: string;
    unitPrice?: number;
    notes?: string;
    expectedDeliveryDate?: string;
  }): Promise<PurchaseOrder> {
    const response = await api.post('/api/procurement/purchase-orders', orderData);
    return response.data.data;
  }

  async getPurchaseOrders(params?: {
    status?: string;
    supplier?: string;
    productId?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await api.get('/api/procurement/purchase-orders', { params });
    return response.data.data;
  }

  async updatePurchaseOrderStatus(orderId: string, updates: {
    status?: string;
    actualDeliveryDate?: string;
    trackingNumber?: string;
    invoiceNumber?: string;
    notes?: string;
  }): Promise<PurchaseOrder> {
    const response = await api.put(`/api/procurement/purchase-orders/${orderId}/status`, updates);
    return response.data.data;
  }

  async getSupplierPerformance(): Promise<SupplierPerformance[]> {
    const response = await api.get('/api/procurement/supplier-performance');
    return response.data.data;
  }

  async updateReorderPoints() {
    const response = await api.post('/api/procurement/update-reorder-points');
    return response.data;
  }
}

export default new ProcurementService();