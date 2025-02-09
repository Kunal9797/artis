import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Dashboard from './Dashboard';
import SalesDashboard from './Sales/SalesDashboard';

const DashboardRouter: React.FC = () => {
  const { user } = useAuth();
  
  const salesRoles = ['SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD'];
  
  if (user && salesRoles.includes(user.role)) {
    return <SalesDashboard />;
  }
  
  return <Dashboard />;
};

export default DashboardRouter; 