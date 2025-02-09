import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Box,
  Typography,
  Divider,
  useTheme,
  Button
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Store as StoreIcon,
  Assignment as LeadsIcon,
  Map as TerritoryIcon,
  Person as ProfileIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { useAuth } from '../../../context/AuthContext';

const drawerWidth = 240;

const SalesNavbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { user, logout } = useAuth();

  const menuItems = [
    { 
      text: 'Dashboard', 
      icon: <DashboardIcon />, 
      path: '/sales',
      roles: ['COUNTRY_HEAD', 'ZONAL_HEAD', 'SALES_EXECUTIVE']
    },
    { 
      text: 'Dealers', 
      icon: <StoreIcon />, 
      path: '/sales/dealers',
      roles: ['COUNTRY_HEAD', 'ZONAL_HEAD', 'SALES_EXECUTIVE']
    },
    { 
      text: 'Leads', 
      icon: <LeadsIcon />, 
      path: '/sales/leads',
      roles: ['COUNTRY_HEAD', 'ZONAL_HEAD', 'SALES_EXECUTIVE']
    },
    { 
      text: 'Territory', 
      icon: <TerritoryIcon />, 
      path: '/sales/territory',
      roles: ['COUNTRY_HEAD', 'ZONAL_HEAD']
    }
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
          borderRight: `1px solid ${theme.palette.divider}`
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Sales Portal
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {user?.username} • {user?.role.replace(/_/g, ' ')}
        </Typography>
      </Box>
      
      <Divider />
      
      <List>
        {menuItems
          .filter(item => item.roles.includes(user?.role || ''))
          .map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
                sx={{
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.contrastText',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ 
                  color: location.pathname === item.path 
                    ? 'primary.contrastText' 
                    : 'inherit'
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
      </List>
      
      <Box sx={{ flexGrow: 1 }} />
      
      <Divider />
      
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => navigate('/sales/profile')}>
            <ListItemIcon>
              <ProfileIcon />
            </ListItemIcon>
            <ListItemText primary="Profile" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <LogoutIcon sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
};

export default SalesNavbar; 