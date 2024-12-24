import React from 'react';
import { Box, Typography, Paper, Grid, Divider } from '@mui/material';
import { useTheme } from '../context/ThemeContext';

const InfoPage: React.FC = () => {
  const { isDarkMode } = useTheme();

  const sections = [
    {
      title: "Inventory Management",
      items: [
        "View current stock levels in List or Grid view",
        "Sort inventory by stock levels (ascending/descending)",
        "Add individual transactions (IN/OUT)",
        "Bulk upload transactions via Excel",
        "View transaction history for each product",
        "Clear all inventory data (admin only)"
      ]
    },
    {
      title: "Product Catalog",
      items: [
        "Search products by code, name, supplier, or category",
        "Filter by catalog, supplier, and category",
        "Group similar designs by supplier code",
        "Add, edit, or delete products",
        "Bulk import products from Excel",
        "Sort products by clicking column headers"
      ]
    },
    {
      title: "Orders Management",
      items: [
        "Create design paper orders by supplier",
        "Filter and search products within orders",
        "View current stock levels while ordering",
        "Set order quantities with validation",
        "Generate formatted order documents",
        "Track order history"
      ]
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 4, 
          fontWeight: 600,
          color: isDarkMode ? '#fff' : '#2b2a29'
        }}
      >
        System Guide
      </Typography>

      <Grid container spacing={3}>
        {sections.map((section, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Paper 
              elevation={3}
              sx={{ 
                p: 3, 
                height: '100%',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)'
                }
              }}
            >
              <Typography 
                variant="h5" 
                sx={{ 
                  mb: 2,
                  color: isDarkMode ? '#90CAF9' : '#1A237E',
                  fontWeight: 600
                }}
              >
                {section.title}
              </Typography>
              
              <Divider sx={{ mb: 2 }} />

              {section.items.map((item, itemIndex) => (
                <Box 
                  key={itemIndex} 
                  sx={{ 
                    display: 'flex',
                    alignItems: 'flex-start',
                    mb: 1.5
                  }}
                >
                  <Typography 
                    sx={{ 
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                      '&::before': {
                        content: '"•"',
                        marginRight: '8px',
                        color: isDarkMode ? '#90CAF9' : '#1A237E'
                      }
                    }}
                  >
                    {item}
                  </Typography>
                </Box>
              ))}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default InfoPage; 