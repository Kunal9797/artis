import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Card,
  CardContent,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadIcon from '@mui/icons-material/Upload';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import InventoryIcon from '@mui/icons-material/Inventory';
import CategoryIcon from '@mui/icons-material/Category';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import { useTheme } from '../context/ThemeContext';
import { getAllInventory, api } from '../services/api';
import TopPerformersCard from './TopPerformerCard';
import MonthlyConsumptionCard from './MonthlyConsumptionCard';
import { TopPerformerItem } from './TopPerformerCard';
import { ConsumptionData } from './MonthlyConsumptionCard';
import { aggregateMonthlyConsumption } from '../utils/consumption';

interface Activity {
  id: string;
  type: 'INVENTORY_IN' | 'INVENTORY_OUT' | 'ORDER_CREATED' | 'PRODUCT_ADDED';
  description: string;
  timestamp: Date;
}

interface DashboardStats {
  totalProducts: number;
  totalInventory: number;
  lowStockItems: number;
  topPerformers: TopPerformerItem[];
  monthlyConsumption: ConsumptionData[];
  suppliers: string[];
  categories: string[];
}

interface Transaction {
  id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  date: string;
  createdAt?: string;
  product?: {
    artisCode: string;
  };
}

const normalizeSupplierCode = (supplierCode: string): string => {
  return supplierCode.replace(/\s+/g, '').toUpperCase();
};

const calculateMonthlyConsumption = (inventoryData: any[]): ConsumptionData[] => {
  const monthlyData: { [key: string]: number } = {};
  
  inventoryData.forEach(item => {
    if (item.transactions) {
      item.transactions.forEach((transaction: any) => {
        if (transaction.type === 'OUT') {
          const month = new Date(transaction.date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short' 
          });
          monthlyData[month] = (monthlyData[month] || 0) + Number(transaction.quantity);
        }
      });
    }
  });

  return Object.entries(monthlyData)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([month, total]) => ({ month, total }));
};

