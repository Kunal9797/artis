import axios from 'axios';
import { UserFormData } from '../types/user';

const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://artis-backend.onrender.com'
    : 'http://localhost:8099',
  withCredentials: true
});

// Enhanced request interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log('=== API Request ===');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Base URL:', config.baseURL);
  console.log('Endpoint:', config.url);
  console.log('Method:', config.method);
  console.log('Token present:', !!token);
  
  if (token) {
    // Ensure token is properly formatted with 'Bearer ' prefix
    config.headers.Authorization = token.startsWith('Bearer ') 
      ? token 
      : `Bearer ${token}`;
  }
  
  console.log('Headers:', config.headers);
  return config;
}, (error) => {
  console.error('Request Interceptor Error:', error);
  return Promise.reject(error);
});

// Enhanced response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('=== API Response Success ===');
    console.log('Endpoint:', response.config.url);
    console.log('Status:', response.status);
    console.log('Data:', response.data);
    return response;
  },
  (error) => {
    console.error('=== API Response Error ===');
    console.error('Endpoint:', error.config?.url);
    console.error('Status:', error.response?.status);
    console.error('Error Data:', error.response?.data);
    console.error('Error Message:', error.message);
    console.error('Full Error:', error);
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authApi = {
  login: (username: string, password: string) => api.post('/api/auth/login', { username, password }),
  register: (data: UserFormData) => api.post('/api/auth/register', data),
  registerWithSalesTeam: (userData: UserFormData, salesTeamData: any) => 
    api.post('/api/auth/register-with-sales-team', { user: userData, salesTeam: salesTeamData }),
  getAllUsers: () => api.get('/api/auth/users'),
  updateUser: async (userId: string, data: Partial<UserFormData>) => {
    const response = await api.put(`/api/auth/users/${userId}`, data);
    
    // If role is being changed to a non-sales role, delete sales team entry
    if (data.role && !['SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD'].includes(data.role)) {
      try {
        await api.delete(`/api/sales/team/user/${userId}`);
      } catch (err) {
        console.error('Error removing sales team entry:', err);
      }
    }
    
    return response;
  },
  updateUserWithSalesTeam: (userId: string, userData: Partial<UserFormData>, salesTeamData: any) => 
    api.put(`/api/auth/users/${userId}/with-sales-team`, { user: userData, salesTeam: salesTeamData }),
  deleteUser: (userId: string) => api.delete(`/api/auth/users/${userId}`),
  getSalesTeamMembers: () => api.get<Array<{
    id: string;          // This should be the SalesTeam ID
    userId: string;      // User ID
    name: string;        // Full name
    role: string;        // Role
  }>>('/api/auth/sales-team-members'),
};

// Product API endpoints
export const productApi = {
  getAllProducts: () => api.get('/api/products'),
  getProduct: (id: string) => api.get(`/api/products/${id}`),
  createProduct: (data: any) => api.post('/api/products', data),
  updateProduct: (id: string, data: any) => api.put(`/api/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/api/products/${id}`),
  searchProducts: (query: string) => api.get(`/api/products/search/${query}`),
  deleteAllProducts: () => api.delete('/api/products/delete-all'),
  bulkCreate: (file: File, updateMode: boolean = false) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/api/products/bulk?mode=${updateMode ? 'update' : 'create'}`, formData);
  }
};

// Inventory API endpoints
export const inventoryApi = {
  getAllInventory: () => api.get('/api/inventory'),
  getInventory: (id: string) => api.get(`/api/inventory/product/${id}`),
  createTransaction: (data: any) => api.post('/api/inventory/transaction', data),
  getProductTransactions: (productId: string) => api.get(`/api/inventory/transactions/${productId}`),
  uploadInventory: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/inventory/bulk', formData);
  },
  uploadPurchaseOrder: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/inventory/purchase', formData);
  },
  uploadCorrections: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/inventory/corrections', formData);
  },
  clearInventory: () => api.delete('/api/inventory/clear'),
  getRecentTransactions: () => api.get('/api/inventory/recent'),
  getInventoryDetails: (id: string) => api.get(`/api/inventory/details/${id}`)
};

export default api; 