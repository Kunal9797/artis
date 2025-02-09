import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
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

  const getDashboardComponent = () => {
    switch (user?.role) {
      case 'COUNTRY_HEAD':
        return <CountryHeadDashboard />;
      case 'ZONAL_HEAD':
        return <ZonalHeadDashboard />;
      case 'SALES_EXECUTIVE':
        return <SalesExecDashboard />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <SalesNavbar />
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Routes>
          <Route path="/" element={getDashboardComponent()} />
          <Route path="/dealers/*" element={<DealerList />} />
          <Route path="/leads/*" element={<LeadList />} />
          <Route path="/territory" element={<TerritoryView />} />
        </Routes>
      </Box>
    </Box>
  );
};

export default SalesDashboard; 