import React from 'react';
import { Box, Typography, Grid, Paper } from '@mui/material';
import PerformanceMetrics from './components/PerformanceMetrics';

const SalesExecDashboard: React.FC = () => {
  console.log("Rendering SalesExecDashboard"); // Debug log

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Sales Executive Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Performance Metrics */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <PerformanceMetrics personalView />
          </Paper>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Today's Overview
            </Typography>
            {/* Add quick stats here */}
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Recent Activity
            </Typography>
            {/* Add recent activity list here */}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SalesExecDashboard; 