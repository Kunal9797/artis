import axios from 'axios';

const API_URL = 'http://localhost:8099/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const register = async (username: string, email: string, password: string) => {
  const response = await api.post('/auth/register', { username, email, password });
  return response.data;
};

export const getSKUs = async () => {
  const response = await api.get('/skus');
  return response.data;
};

// Add this function to test user creation
const createTestUser = async () => {
  try {
    const response = await api.post('/auth/register', {
      username: 'testuser',
      email: 'test@artis.com',
      password: 'test123'
    });
    console.log('User created successfully:', response.data);
  } catch (error) {
    console.error('Error creating user:', error);
  }
};

// Call it once to create the user
createTestUser();

export default api; 