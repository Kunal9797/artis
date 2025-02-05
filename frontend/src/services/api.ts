import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://artis-backend.onrender.com'
    : 'http://localhost:8099'
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Auth API endpoints
export const authApi = {
  login: (username: string, password: string) => 
    api.post('/api/auth/login', { email: username, password }),
  register: (data: { username: string; email: string; password: string; role: string }) => 
    api.post('/api/auth/register', data),
  getAllUsers: () => api.get('/api/auth/users'),
  updateUser: (userId: string, data: { username?: string; email?: string; password?: string; role?: string }) => 
    api.put(`/api/auth/users/${userId}`, data),
  deleteUser: (userId: string) => 
    api.delete(`/api/auth/users/${userId}`)
};

// Product API endpoints
export const productApi = {
  getAllProducts: () => api.get('/api/products'),
  getProduct: (id: string) => api.get(`/api/products/${id}`),
  createProduct: (data: any) => api.post('/api/products', data),
  updateProduct: (id: string, data: any) => api.put(`/api/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/api/products/${id}`),
  searchProducts: (query: string) => api.get(`/api/products/search/${query}`),
  deleteAllProducts: () => api.delete('/api/products/all'),
  bulkCreate: (file: File, updateMode: boolean = false) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/api/products/bulk?mode=${updateMode ? 'update' : 'create'}`, formData);
  }
};

// Inventory API endpoints
export const inventoryApi = {
  getAllInventory: () => api.get('/api/inventory'),
  getInventory: (productId: string) => api.get(`/api/inventory/product/${productId}`),
  getInventoryDetails: (productId: string) => api.get(`/api/inventory/details/${productId}`),
  createTransaction: (data: {
    productId: string;
    type: 'IN' | 'OUT';
    quantity: number;
    notes?: string;
    date?: Date;
  }) => api.post('/api/inventory/transaction', data),
  uploadInventory: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/inventory/upload', formData);
  },
  uploadPurchaseOrder: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/inventory/purchase-order/upload', formData);
  },
  clearInventory: () => api.post('/api/inventory/clear'),
  getRecentTransactions: () => api.get('/api/inventory/transactions/recent'),
  getProductTransactions: (productId: string) => api.get(`/api/inventory/transactions/${productId}`)
};

export default api; 