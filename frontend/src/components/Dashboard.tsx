import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import ProductCatalog from './ProductCatalog';
import InfoPage from './InfoPage';
import OrdersPage from './OrdersPage';
import Logo from '../assets/artislogo.png';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState('catalog');

  const renderPage = () => {
    switch (currentPage) {
      case 'info':
        return <InfoPage />;
      case 'orders':
        return <OrdersPage />;
      default:
        return <ProductCatalog />;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      <AppBar position="static">
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 4 }}>
            <img src={Logo} alt="Artis Logo" style={{ height: '40px', marginRight: '16px' }} />
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 500 }}>
              Artis Laminate
            </Typography>
          </Box>

          <FormControl size="small" sx={{ minWidth: 200, mr: 2 }}>
            <Select
              value={currentPage}
              onChange={(e) => setCurrentPage(e.target.value)}
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: 'white',
                '.MuiSelect-icon': { color: 'white' },
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.2)' }
              }}
            >
              <MenuItem value="catalog">Product Catalog</MenuItem>
              <MenuItem value="orders">Orders</MenuItem>
              <MenuItem value="info">Information</MenuItem>
            </Select>
          </FormControl>
          
          <Box sx={{ flexGrow: 1 }} />
          
          <Typography sx={{ color: '#ffffff' }}>
            Welcome, {user?.name || 'User'}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, overflow: 'auto', width: '100%'  }}>
        {renderPage()}
      </Box>
    </Box>
  );
};

export default Dashboard; 