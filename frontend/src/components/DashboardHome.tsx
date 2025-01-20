import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import InventoryIcon from '@mui/icons-material/Inventory';
import CategoryIcon from '@mui/icons-material/Category';
import MapIcon from '@mui/icons-material/Map';
import { useTheme } from '../context/ThemeContext';
import QuickStats from './Dashboard/QuickStats';
import { inventoryApi } from '../services/api';
import { distributorApi } from '../services/distributorApi';
import { InventoryItem } from './Inventory/InventoryList';
import NavigationCard from './NavigationCard';
import { Distributor } from '../types/distributor';


interface DashboardHomeProps {
  setCurrentPage: (page: string) => void;
}

const DashboardHome: React.FC<DashboardHomeProps> = ({ setCurrentPage }) => {
  const { isDarkMode } = useTheme();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [inventoryResponse, distributorsData] = await Promise.all([
          inventoryApi.getAllInventory(),
          distributorApi.getAllDistributors()
        ]);
        
        console.log('Fetched distributors:', distributorsData);
        setInventory(inventoryResponse.data);
        setDistributors(distributorsData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Box 
        sx={{ 
          p: 3,
          textAlign: 'center',
          mb: { xs: 2, md: 4 }
        }}
      >
        <Typography
          variant="h3"
          sx={{
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 700,
            color: isDarkMode ? '#fff' : '#2C3E50',
            fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            lineHeight: 1.2,
            mb: { xs: 1, md: 2 },
            position: 'relative',
            display: 'inline-block',
            textShadow: isDarkMode 
              ? '0 0 30px rgba(255,255,255,0.15)'
              : '0 0 30px rgba(44,62,80,0.15)',
            '&::before': {
              content: '""',
              position: 'absolute',
              width: '100%',
              height: '100%',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: isDarkMode 
                ? 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 70%)'
                : 'radial-gradient(circle, rgba(44,62,80,0.08) 0%, rgba(44,62,80,0) 70%)',
              filter: 'blur(20px)',
              zIndex: -1
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: -8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: { xs: '80px', md: '120px' },
              height: '3px',
              background: isDarkMode 
                ? 'linear-gradient(90deg, rgba(128,128,128,0.7) 0%, rgba(255,215,0,0.7) 100%)'
                : 'linear-gradient(90deg, rgba(44,62,80,0.7) 0%, rgba(218,165,32,0.7) 100%)',
              borderRadius: '2px'
            }
          }}
        >
          Welcome to Artis
        </Typography>
        <Typography
          variant="h5"
          sx={{
            fontFamily: '"Poppins", sans-serif',
            color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(44,62,80,0.7)',
            fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
            fontWeight: 500,
            mt: { xs: 1, md: 2 }
          }}
        >
          Inventory Management Platform
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          {
            title: "Inventory",
            description: "Track stock levels and consumption",
            icon: <InventoryIcon />,
            page: 'inventory'
          },
          {
            title: "Distributor Map",
            description: "View and manage distributor network",
            icon: <MapIcon />,
            page: 'distributors'
          },
          {
            title: "Purchase Orders",
            description: "Create design paper purchase orders",
            icon: <ShoppingCartIcon />,
            page: 'orders'
          }
        ].map((item) => (
          <Grid item xs={12} md={4} key={item.title}>
            <NavigationCard
              title={item.title}
              description={item.description}
              icon={React.cloneElement(item.icon, {
                sx: { 
                  fontSize: { xs: 32, md: 40 }, 
                  color: isDarkMode ? '#90CAF9' : '#1A237E',
                  mb: 1
                }
              })}
              onClick={() => setCurrentPage(item.page)}
              sx={{
                height: { xs: 'auto', md: '100%' },
                p: { xs: 2.5, md: 3 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: (theme) => `0 8px 24px ${
                    isDarkMode ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)'
                  }`
                }
              }}
            />
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 3 }}>
        <QuickStats 
          inventory={inventory} 
          distributors={distributors}
        />
      </Box>
    </Box>
  );
};

export default DashboardHome; 