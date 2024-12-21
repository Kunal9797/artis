import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  useTheme,
  Paper
} from '@mui/material';
import {
  Menu as MenuIcon,
  Inventory2 as Inventory2Icon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ProductCatalog from './ProductCatalog';
import Logo from '../assets/artislogo.png';

const DRAWER_WIDTH = 240;

const Dashboard: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box sx={{ bgcolor: '#1a237e', height: '100%', color: 'white' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={Logo} alt="Artis Logo" style={{ height: '40px' }} />
      </Box>
      <List>
        <ListItem 
          button 
          selected={true}
          sx={{
            mb: 1,
            mx: 1,
            borderRadius: 1,
            color: '#ffffff',
            '&.Mui-selected': {
              backgroundColor: 'rgba(255,255,255,0.08)',
            },
          }}
        >
          <ListItemIcon>
            <Inventory2Icon color="primary" />
          </ListItemIcon>
          <ListItemText primary="Product Catalog" />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: '#1A237E',
          boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
        }}
      >
        <Toolbar sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' }, color: '#ffffff' }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 4 }}>
            <img 
              src={Logo} 
              alt="Artis Laminate" 
              style={{ 
                height: '40px',
                marginRight: '12px',
              }} 
            />
            <Typography 
              variant="h6" 
              noWrap 
              sx={{ 
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '1.3rem',
                letterSpacing: '0.5px'
              }}
            >
              Artis Laminates
            </Typography>
          </Box>

          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              color: '#ffffff',
              fontWeight: 500
            }}
          >
            Product Catalog
          </Typography>
          <Typography sx={{ mr: 2, color: '#ffffff' }}>
            Welcome, {user?.name || 'User'}
          </Typography>
          <Button 
            variant="outlined"
            onClick={logout}
            sx={{
              borderColor: '#ffffff',
              color: '#ffffff',
              '&:hover': {
                borderColor: '#ffffff',
                backgroundColor: 'rgba(255,255,255,0.08)',
              },
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      
      <Drawer variant="permanent" sx={{ width: DRAWER_WIDTH }}>
        {drawer}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: '64px' }}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 2 }}>
          <ProductCatalog />
        </Paper>
      </Box>
    </Box>
  );
};

export default Dashboard; 