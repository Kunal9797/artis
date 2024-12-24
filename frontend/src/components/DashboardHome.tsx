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

interface Activity {
  id: string;
  type: 'INVENTORY_IN' | 'INVENTORY_OUT' | 'ORDER_CREATED' | 'PRODUCT_ADDED';
  description: string;
  timestamp: Date;
}

const normalizeSupplierCode = (supplierCode: string): string => {
  return supplierCode.replace(/\s+/g, '').toUpperCase();
};

const DashboardHome: React.FC<{ setCurrentPage: (page: string) => void }> = ({ setCurrentPage }) => {
  const { isDarkMode } = useTheme();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalInventory: 0,
    lowStockItems: 0
  });
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch both inventory and products data
        const [inventoryResponse, productsResponse] = await Promise.all([
          getAllInventory(),
          api.get('/products')
        ]);
        
        const inventoryData = Array.isArray(inventoryResponse?.data) ? inventoryResponse.data : [];
        const productsData = Array.isArray(productsResponse?.data) ? productsResponse.data : [];
        
        console.log('Products Data:', productsData);
        
        // Get unique designs from products catalog
        const uniqueDesigns = new Set(
          productsData
            .filter(p => p.supplierCode && p.supplier)
            .map(p => {
              const normalizedCode = normalizeSupplierCode(p.supplierCode || '');
              return `${normalizedCode}_${p.supplier}`;
            })
        );
        
        console.log('Final unique designs set:', Array.from(uniqueDesigns));

        // Calculate inventory stats
        const total = inventoryData.reduce((sum, item) => {
          const stockValue = parseFloat(item.currentStock) || 0;
          return sum + stockValue;
        }, 0);
        
        const lowStock = inventoryData.filter(item => {
          const stockValue = parseFloat(item.currentStock) || 0;
          return stockValue < 100;
        }).length;

        setStats({
          totalProducts: uniqueDesigns.size,
          totalInventory: Math.round(total * 100) / 100,
          lowStockItems: lowStock
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

        {/* Recent Activity */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 2,
                fontSize: '1.1rem',
                fontWeight: 600,
                fontFamily: '"Poppins", sans-serif'
              }}
            >
              Recent Activity
            </Typography>
            <List>
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <ListItem>
                      <ListItemIcon>
                        {activity.type === 'INVENTORY_IN' && (
                          <TrendingUpIcon sx={{ color: 'success.main' }} />
                        )}
                        {activity.type === 'INVENTORY_OUT' && (
                          <TrendingDownIcon sx={{ color: 'error.main' }} />
                        )}
                        {activity.type === 'PRODUCT_ADDED' && (
                          <AddCircleIcon sx={{ color: 'info.main' }} />
                        )}
                        {activity.type === 'ORDER_CREATED' && (
                          <ShoppingBagIcon sx={{ color: 'warning.main' }} />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={activity.description}
                        secondary={new Date(activity.timestamp).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        primaryTypographyProps={{
                          sx: { 
                            fontWeight: 500,
                            color: isDarkMode ? 'white' : 'text.primary'
                          }
                        }}
                        secondaryTypographyProps={{
                          sx: { 
                            color: isDarkMode ? 'grey.400' : 'text.secondary',
                            fontSize: '0.75rem'
                          }
                        }}
                      />
                    </ListItem>
                    {index < recentActivity.length - 1 && (
                      <Divider variant="inset" component="li" />
                    )}
                  </React.Fragment>
                ))
              ) : (
                <ListItem>
                  <ListItemText
                    primary="No recent activity"
                    secondary="New activities will appear here"
                    sx={{ textAlign: 'center' }}
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardHome; 