const DashboardHome: React.FC<{ setCurrentPage: (page: string) => void }> = ({ setCurrentPage }) => {
  const { isDarkMode } = useTheme();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalInventory: 0,
    lowStockItems: 0,
    topPerformers: [],
    monthlyConsumption: [],
    suppliers: [],
    categories: []
  });
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [inventoryResponse, productsResponse] = await Promise.all([
          getAllInventory(),
          api.get('/products')
        ]);
        
        const inventoryData = Array.isArray(inventoryResponse?.data) ? inventoryResponse.data : [];
        const productsData = Array.isArray(productsResponse?.data) ? productsResponse.data : [];

        // Group by artisCode first
        const groupedInventory = new Map();
        
        for (const item of inventoryData) {
          const artisCode = item.product?.artisCode;
          if (!artisCode) continue;

          if (!groupedInventory.has(artisCode)) {
            groupedInventory.set(artisCode, {
              ...item,
              avgConsumption: 0,
              transactions: []
            });
          }
          
          const existing = groupedInventory.get(artisCode);
          existing.currentStock = Number(existing.currentStock || 0) + Number(item.currentStock || 0);
          existing.transactions = [...(existing.transactions || []), ...(item.transactions || [])];
        }

        // Calculate consumption for grouped items
        const inventoryWithConsumption = await Promise.all(
          Array.from(groupedInventory.values()).map(async (item) => {
            try {
              const details = await api.get(`/inventory/${item.id}/details`);
              const transactions = [...(item.transactions || []), ...(details.data.transactions || [])];
              const monthlyData = aggregateMonthlyConsumption(transactions);
              const avgConsumption = monthlyData.length > 0 ? monthlyData[0].average : 0;
              
              return {
                ...item,
                avgConsumption: Number(avgConsumption) * 2 // Multiply by 2 since consumption is recorded twice
              };
            } catch (error) {
              console.error(`Error fetching details for ${item.id}:`, error);
              return item;
            }
          })
        );

        const topPerformers = inventoryWithConsumption
          .filter(item => Number(item.avgConsumption || 0) > 0)
          .sort((a, b) => Number(b.avgConsumption || 0) - Number(a.avgConsumption || 0))
          .slice(0, 10)
          .map(item => ({
            id: item.id,
            product: {
              id: item.product?.id || item.productId,
              artisCode: item.product?.artisCode || '',
              supplier: item.product?.supplier || ''
            },
            avgConsumption: Number(item.avgConsumption || 0),
            currentStock: Number(item.currentStock || 0)
          }));

        console.log('Top performers after consumption calculation:', topPerformers);

        const uniqueDesigns = new Set(
          productsData
            .filter(p => p.supplierCode && p.supplier)
            .map(p => {
              const normalizedCode = normalizeSupplierCode(p.supplierCode || '');
              return `${normalizedCode}_${p.supplier}`;
            })
        );

        const total = inventoryData.reduce((sum, item) => {
          const stockValue = parseFloat(item.currentStock) || 0;
          return sum + stockValue;
        }, 0);
        
        const lowStock = inventoryData.filter(item => {
          const stockValue = parseFloat(item.currentStock) || 0;
          return stockValue < 100;
        }).length;

        const suppliers = Array.from(new Set(productsData.map(p => p.supplier).filter(Boolean)));
        const categories = Array.from(new Set(productsData.map(p => p.category).filter(Boolean)));
        const monthlyConsumption = calculateMonthlyConsumption(inventoryData);

        setStats({
          totalProducts: uniqueDesigns.size,
          totalInventory: Math.round(total * 100) / 100,
          lowStockItems: lowStock,
          topPerformers,
          monthlyConsumption,
          suppliers,
          categories
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        console.log('Fetching recent activity...'); // Debug log
        const response = await api.get('/inventory/transactions');
        const activities: Activity[] = [];

        // Add inventory transactions
        if (Array.isArray(response?.data)) {
          response.data.forEach((transaction: any) => {
            activities.push({
              id: `inv-${transaction.id}`,
              type: transaction.type === 'IN' ? 'INVENTORY_IN' : 'INVENTORY_OUT',
              description: `${transaction.type === 'IN' ? 'Added' : 'Removed'} ${transaction.quantity} kgs of ${transaction.product?.artisCode || 'Unknown Product'}`,
              timestamp: new Date(transaction.createdAt || transaction.date)
            });
          });
        }

        // Sort by timestamp descending and take latest 5
        const sortedActivities = activities
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 5);

        console.log('Processed activities:', sortedActivities); // Debug log
        setRecentActivity(sortedActivities);
      } catch (error) {
        console.error('Error fetching recent activity:', error);
      }
    };

    fetchRecentActivity();
  }, []);

  const NavigationCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick: () => void;
  }> = ({ title, description, icon, onClick }) => (
    <Paper
      sx={{
        p: 3,
        height: '100%',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
          borderColor: isDarkMode ? '#90CAF9' : '#1A237E',
        },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}
      onClick={onClick}
    >
      <Box sx={{ 
        p: 2, 
        borderRadius: '50%', 
        backgroundColor: isDarkMode ? 'rgba(144, 202, 249, 0.08)' : 'rgba(26, 35, 126, 0.08)',
        mb: 2
      }}>
        {icon}
      </Box>
      <Typography 
        variant="h6" 
        sx={{ 
          mb: 1,
          fontSize: '1.1rem',
          fontWeight: 600,
          fontFamily: '"Poppins", sans-serif',
          color: isDarkMode ? '#fff' : '#1A237E'
        }}
      >
        {title}
      </Typography>
      <Typography 
        variant="body2" 
        sx={{ 
          fontSize: '0.85rem',
          color: isDarkMode ? 'grey.400' : 'text.secondary',
          fontFamily: '"Inter", sans-serif',
          lineHeight: 1.5
        }}
      >
        {description}
      </Typography>
    </Paper>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 600,
            letterSpacing: '0.2px',
            color: isDarkMode ? '#fff' : '#1A237E',
            fontFamily: '"Poppins", sans-serif',
            fontSize: '1.8rem'
          }}
        >
          Welcome to Artis Laminate Portal
        </Typography>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            mt: 0.5,
            color: isDarkMode ? 'grey.400' : 'text.secondary',
            fontWeight: 400,
            fontFamily: '"Inter", sans-serif',
            fontSize: '0.9rem',
            letterSpacing: '0.3px'
          }}
        >
          Manage your inventory, products, and orders efficiently
        </Typography>
      </Box>

      {/* Navigation Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <NavigationCard
            title="Product Catalog"
            description="Manage your products, categories, and suppliers"
            icon={<CategoryIcon sx={{ fontSize: 40, color: isDarkMode ? '#90CAF9' : '#1A237E' }} />}
            onClick={() => setCurrentPage('catalog')}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <NavigationCard
            title="Inventory Management"
            description="Track stock levels and manage transactions"
            icon={<InventoryIcon sx={{ fontSize: 40, color: isDarkMode ? '#90CAF9' : '#1A237E' }} />}
            onClick={() => setCurrentPage('inventory')}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <NavigationCard
            title="Orders"
            description="Create and manage design paper orders"
            icon={<ShoppingCartIcon sx={{ fontSize: 40, color: isDarkMode ? '#90CAF9' : '#1A237E' }} />}
            onClick={() => setCurrentPage('orders')}
          />
        </Grid>
      </Grid>

      {/* Quick Stats */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper 
            sx={{ 
              p: 3,
              background: isDarkMode 
                ? 'linear-gradient(45deg, #1A237E 30%, #283593 90%)'
                : 'linear-gradient(45deg, #E8EAF6 30%, #C5CAE9 90%)',
              boxShadow: 2
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 2,
                fontSize: '1.1rem',
                fontWeight: 600,
                fontFamily: '"Poppins", sans-serif'
              }}
            >
              Quick Stats
            </Typography>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                fontSize: '0.75rem',
                color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                fontFamily: '"Inter", sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              {/* stat labels */}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Total Designs
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontSize: '1.5rem',
                      fontWeight: 600,
                      fontFamily: '"Poppins", sans-serif',
                      color: isDarkMode ? '#90CAF9' : '#1A237E'
                    }}
                  >
                    {stats.totalProducts}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Low Stock Items
                  </Typography>
                  <Typography variant="h4" sx={{ color: '#d32f2f' }}>
                    {stats.lowStockItems}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Total Inventory
                  </Typography>
                  <Typography variant="h4" sx={{ color: isDarkMode ? '#90CAF9' : '#1A237E' }}>
                    {`${stats.totalInventory.toLocaleString()} kgs`}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <TopPerformersCard data={stats.topPerformers} />
        </Grid>

        <Grid item xs={12}>
          <MonthlyConsumptionCard 
            data={stats.monthlyConsumption}
            suppliers={stats.suppliers}
            categories={stats.categories}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardHome; 