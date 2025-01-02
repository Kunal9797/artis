import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  console.log('ProtectedRoute:', {
    isAuthenticated,
    loading,
    currentPath: location.pathname
  });

  if (loading) {
    console.log('Auth loading...');
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('Authenticated, rendering protected content');
  return <>{children}</>;
};

export default ProtectedRoute; 