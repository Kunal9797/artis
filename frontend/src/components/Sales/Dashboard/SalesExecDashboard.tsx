import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  useTheme,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Store as StoreIcon,
  Assignment as LeadsIcon,
  DirectionsCar as VisitsIcon
} from '@mui/icons-material';
import PerformanceMetrics from './components/PerformanceMetrics';
import DealerVisits from './components/DealerVisits';
import LeadManagement from './components/LeadManagement';

const SalesExecDashboard: React.FC = () => {
  const theme = useTheme();
  console.log("Rendering SalesExecDashboard"); // Debug log

  // Add loading states
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<any>(null);

  React.useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        // For now, use mock data
        const mockData = {
          stats: {
            monthlySales: '₹85K',
            dealers: 15,
            activeLeads: 8,
            visitsToday: 4
          }
        };
        setData(mockData);
        console.log("Dashboard data loaded:", mockData); // Debug log
      } catch (err) {
        console.error("Error loading dashboard:", err);
        setError("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  const quickStats = [
    {
      title: 'Monthly Sales',
      value: '₹85K',
      icon: <TrendingUpIcon />,
      trend: '+12%',
      color: theme.palette.success.main
    },
    {
      title: 'My Dealers',
      value: '15',
      icon: <StoreIcon />,
      trend: '+1',
      color: theme.palette.primary.main
    },
    {
      title: 'Active Leads',
      value: '8',
      icon: <LeadsIcon />,
      trend: '+3',
      color: theme.palette.warning.main
    },
    {
      title: 'Visits Today',
      value: '4',
      icon: <VisitsIcon />,
      trend: '2 pending',
      color: theme.palette.info.main
    }
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Sales Executive Dashboard
      </Typography>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {quickStats.map((stat) => (
          <Grid item xs={12} sm={6} md={3} key={stat.title}>
            <Card>
              <CardContent sx={{ 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Box>
                  <Typography color="textSecondary" variant="subtitle2">
                    {stat.title}
                  </Typography>
                  <Typography variant="h4" sx={{ my: 1 }}>
                    {stat.value}
                  </Typography>
                  <Typography 
                    variant="body2"
                    color={stat.trend.startsWith('+') ? 'success.main' : 'info.main'}
                  >
                    {stat.trend}
                  </Typography>
                </Box>
                <Box 
                  sx={{ 
                    p: 1, 
                    borderRadius: 2,
                    bgcolor: `${stat.color}15`
                  }}
                >
                  {React.cloneElement(stat.icon, { 
                    sx: { fontSize: 32, color: stat.color } 
                  })}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Personal Performance */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <PerformanceMetrics personalView />
          </Paper>
        </Grid>

        {/* Today's Visits */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <DealerVisits />
          </Paper>
        </Grid>

        {/* Lead Management */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <LeadManagement />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SalesExecDashboard; 