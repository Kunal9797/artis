import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateStoredToken = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      console.log('AuthContext initial load:', { storedToken, storedUser });

      if (storedToken && storedUser) {
        try {
          // Validate the token with the backend
          const response = await api.get('/api/auth/validate');

          if (response.data.valid) {
            // Token is valid, set authentication state
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            setIsAuthenticated(true);
          } else {
            // Token is invalid, clear storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        } catch (error) {
          // Token validation failed, clear storage
          console.log('Token validation failed, clearing storage');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    validateStoredToken();
  }, []);

  const login = (token: string, user: User) => {
    console.log('AuthContext login called with user:', user);
    const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    localStorage.setItem('token', formattedToken);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(formattedToken);
    setUser(user);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 