import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import SalesNavbar from './components/SalesNavbar';
import CountryHeadDashboard from './Dashboard/CountryHeadDashboard';
import ZonalHeadDashboard from './Dashboard/ZonalHeadDashboard';
import SalesExecDashboard from './Dashboard/SalesExecDashboard';
import DealerList from './DealerManagement/DealerList';
import LeadList from './Leads/LeadList';
import TerritoryView from './Territory/TerritoryView';

const SalesDashboard: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  console.log('Current user:', user);

  const getDashboardComponent = () => {
    console.log('Getting dashboard component for role:', user?.role);
    switch (user?.role) {
      case 'COUNTRY_HEAD':
        return <CountryHeadDashboard />;
      case 'ZONAL_HEAD':
        return <ZonalHeadDashboard />;
      case 'SALES_EXECUTIVE':
        console.log('Returning SalesExecDashboard');
        return <SalesExecDashboard />;
      default:
        console.log('No matching role found, returning null');
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <SalesNavbar />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {/* Render dashboard for the root path */}
        {location.pathname === '/sales' && getDashboardComponent()}
        
        {/* Routes for other pages */}
        <Routes>
          <Route path="dealers/*" element={<DealerList />} />
          <Route path="leads/*" element={<LeadList />} />
          <Route path="territory" element={<TerritoryView />} />
        </Routes>
      </Box>
    </Box>
  );
};

export default SalesDashboard; 