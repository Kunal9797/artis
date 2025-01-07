import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Select,
  MenuItem,
  FormControl,
  Button,
  IconButton,
  Menu,
  useMediaQuery,
  useTheme as useMuiTheme,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../context/AuthContext';
import ProductCatalog from './ProductCatalog';
import InfoPage from './InfoPage';
import OrdersPage from './OrdersPage';
import Logo from '../assets/artislogo.png';
import ArtisLogoText from '../assets/artislaminatestext.png';
import InventoryList from './Inventory/InventoryList';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useTheme } from '../context/ThemeContext';
import DashboardHome from './DashboardHome';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

const Dashboard: React.FC = () => {
  const { logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [currentPage, setCurrentPage] = useState('home');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  const handlePageClick = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    handleMenuClose();
  };

  const getCurrentPageTitle = () => {
    switch (currentPage) {
      case 'home': 
        return 'Dashboard';
      case 'inventory': 
        return isMobile ? 'Inventory' : 'Inventory Management';
      case 'catalog': 
        return isMobile ? 'Products' : 'Product Catalog';
      case 'orders': 
        return isMobile ? 'Orders' : 'Paper Orders';
      case 'info': 
        return 'Information';
      default: 
        return 'Dashboard';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static" sx={{ 
        backgroundColor: '#282c34',
        boxShadow: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(8px)'
      }}>
        <Toolbar sx={{ 
          justifyContent: 'space-between',
          gap: 1,
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            flexShrink: 0,
            '& img': {
              transition: 'transform 0.3s ease',
              cursor: 'pointer',
              '&:hover': {
                transform: 'scale(1.05)'
              }
            }
          }}>
            <img 
              src={Logo} 
              alt="Artis Logo" 
              style={{ 
                height: '50px',
                width: 'auto',
              }} 
              onClick={() => handlePageChange('home')}
            />
            <Box sx={{ 
              display: { xs: 'none', sm: 'block' },
              marginLeft: '15px',
            }}>
              <img 
                src={ArtisLogoText} 
                alt="Artis Laminates" 
                style={{ 
                  height: '40px',
                }} 
                onClick={() => handlePageChange('home')}
              />
            </Box>
          </Box>

          <Button
            onClick={handlePageClick}
            sx={{
              position: { xs: 'relative', sm: 'absolute' },
              left: { xs: 'auto', sm: '50%' },
              transform: { xs: 'none', sm: 'translateX(-50%)' },
              color: '#fff',
              fontSize: { xs: '1.2rem', sm: '1.6rem' },
              fontWeight: 700,
              fontFamily: '"Poppins", sans-serif',
              textTransform: 'none',
              letterSpacing: '1.2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: { xs: '200px', sm: 'none' },
              background: 'linear-gradient(45deg, #fff 30%, #FFD700 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)',
              '&:hover, &:focus': {
                backgroundColor: 'rgba(255,255,255,0.1)',
                transform: { xs: 'none', sm: 'translateX(-50%) scale(1.02)' },
                letterSpacing: '1.8px',
                textShadow: '0 0 20px rgba(255,215,0,0.4)',
                background: 'linear-gradient(45deg, #fff 30%, #FFC107 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                '& .MuiSvgIcon-root': {
                  opacity: 1,
                  transform: 'translateY(0) rotate(180deg)',
                }
              },
              '& .MuiSvgIcon-root': {
                opacity: 0,
                transform: 'translateY(-10px) rotate(0deg)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                marginLeft: 1,
                fontSize: '1.2rem',
                color: '#FFD700'
              }
            }}
          >
            {getCurrentPageTitle()}
            <ArrowDropDownIcon />
          </Button>

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 200,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
              }
            }}
          >
            <MenuItem onClick={() => handlePageChange('home')}>Dashboard</MenuItem>
            <MenuItem onClick={() => handlePageChange('inventory')}>Inventory Management</MenuItem>
            <MenuItem onClick={() => handlePageChange('catalog')}>Product Catalog</MenuItem>
            <MenuItem onClick={() => handlePageChange('orders')}>Purchase Orders</MenuItem>
            <MenuItem onClick={() => handlePageChange('info')}>Information</MenuItem>
          </Menu>

          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            flexShrink: 0,
            ml: { xs: 'auto', sm: 0 }
          }}>
            <IconButton onClick={toggleTheme} color="inherit">
              {isDarkMode ? 
                <Brightness7Icon sx={{ color: '#FFD700' }} /> : 
                <Brightness4Icon sx={{ color: '#4169E1' }} />
              }
            </IconButton>
            <IconButton onClick={logout} color="inherit">
              <LogoutIcon sx={{ color: '#fff' }} />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {currentPage === 'home' && <DashboardHome setCurrentPage={setCurrentPage} />}
        {currentPage === 'inventory' && <InventoryList />}
        {currentPage === 'catalog' && <ProductCatalog />}
        {currentPage === 'orders' && <OrdersPage />}
        {currentPage === 'info' && <InfoPage />}
      </Box>
    </Box>
  );
};

export default Dashboard; 