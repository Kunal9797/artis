import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://artis-backend.onrender.com/api'
  : 'http://localhost:8099/api';

// Create axios instance with interceptors
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

// Request interceptor to add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    // Ensure token is properly formatted with 'Bearer ' prefix
    config.headers.Authorization = token.startsWith('Bearer ')
      ? token
      : `Bearer ${token}`;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

export interface DistributorOrder {
  id: number;
  distributor_name: string;
  location: string;
  state: string;
  order_date: string;
  thickness_72_92: number;
  thickness_08: number;
  thickness_1mm: number;
  total_pieces: number;
  month_year: string;
  quarter?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrderFilters {
  distributor_name?: string;
  location?: string;
  state?: string;
  start_date?: string;
  end_date?: string;
  thickness_type?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export interface OrderAnalytics {
  total_orders: number;
  total_volume: number;
  avg_order_size: number;
  orders_this_month: number;
  volume_this_month: number;
  active_distributors: number;
}

export interface TrendData {
  period: string;
  total_orders: number;
  total_volume: number;
  thickness_72_92_total: number;
  thickness_08_total: number;
  thickness_1mm_total: number;
  avg_order_size: number;
  unique_distributors: number;
}

export interface ThicknessAnalysis {
  thickness_72_92: { quantity: number; percentage: number };
  thickness_08: { quantity: number; percentage: number };
  thickness_1mm: { quantity: number; percentage: number };
  total: number;
}

export interface LocationAnalysis {
  location?: string;
  state?: string;
  total_orders: number;
  total_volume: number;
  avg_order_size: number;
  distributor_count: number;
}

export interface TopDistributor {
  distributor_name: string;
  location: string;
  state: string;
  total_orders: number;
  total_volume: number;
  avg_order_size: number;
  last_order_date: string;
  first_order_date: string;
}

class DistributorOrderService {
  // Get all orders with filters
  async getOrders(filters: OrderFilters = {}) {
    try {
      const response = await api.get('/distributor-orders', {
        params: filters
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching distributor orders:', error);
      throw error;
    }
  }

  // Get single order
  async getOrder(id: number) {
    try {
      const response = await api.get(`/distributor-orders/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  }

  // Get analytics summary
  async getAnalyticsSummary(start_date?: string, end_date?: string) {
    try {
      const params: any = {};
      if (start_date) params.start_date = start_date;
      if (end_date) params.end_date = end_date;

      const response = await api.get('/distributor-orders/analytics/summary', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching analytics summary:', error);
      throw error;
    }
  }

  // Get order trends
  async getTrends(period: 'daily' | 'monthly' | 'quarterly' = 'monthly', start_date?: string, end_date?: string) {
    try {
      const params: any = { period };
      if (start_date) params.start_date = start_date;
      if (end_date) params.end_date = end_date;

      const response = await api.get('/distributor-orders/analytics/trends', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching trends:', error);
      throw error;
    }
  }

  // Get thickness analysis
  async getThicknessAnalysis(filters: { start_date?: string; end_date?: string; distributor_name?: string; location?: string } = {}) {
    try {
      const response = await api.get('/distributor-orders/analytics/by-thickness', {
        params: filters
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching thickness analysis:', error);
      throw error;
    }
  }

  // Get location analysis
  async getLocationAnalysis(filters: { start_date?: string; end_date?: string; group_by?: 'location' | 'state' } = {}) {
    try {
      const response = await api.get('/distributor-orders/analytics/by-location', {
        params: filters
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching location analysis:', error);
      throw error;
    }
  }

  // Get top distributors
  async getTopDistributors(start_date?: string, end_date?: string, limit: number = 10) {
    try {
      const params: any = { limit };
      if (start_date) params.start_date = start_date;
      if (end_date) params.end_date = end_date;

      const response = await api.get('/distributor-orders/analytics/top-distributors', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching top distributors:', error);
      throw error;
    }
  }

  // Create new order
  async createOrder(order: Omit<DistributorOrder, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const response = await api.post('/distributor-orders', order);
      return response.data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  // Update order
  async updateOrder(id: number, order: Partial<DistributorOrder>) {
    try {
      const response = await api.put(`/distributor-orders/${id}`, order);
      return response.data;
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  }

  // Delete order
  async deleteOrder(id: number) {
    try {
      const response = await api.delete(`/distributor-orders/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting order:', error);
      throw error;
    }
  }

  // Import orders from Excel
  async importOrders(orders: any[]) {
    try {
      const response = await api.post('/distributor-orders/import', { orders });
      return response.data;
    } catch (error) {
      console.error('Error importing orders:', error);
      throw error;
    }
  }

  // Get distributor rankings
  async getDistributorRankings(metric: 'volume' | 'orders' | 'growth' | 'consistency' = 'volume', start_date?: string, end_date?: string) {
    try {
      const params: any = { metric };
      if (start_date) params.start_date = start_date;
      if (end_date) params.end_date = end_date;

      const response = await api.get('/distributor-orders/analytics/rankings', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching distributor rankings:', error);
      throw error;
    }
  }

  // Get ABC analysis
  async getABCAnalysis(start_date?: string, end_date?: string) {
    try {
      const params: any = {};
      if (start_date) params.start_date = start_date;
      if (end_date) params.end_date = end_date;

      const response = await api.get('/distributor-orders/analytics/abc-analysis', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching ABC analysis:', error);
      throw error;
    }
  }

  // Get growth metrics
  async getGrowthMetrics(period: 'monthly' | 'quarterly' = 'monthly', limit: number = 10) {
    try {
      const response = await api.get('/distributor-orders/analytics/growth-metrics', {
        params: { period, limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching growth metrics:', error);
      throw error;
    }
  }
}

export default new DistributorOrderService();