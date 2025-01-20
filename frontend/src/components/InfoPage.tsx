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
  Fade,
  Divider,
} from '@mui/material';
import { useTheme } from '../context/ThemeContext';
import InventoryIcon from '@mui/icons-material/Inventory';
import CategoryIcon from '@mui/icons-material/Category';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import DescriptionIcon from '@mui/icons-material/Description';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import MapIcon from '@mui/icons-material/Map';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { alpha } from '@mui/material/styles';

const InfoPage: React.FC = () => {
  const { isDarkMode } = useTheme();

  const sections = [
    {
      title: "Inventory Management",
      icon: <InventoryIcon />,
      description: "Comprehensive inventory tracking and management system",
      items: [
        "Real-time stock level tracking in List/Grid view",
        "Individual and bulk transaction management",
        "Low stock alerts and notifications",
        "Transaction history with filtering",
        "Excel import/export functionality",
        "Stock level sorting and filtering",
        "Mobile-responsive inventory cards",
        "Detailed product information dialogs"
      ]
    },
    {
      title: "Product Catalog",
      icon: <CategoryIcon />,
      description: "Advanced product management and organization",
      items: [
        "Advanced search with multiple parameters",
        "Multi-level filtering system",
        "Supplier code grouping and normalization",
        "Product CRUD operations",
        "Bulk product import via Excel",
        "Dynamic column sorting",
        "Catalog tag system",
        "AND/OR catalog filtering"
      ]
    },
    {
      title: "Orders & Documents",
      icon: <ShoppingCartIcon />,
      description: "Streamlined order processing and document generation",
      items: [
        "Supplier-specific design paper orders",
        "Real-time stock level integration",
        "Custom letter generation with formatting",
        "Professional letterhead integration",
        "Font customization options",
        "PDF document generation",
        "Multiple supplier templates",
        "Order tracking system"
      ]
    },
    {
      title: "Distributor Network",
      icon: <MapIcon />,
      description: "Interactive distributor mapping and management",
      items: [
        "Interactive map interface",
        "Distributor location plotting",
        "State-wise distribution visualization",
        "Geolocation services",
        "Territory management",
        "Distributor information cards",
        "Search and filter capabilities",
        "Export distributor data"
      ]
    },
    {
      title: "Dashboard & Analytics",
      icon: <AnalyticsIcon />,
      description: "Comprehensive data visualization and analysis",
      items: [
        "Quick statistics overview",
        "Stock movement analysis",
        "Product performance metrics",
        "Inventory level reports",
        "Transaction summaries",
        "Export capabilities",
        "Real-time updates",
        "Visual data representation"
      ]
    },
    {
      title: "System Features",
      icon: <DarkModeIcon />,
      description: "Modern UI/UX and technical capabilities",
      items: [
        "Dark/Light theme support",
        "Responsive design across devices",
        "Real-time data updates",
        "Advanced input validation",
        "Error handling & recovery",
        "User-friendly interface",
        "Workspace organization",
        "Performance optimizations"
      ]
    }
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Fade in timeout={800}>
        <Box sx={{ 
          textAlign: 'center', 
          mb: 6,
          position: 'relative'
        }}>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 700,
              color: isDarkMode ? '#fff' : '#1A237E',
              mb: 2,
              fontFamily: '"Poppins", sans-serif',
              position: 'relative',
              display: 'inline-block',
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: -8,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '80px',
                height: '4px',
                background: isDarkMode ? 
                  'linear-gradient(90deg, #90CAF9 0%, #1A237E 100%)' : 
                  'linear-gradient(90deg, #1A237E 0%, #90CAF9 100%)',
                borderRadius: '2px'
              }
            }}
          >
            System Features
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
              maxWidth: '800px',
              margin: '0 auto',
              fontWeight: 400
            }}
          >
            Comprehensive inventory and product management platform with advanced features
          </Typography>
        </Box>
      </Fade>

      <Grid container spacing={3}>
        {sections.map((section, index) => (
          <Grid item xs={12} md={6} lg={4} key={index}>
            <Fade in timeout={800 + (index * 200)}>
              <Paper 
                elevation={3}
                sx={{ 
                  p: 3, 
                  height: '100%',
                  transition: 'all 0.3s ease',
                  background: isDarkMode ? 
                    'linear-gradient(145deg, rgba(26,35,126,0.1), rgba(144,202,249,0.05))' : 
                    'linear-gradient(145deg, rgba(255,255,255,1), rgba(144,202,249,0.1))',
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${isDarkMode ? 'rgba(144,202,249,0.1)' : 'rgba(26,35,126,0.1)'}`,
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: (theme) => `0 8px 24px ${alpha(theme.palette.primary.main, 0.2)}`
                  }
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 2,
                  pb: 2,
                  borderBottom: `1px solid ${isDarkMode ? 'rgba(144,202,249,0.1)' : 'rgba(26,35,126,0.1)'}`
                }}>
                  <Box sx={{ 
                    mr: 2, 
                    color: isDarkMode ? '#90CAF9' : '#1A237E',
                    '& svg': { 
                      fontSize: 32,
                      filter: `drop-shadow(0 2px 4px ${isDarkMode ? 'rgba(144,202,249,0.2)' : 'rgba(26,35,126,0.2)'})`
                    }
                  }}>
                    {section.icon}
                  </Box>
                  <Box>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        color: isDarkMode ? '#90CAF9' : '#1A237E',
                        fontWeight: 600,
                        mb: 0.5
                      }}
                    >
                      {section.title}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                        fontStyle: 'italic'
                      }}
                    >
                      {section.description}
                    </Typography>
                  </Box>
                </Box>

                <List dense>
                  {section.items.map((item, itemIndex) => (
                    <ListItem 
                      key={itemIndex}
                      sx={{ 
                        py: 0.75,
                        color: isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)'
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        <Box 
                          sx={{ 
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: isDarkMode ? '#90CAF9' : '#1A237E',
                            boxShadow: `0 0 8px ${isDarkMode ? 'rgba(144,202,249,0.4)' : 'rgba(26,35,126,0.4)'}`
                          }} 
                        />
                      </ListItemIcon>
                      <ListItemText 
                        primary={item}
                        primaryTypographyProps={{
                          fontSize: '0.95rem',
                          lineHeight: 1.4,
                          fontWeight: 400
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Fade>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default InfoPage; 