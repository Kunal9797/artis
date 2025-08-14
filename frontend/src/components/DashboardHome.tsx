import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
} from '@mui/material';
import { useTheme } from '../context/ThemeContext';
import QuickStats from './Dashboard/QuickStats';
import { inventoryApi } from '../services/api';
import { distributorApi } from '../services/distributorApi';
import { InventoryItem } from './Inventory/InventoryList';
import { Distributor } from '../types/distributor';
import { useAuth } from '../context/AuthContext';
import NavigationMenu from './NavigationMenu';
import NewContactsWidget from './Contacts/NewContactsWidget';

interface DashboardHomeProps {
  setCurrentPage: (page: string) => void;
}

const DashboardHome: React.FC<DashboardHomeProps> = ({ setCurrentPage }) => {
  const { isDarkMode } = useTheme();
  const { isAdmin } = useAuth();
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
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Container maxWidth="lg">
        <Box 
          sx={{ 
            py: { xs: 2, md: 4 },
            textAlign: 'center',
            mb: { xs: 3, md: 4 }
          }}
        >
          <Typography
            variant="h2"
            sx={{
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 800,
              color: isDarkMode ? '#fff' : '#1A2027',
              fontSize: { xs: '2.25rem', sm: '2.75rem', md: '3.5rem' },
              letterSpacing: '-0.5px',
              lineHeight: 1.1,
              mb: { xs: 2, md: 3 },
              background: isDarkMode 
                ? 'linear-gradient(135deg, #ffffff 0%, #78A7BF 100%)'
                : 'linear-gradient(135deg, #1A2027 0%, #4A8CAF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: -10,
                left: '50%',
                transform: 'translateX(-50%)',
                width: { xs: '100px', md: '150px' },
                height: '4px',
                background: isDarkMode 
                  ? 'linear-gradient(90deg, #3B7EA1 0%, #78A7BF 100%)'
                  : 'linear-gradient(90deg, #1A2027 0%, #4A8CAF 100%)',
                borderRadius: '4px'
              }
            }}
          >
            Welcome to Artis
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontFamily: '"Poppins", sans-serif',
              color: isDarkMode ? 'rgba(255,255,255,0.85)' : 'rgba(26,32,39,0.8)',
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
              fontWeight: 500,
              letterSpacing: '0.5px',
              mt: { xs: 3, md: 4 },
              maxWidth: '700px',
              mx: 'auto'
            }}
          >
            Inventory Management Platform
          </Typography>
        </Box>

        <Box sx={{ mb: 2, mt: 2 }}>
          <NavigationMenu setCurrentPage={setCurrentPage} />
        </Box>

        <Box sx={{ mt: 3 }}>
          <QuickStats 
            inventory={inventory} 
            distributors={distributors}
          />
        </Box>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={4}>
            <NewContactsWidget setCurrentPage={setCurrentPage} />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default DashboardHome; 