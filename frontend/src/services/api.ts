import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://artis-backend.onrender.com'
    : 'http://localhost:8099'
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log('API Request - Token present:', !!token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('API Request - Authorization header set:', `Bearer ${token.substring(0, 20)}...`);
  }
  return config;
}, (error) => {
  console.error('API Request interceptor error:', error);
  return Promise.reject(error);
});

// Add a response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers
    });
    return Promise.reject(error);
  }
);

const BASE_URL = 'http://localhost:8099/api';

// Auth API endpoints
export const authApi = {
  login: (username: string, password: string) => 
    api.post('/api/auth/login', { username, password }),
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
  clearInventory: () => api.delete('/api/inventory/clear'),
  getRecentTransactions: () => api.get('/api/inventory/recent'),
  getInventoryDetails: (id: string) => api.get(`/api/inventory/details/${id}`)
};

export default api; 