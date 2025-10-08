import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import ProductCatalogV2 from './ProductCatalogV2';
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
import DistributorsMap from './DistributorsMap';
import InfoIcon from '@mui/icons-material/Info';
import UserManagement from './Users/UserManagement';
import SalesTeamManagement from './SalesTeamManagement';
import LeadManagement from './Leads/LeadManagement';
import FavoriteIcon from '@mui/icons-material/Favorite';
import SheetsSyncSimple from './GoogleSheets/SheetsSyncSimple';
import ContactList from './Contacts/ContactList';
import ContactDetails from './Contacts/ContactDetails';
import { Routes, Route } from 'react-router-dom';
import DistributorOrders from '../pages/DistributorOrders';
import ProcurementDashboard from './Procurement/ProcurementDashboard';
import QuickLookupModern from './QuickLookupModern';

const Dashboard: React.FC = () => {
  const { logout, isAdmin } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  
  // Listen for navigation events from child components
  useEffect(() => {
    const handleNavigateEvent = (event: CustomEvent) => {
      setCurrentPage(event.detail);
    };
    
    window.addEventListener('navigate-to-page', handleNavigateEvent as EventListener);
    
    return () => {
      window.removeEventListener('navigate-to-page', handleNavigateEvent as EventListener);
    };
  }, []);

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
      case 'distributors':
        return 'Distributors';
      case 'distributor-orders':
        return isMobile ? 'Dist. Orders' : 'Distributor Orders';
      case 'users':
        return isMobile ? 'Users' : 'User Management';
      case 'salesTeam':
        return 'Sales Team Management';
      case 'leads':
        return 'Lead Management';
      case 'sheets':
        return 'Google Sheets Sync';
      case 'contacts':
        return 'Contacts';
      case 'procurement':
        return isMobile ? 'Procurement' : 'Procurement Intelligence';
      case 'quicklookup':
        return isMobile ? 'Quick Lookup' : 'Quick Lookup - Edge Functions';
      default:
        return 'Dashboard';
    }
  };

  const pages = [
    { label: 'Home', value: 'home' },
    { label: 'Products', value: 'catalog' },
    { label: 'Orders', value: 'orders' },
    { label: 'Inventory', value: 'inventory' },
    { label: 'Quick Lookup', value: 'quicklookup' },
    { label: 'Procurement', value: 'procurement' },
    { label: 'Distributors', value: 'distributors' },
    { label: 'Distributor Orders', value: 'distributor-orders' },
    { label: 'Contacts', value: 'contacts' },
    { label: 'User Management', value: 'users', adminOnly: true },
    { label: 'Sales Team', value: 'salesTeam', adminOnly: true },
    { label: 'Lead Management', value: 'leads', adminOnly: true },
    { label: 'Google Sheets Sync', value: 'sheets', adminOnly: true }
  ];

  const renderContent = () => {
    switch (currentPage) {
      case 'home':
        return <DashboardHome setCurrentPage={setCurrentPage} />;
      case 'catalog':
        return <ProductCatalogV2 />;
      case 'orders':
        return <OrdersPage />;
      case 'inventory':
        return <InventoryList />;
      case 'distributors':
        return <DistributorsMap />;
      case 'distributor-orders':
        return <DistributorOrders />;
      case 'info':
        return <InfoPage />;
      case 'users':
        return <UserManagement />;
      case 'salesTeam':
        return isAdmin() ? <SalesTeamManagement /> : null;
      case 'leads':
        return isAdmin() ? <LeadManagement /> : null;
      case 'sheets':
        return isAdmin() ? <SheetsSyncSimple /> : null;
      case 'procurement':
        return <ProcurementDashboard />;
      case 'quicklookup':
        return <QuickLookupModern />;
      case 'contacts':
        return selectedContactId ? (
          <ContactDetails
            contactId={selectedContactId}
            onBack={() => setSelectedContactId(null)}
          />
        ) : (
          <ContactList onViewContact={setSelectedContactId} />
        );
      default:
        return <DashboardHome setCurrentPage={setCurrentPage} />;
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
          flexWrap: 'nowrap',
          px: { xs: 1, sm: 2 }
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
            <MenuItem onClick={() => handlePageChange('quicklookup')}>Quick Lookup</MenuItem>
            <MenuItem onClick={() => handlePageChange('procurement')}>Procurement Intelligence</MenuItem>
            <MenuItem onClick={() => handlePageChange('info')}>Information</MenuItem>
            <MenuItem onClick={() => handlePageChange('distributors')}>Distributors</MenuItem>
            <MenuItem onClick={() => handlePageChange('distributor-orders')}>Distributor Orders</MenuItem>
            <MenuItem onClick={() => handlePageChange('contacts')}>Contacts</MenuItem>
            {isAdmin() && (
              <MenuItem onClick={() => handlePageChange('users')}>User Management</MenuItem>
            )}
            {isAdmin() && (
              <MenuItem onClick={() => handlePageChange('salesTeam')}>Sales Team Management</MenuItem>
            )}
            {isAdmin() && (
              <MenuItem onClick={() => handlePageChange('leads')}>Lead Management</MenuItem>
            )}
            {isAdmin() && (
              <MenuItem onClick={() => handlePageChange('sheets')}>Google Sheets Sync</MenuItem>
            )}
          </Menu>

          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            flexShrink: 0,
            ml: { xs: 'auto', sm: 0 }
          }}>
            <IconButton 
              onClick={toggleTheme} 
              color="inherit"
              sx={{
                '&:hover': {
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {isDarkMode ? 
                <Brightness7Icon sx={{ color: '#FFD700' }} /> : 
                <Brightness4Icon sx={{ color: '#4169E1' }} />
              }
            </IconButton>
            <IconButton 
              onClick={logout} 
              color="inherit"
              sx={{
                '&:hover': {
                  color: '#FF4444',
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <LogoutIcon sx={{ color: '#fff' }} />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, overflow: 'auto', position: 'relative' }}>
        {renderContent()}
        
        <Box 
          sx={{ 
            py: 1.2, 
            px: 3, 
            backgroundColor: 'transparent',
            position: 'relative',
            bottom: 0,
            left: 0,
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.75rem',
            color: isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
            textAlign: 'center',
            flexWrap: 'wrap',
            gap: 1,
            mt: 3,
            mb: 1
          }}
        >
          <Typography 
            variant="caption" 
            sx={{ 
              fontWeight: 400,
              fontSize: '0.7rem',
              opacity: 0.8
            }}
          >
            Version 2.0.1
          </Typography>
          
          <Typography 
            variant="caption" 
            sx={{ 
              fontWeight: 400,
              fontSize: '0.7rem',
              opacity: 0.8,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5
            }}
          >
            Designed with <FavoriteIcon sx={{ fontSize: '0.7rem', color: isDarkMode ? '#ff6b6b' : '#e53e3e', opacity: 0.8 }} /> by Kunal
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard; 