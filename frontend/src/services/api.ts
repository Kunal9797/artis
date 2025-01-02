import axios from 'axios';

const getApiUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return 'https://artis-backend.onrender.com/api';
  }
  return 'http://localhost:8099/api';
};

const API_URL = process.env.REACT_APP_API_URL || getApiUrl();

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
export const getAllInventory = async () => {
  try {
    const response = await api.get('/inventory');
    console.log('API Response:', response);  // Debug log
    return {
      data: response.data || []  // Ensure we always return an array
    };
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};
export const login = async (email: string, password: string) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  } catch (error: any) {
    console.error('Login error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: API_URL + '/auth/login'
    });
    throw error;
  }
};

export const register = async (username: string, email: string, password: string) => {
  const response = await api.post('/auth/register', { username, email, password });
  return response.data;
};

export const getSKUs = async () => {
  const response = await api.get('/skus');
  return response.data;
};

export const getInventoryMovements = async () => {
  const response = await api.get('/inventory-movements');
  return response.data;
};

export const createTransaction = async (data: {
  productId: string;
  type: 'IN' | 'OUT';
  quantity: number;
  notes?: string;
  date?: string;
}) => {
  try {
    const response = await api.post('/inventory/transaction', {
      ...data,
      quantity: Number(data.quantity)
    });
    return response.data;
  } catch (error: any) {
    console.error('Transaction API error:', error.response?.data || error);
    throw error;
  }
};

export const getProductTransactions = async (productId: string) => {
  const response = await api.get(`/inventory/transactions/${productId}`);
  return response.data;
};

export const bulkUploadInventory = async (formData: FormData) => {
  const response = await api.post('/inventory/bulk', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getAllProducts = async () => {
  const response = await api.get('/products');
  return response.data.map((product: any) => ({
    ...product,
    displayName: `${product.supplierCode || ''} (${product.artisCode}) - ${product.name || ''}`
  }));
};

export default api; 