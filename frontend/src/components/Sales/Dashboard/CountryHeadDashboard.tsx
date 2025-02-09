import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  useTheme
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Store as StoreIcon,
  Assignment as LeadsIcon
} from '@mui/icons-material';
import PerformanceMetrics from "./components/PerformanceMetrics";
import TeamOverview from "./components/TeamOverview";
import ActivitySummary from "./components/ActivitySummary";

const CountryHeadDashboard: React.FC = () => {
  const theme = useTheme();

  const quickStats = [
    {
      title: 'Total Sales',
      value: '₹1.2M',
      icon: <TrendingUpIcon />,
      trend: '+15%',
      color: theme.palette.success.main
    },
    {
      title: 'Active Dealers',
      value: '145',
      icon: <StoreIcon />,
      trend: '+3',
      color: theme.palette.primary.main
    },
    {
      title: 'Team Members',
      value: '32',
      icon: <PeopleIcon />,
      trend: '0',
      color: theme.palette.info.main
    },
    {
      title: 'Open Leads',
      value: '67',
      icon: <LeadsIcon />,
      trend: '+12',
      color: theme.palette.warning.main
    }
  ];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Country Head Dashboard
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
                    color={stat.trend.startsWith('+') ? 'success.main' : 'error.main'}
                  >
                    {stat.trend} from last month
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
        {/* Performance Metrics */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <PerformanceMetrics />
          </Paper>
        </Grid>

        {/* Team Overview */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <TeamOverview />
          </Paper>
        </Grid>

        {/* Activity Summary */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <ActivitySummary />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CountryHeadDashboard; 