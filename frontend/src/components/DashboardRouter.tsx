import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Dashboard from './Dashboard';
import SalesDashboard from './Sales/SalesDashboard';

const DashboardRouter: React.FC = () => {
  const { user } = useAuth();
  console.log('DashboardRouter - Current path:', window.location.pathname);
  console.log('DashboardRouter - User role:', user?.role);
  
  const salesRoles = ['SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD'];
  
  if (user && salesRoles.includes(user.role)) {
    console.log('DashboardRouter - Rendering SalesDashboard');
    return (
      <Routes>
        <Route path="sales/*" element={<SalesDashboard />} />
        <Route path="*" element={<Navigate to="sales" replace />} />
      </Routes>
    );
  }
  
  return (
    <Routes>
      <Route path="dashboard/*" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};

export default DashboardRouter; 