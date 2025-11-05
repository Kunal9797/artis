import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './Dashboard';

const DashboardRouter: React.FC = () => {
  console.log('DashboardRouter - Current path:', window.location.pathname);

  return (
    <Routes>
      <Route path="dashboard/*" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};

export default DashboardRouter; 