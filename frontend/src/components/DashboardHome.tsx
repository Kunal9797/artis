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
import { useTheme } from '../context/ThemeContext';
import QuickStats from './Dashboard/QuickStats';
import { inventoryApi } from '../services/api';
import { InventoryItem } from './Inventory/InventoryList';
import NavigationCard from './NavigationCard';


interface DashboardHomeProps {
  setCurrentPage: (page: string) => void;
}

const DashboardHome: React.FC<DashboardHomeProps> = ({ setCurrentPage }) => {
  const { isDarkMode } = useTheme();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await inventoryApi.getAllInventory();
        setInventory(response.data);
      } catch (error) {
        console.error('Failed to fetch inventory:', error);
      }
    };

    fetchInventory();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 4,
          fontWeight: 600,
          fontFamily: '"Poppins", sans-serif',
          color: isDarkMode ? '#fff' : '#1A237E'
        }}
      >
        Welcome to Artis Inventory Management
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <NavigationCard
            title="Inventory"
            description="Manage your inventory, track stock levels, and handle transactions"
            icon={<InventoryIcon sx={{ fontSize: 40, color: isDarkMode ? '#90CAF9' : '#1A237E' }} />}
            onClick={() => setCurrentPage('inventory')}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <NavigationCard
            title="Product Catalog"
            description="Browse and manage your product catalog"
            icon={<CategoryIcon sx={{ fontSize: 40, color: isDarkMode ? '#90CAF9' : '#1A237E' }} />}
            onClick={() => setCurrentPage('catalog')}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <NavigationCard
            title="Purchase Orders"
            description="Create and manage purchase orders"
            icon={<ShoppingCartIcon sx={{ fontSize: 40, color: isDarkMode ? '#90CAF9' : '#1A237E' }} />}
            onClick={() => setCurrentPage('orders')}
          />
        </Grid>
      </Grid>

      <QuickStats inventory={inventory} />
    </Box>
  );
};

export default DashboardHome; 