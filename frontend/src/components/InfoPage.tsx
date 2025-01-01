import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { useTheme } from '../context/ThemeContext';
import InventoryIcon from '@mui/icons-material/Inventory';
import CategoryIcon from '@mui/icons-material/Category';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import DescriptionIcon from '@mui/icons-material/Description';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { alpha } from '@mui/material/styles';

const InfoPage: React.FC = () => {
  const { isDarkMode } = useTheme();

  const sections = [
    {
      title: "Inventory Management",
      icon: <InventoryIcon />,
      items: [
        "Real-time stock level tracking in List/Grid view",
        "Individual and bulk transaction management",
        "Low stock alerts and notifications",
        "Transaction history with filtering",
        "Excel import/export functionality",
        "Stock level sorting and filtering"
      ]
    },
    {
      title: "Product Catalog",
      icon: <CategoryIcon />,
      items: [
        "Advanced search with multiple parameters",
        "Multi-level filtering system",
        "Supplier code grouping",
        "Product CRUD operations",
        "Bulk product import via Excel",
        "Dynamic column sorting"
      ]
    },
    {
      title: "Orders & Documents",
      icon: <ShoppingCartIcon />,
      items: [
        "Supplier-specific design paper orders",
        "Real-time stock level integration",
        "Custom letter generation with formatting",
        "Professional letterhead integration",
        "Font customization options",
        "PDF document generation"
      ]
    },
    {
      title: "Analytics & Reports",
      icon: <AnalyticsIcon />,
      items: [
        "Stock movement analysis",
        "Product performance metrics",
        "Inventory level reports",
        "Transaction summaries",
        "Export capabilities",
        "Data visualization"
      ]
    },
    {
      title: "Document Generation",
      icon: <DescriptionIcon />,
      items: [
        "Professional PDF formatting",
        "Company letterhead integration",
        "Multiple document templates",
        "Custom font support",
        "Automatic date formatting",
        "Error handling"
      ]
    },
    {
      title: "System Features",
      icon: <DarkModeIcon />,
      items: [
        "Dark/Light theme support",
        "Responsive design across devices",
        "Real-time data updates",
        "Input validation",
        "Error handling & recovery",
        "User-friendly interface"
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
          color: isDarkMode ? '#fff' : '#2b2a29',
          textAlign: 'center'
        }}
      >
        System Features & Capabilities
      </Typography>

      <Grid container spacing={3}>
        {sections.map((section, index) => (
          <Grid item xs={12} md={6} lg={4} key={index}>
            <Paper 
              elevation={3}
              sx={{ 
                p: 3, 
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: (theme) => `0 8px 24px ${alpha(theme.palette.primary.main, 0.2)}`
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ 
                  mr: 2, 
                  color: isDarkMode ? '#90CAF9' : '#1A237E',
                  '& svg': { fontSize: 28 }
                }}>
                  {section.icon}
                </Box>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: isDarkMode ? '#90CAF9' : '#1A237E',
                    fontWeight: 600
                  }}
                >
                  {section.title}
                </Typography>
              </Box>

              <List dense>
                {section.items.map((item, itemIndex) => (
                  <ListItem 
                    key={itemIndex}
                    sx={{ 
                      py: 0.5,
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)'
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <Box 
                        sx={{ 
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: isDarkMode ? '#90CAF9' : '#1A237E'
                        }} 
                      />
                    </ListItemIcon>
                    <ListItemText 
                      primary={item}
                      primaryTypographyProps={{
                        fontSize: '0.95rem',
                        lineHeight: 1.4
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default InfoPage; 