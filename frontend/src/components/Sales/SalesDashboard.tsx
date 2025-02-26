import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme as useMuiTheme,
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Logo from '../../assets/artislogo.png';
import ArtisLogoText from '../../assets/artislaminatestext.png';

// Import components
import DealerList from './DealerManagement/DealerList';
import LeadList from './Leads/LeadList';
import SalesHome from './Dashboard/SalesHome';  // New import
import DealerVisits from './Dashboard/components/DealerVisits';

console.log('LeadList component imported:', LeadList);

const SalesDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    console.log('SalesDashboard - Current Path:', location.pathname);
  }, [location]);

  // Add this effect to update currentPage based on location and state
  useEffect(() => {
    console.log('Location state:', location.state);
    if (location.state?.currentPage) {
      setCurrentPage(location.state.currentPage);
    } else if (location.pathname.includes('/leads')) {
      setCurrentPage('leads');
    } else if (location.pathname.includes('/dealers')) {
      setCurrentPage('dealers');
    } else {
      setCurrentPage('dashboard');
    }
  }, [location]);

  const { isDarkMode, toggleTheme } = useTheme();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  const handlePageClick = (event: React.MouseEvent<HTMLElement>) => {
    console.log('Page menu clicked');
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handlePageChange = (page: string) => {
    console.log('Changing page to:', page);
    setCurrentPage(page);
    handleMenuClose();
    switch (page) {
      case 'leads':
        navigate('/sales/leads');
        break;
      case 'dealers':
        navigate('/sales/dealers');
        break;
      case 'visits':
        navigate('/sales/visits');
        break;
      case 'dashboard':
      default:
        navigate('/sales');
        break;
    }
  };

  const getCurrentPageTitle = () => {
    switch (currentPage) {
      case 'dashboard':
        return 'Dashboard';
      case 'dealers':
        return 'Dealers';
      case 'leads':
        return 'Leads';
      case 'visits':
        return 'Dealer Visits';
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
          height: '64px',
          minHeight: '64px !important',
          justifyContent: 'space-between',
          gap: 1,
          px: { xs: 1, sm: 2 }
        }}>
          {/* Logo Section - Original size */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 1,
            flexShrink: 0,
            '& img': {
              height: '48px',
              width: 'auto',
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
              onClick={() => handlePageChange('dashboard')}
            />
            <Box sx={{ 
              display: { xs: 'none', md: 'block' }, 
              height: '40px'
            }}>
              <img 
                src={ArtisLogoText} 
                alt="Artis Laminates" 
                style={{ height: '100%' }} 
                onClick={() => handlePageChange('dashboard')}
              />
            </Box>
          </Box>

          {/* Page Title Button - Larger font */}
          <Button
            onClick={handlePageClick}
            sx={{
              color: '#fff',
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              fontWeight: 600,
              fontFamily: '"Poppins", sans-serif',
              textTransform: 'none',
              letterSpacing: '0.5px',
              background: 'linear-gradient(45deg, #fff 30%, #FFD700 90%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              padding: '6px 12px',
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              '&:hover': {
                background: 'linear-gradient(45deg, #fff 30%, #FFC107 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }
            }}
          >
            {getCurrentPageTitle()}
            <ArrowDropDownIcon sx={{ fontSize: '2rem' }} />
          </Button>

          {/* Right Icons - Original size */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 0.5,
            flexShrink: 0
          }}>
            <IconButton 
              onClick={toggleTheme} 
              size="medium"
              color="inherit"
              sx={{
                padding: '12px',
                '&:hover': {
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {isDarkMode ? 
                <Brightness7Icon sx={{ color: '#FFD700', fontSize: '1.5rem' }} /> : 
                <Brightness4Icon sx={{ color: '#4169E1', fontSize: '1.5rem' }} />
              }
            </IconButton>
            <IconButton 
              onClick={logout} 
              size="medium"
              color="inherit"
              sx={{
                padding: '12px',
                '&:hover': {
                  color: '#FF4444',
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              <LogoutIcon sx={{ color: '#fff', fontSize: '1.5rem' }} />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Menu for page selection */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handlePageChange('dashboard')}>Dashboard</MenuItem>
        <MenuItem onClick={() => handlePageChange('visits')}>Dealer Visits</MenuItem>
        <MenuItem onClick={() => handlePageChange('leads')}>Lead Management</MenuItem>
        <MenuItem onClick={() => handlePageChange('dealers')}>Dealer Management</MenuItem>
      </Menu>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
        <Routes>
          <Route index element={<SalesHome />} />
          <Route path="visits" element={<DealerVisits />} />
          <Route path="leads" element={<LeadList />} />
          <Route path="dealers" element={<DealerList />} />
          <Route path="*" element={<SalesHome />} />
        </Routes>
      </Box>
    </Box>
  );
};

export default SalesDashboard;