import React, { useState, useRef, useEffect } from 'react';
import { Box, Button, Typography, Paper, Fade, Popper, ClickAwayListener, Badge, Grid, MenuItem } from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import MapIcon from '@mui/icons-material/Map';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SettingsIcon from '@mui/icons-material/Settings';
import AssessmentIcon from '@mui/icons-material/Assessment';
import StarIcon from '@mui/icons-material/Star';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import BusinessIcon from '@mui/icons-material/Business';
import CategoryIcon from '@mui/icons-material/Category';
import InfoIcon from '@mui/icons-material/Info';
import PeopleIcon from '@mui/icons-material/People';
import { useTheme } from '../context/ThemeContext';

interface NavigationItem {
  title: string;
  icon: React.ReactNode;
  page: string;
  isPrimary?: boolean;
  isNew?: boolean;
  subtitle?: string;
  highlight?: boolean;
  onClick: () => void;
}

interface NavigationMenuProps {
  setCurrentPage: (page: string) => void;
}

const NavigationMenu: React.FC<NavigationMenuProps> = ({ setCurrentPage }) => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const { isDarkMode } = useTheme();

  const navigationItems: NavigationItem[] = [
    {
      title: "Inventory",
      icon: <InventoryIcon />,
      page: 'inventory',
      isPrimary: true,
      isNew: false,
      subtitle: "Manage your inventory",
      highlight: true,
      onClick: () => setCurrentPage('inventory')
    },
    {
      title: "Distributor Map",
      icon: <MapIcon />,
      page: 'distributors',
      isPrimary: true,
      isNew: false,
      subtitle: "Find distributors",
      highlight: true,
      onClick: () => setCurrentPage('distributors')
    },
    {
      title: "Purchase Orders",
      icon: <ShoppingCartIcon />,
      page: 'orders',
      subtitle: "Manage orders",
      highlight: true,
      onClick: () => setCurrentPage('orders')
    },
    {
      title: "Product Catalog",
      icon: <CategoryIcon />,
      page: 'catalog',
      subtitle: "Browse products",
      highlight: true,
      onClick: () => setCurrentPage('catalog')
    },
    {
      title: "Information",
      icon: <InfoIcon />,
      page: 'info',
      subtitle: "Help and resources",
      highlight: true,
      onClick: () => setCurrentPage('info')
    },
    {
      title: "User Management",
      icon: <PeopleIcon />,
      page: 'users',
      subtitle: "Manage users",
      highlight: true,
      onClick: () => setCurrentPage('users')
    }
  ];

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event: Event | React.SyntheticEvent) => {
    if (
      anchorRef.current &&
      anchorRef.current.contains(event.target as HTMLElement)
    ) {
      return;
    }
    setOpen(false);
  };

  const handleMenuItemClick = (page: string) => {
    setCurrentPage(page);
    setOpen(false);
  };

  return (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      position: 'relative',
      zIndex: 10,
      mb: 2,
    }}>
      <Button
        ref={anchorRef}
        onClick={handleToggle}
        aria-controls={open ? 'menu-list-grow' : undefined}
        aria-haspopup="true"
        sx={{
          background: isDarkMode 
            ? 'linear-gradient(145deg, #3b4a57, #2a3742)'
            : 'linear-gradient(145deg, #f0f2f5, #ffffff)',
          color: isDarkMode ? '#fff' : '#333',
          fontWeight: 600,
          px: 3,
          py: 1.4,
          borderRadius: 10,
          border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          boxShadow: `0 2px 10px ${isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)'}`,
          textTransform: 'none',
          fontSize: '0.95rem',
          width: '100%',
          transition: 'all 0.2s ease',
          '&:hover': {
            background: isDarkMode 
              ? 'linear-gradient(145deg, #455a6b, #364855)'
              : 'linear-gradient(145deg, #ffffff, #e8eaed)',
            boxShadow: `0 4px 15px ${isDarkMode ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.08)'}`,
            transform: 'translateY(-1px)',
          },
          display: 'flex',
          justifyContent: 'space-between'
        }}
      >
        <Typography component="span" sx={{ 
          fontWeight: 600, 
          fontSize: '1rem',
          letterSpacing: '0.01em'
        }}>
          Quick Navigation
          <Typography 
            component="span" 
            sx={{ 
              ml: 1, 
              fontSize: '0.675rem', 
              fontWeight: 700, 
              bgcolor: isDarkMode ? 'rgba(80, 130, 170, 0.8)' : '#5d8aa8',
              color: '#fff', 
              py: 0.2, 
              px: 0.8, 
              borderRadius: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'inline-flex',
              alignItems: 'center',
              position: 'relative',
              top: '-1px',
              lineHeight: 1,
              height: '20px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
            }}
          >
            New
          </Typography>
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {open ? <KeyboardArrowUpIcon sx={{ ml: 1 }} /> : <KeyboardArrowDownIcon sx={{ ml: 1 }} />}
        </Box>
      </Button>
      
      <Popper
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        placement="bottom-start"
        transition
        disablePortal
        style={{ width: anchorRef.current?.offsetWidth || 'auto', zIndex: 1300 }}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={250}>
            <Paper sx={{ 
              mt: 1.5, 
              borderRadius: 3, 
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              overflow: 'hidden',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}`,
              bgcolor: isDarkMode ? 'rgba(35,45,55,0.95)' : '#ffffff',
              width: '100%',
              pb: 1
            }}>
              <ClickAwayListener onClickAway={handleClose}>
                <Box sx={{ p: 1, width: '100%' }}>
                  <Typography sx={{ 
                    fontSize: '0.8rem', 
                    fontWeight: 600, 
                    px: 1.5, 
                    py: 0.75, 
                    color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em'
                  }}>
                    Select Destination
                  </Typography>
                  
                  <Grid container spacing={0}>
                    {navigationItems.map((item) => (
                      <Grid item xs={12} key={item.title}>
                        <MenuItem 
                          onClick={() => {
                            setOpen(false);
                            item.onClick();
                          }}
                          sx={{ 
                            py: 1.5, 
                            px: 2,
                            borderRadius: 1.5, 
                            mx: 0.5,
                            my: 0.25,
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              bgcolor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
                              transform: 'translateY(-1px)',
                              boxShadow: `0 3px 8px ${isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)'}`,
                            }
                          }}
                        >
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            width: '100%',
                            justifyContent: 'space-between'
                          }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Box 
                                sx={{ 
                                  mr: 2, 
                                  height: 38, 
                                  width: 38, 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  borderRadius: '10px',
                                  background: isDarkMode 
                                    ? 'linear-gradient(145deg, rgba(255,255,255,0.1), rgba(59,126,161,0.1))'
                                    : 'linear-gradient(145deg, #f8f9fa, #ffffff)',
                                  boxShadow: `0 2px 8px ${isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.04)'}`,
                                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}`,
                                  color: item.highlight ? '#3B7EA1' : (isDarkMode ? '#B8C7D9' : '#637381'),
                                  fontSize: '1.25rem'
                                }}
                              >
                                {item.icon}
                              </Box>
                              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                <Typography 
                                  sx={{ 
                                    fontWeight: 600, 
                                    fontSize: '0.95rem',
                                    color: item.highlight ? (isDarkMode ? '#90CAF9' : '#3B7EA1') : 'inherit',
                                    mb: 0.25
                                  }}
                                >
                                  {item.title}
                                </Typography>
                                {item.subtitle && (
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontSize: '0.8rem', 
                                      color: 'rgba(100,100,100,0.8)',
                                      fontWeight: 400
                                    }}
                                  >
                                    {item.subtitle}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                            {(item.page === 'inventory' || item.page === 'distributors') && (
                              <StarIcon sx={{ 
                                fontSize: '1rem',
                                color: isDarkMode ? '#FFD700' : '#FFB900',
                                opacity: 0.8,
                                mr: 1
                              }} />
                            )}
                          </Box>
                        </MenuItem>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </Box>
  );
};

export default NavigationMenu; 