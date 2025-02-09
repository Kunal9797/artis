import React, { useState } from 'react';
import {
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
  Card,
  CardContent,
  useTheme
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface PerformanceMetricsProps {
  personalView?: boolean;
  zoneView?: boolean;
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ 
  personalView = false,
  zoneView = false 
}) => {
  const theme = useTheme();
  const [timeRange, setTimeRange] = useState('month');

  // Mock data - replace with API calls
  const salesData = [
    { month: 'Jan', sales: 4000, target: 3000, lastYear: 3800 },
    { month: 'Feb', sales: 3500, target: 3000, lastYear: 3200 },
    { month: 'Mar', sales: 4500, target: 3500, lastYear: 4000 },
    { month: 'Apr', sales: 3800, target: 3500, lastYear: 3600 },
    { month: 'May', sales: 4800, target: 4000, lastYear: 4200 },
    { month: 'Jun', sales: 5000, target: 4000, lastYear: 4500 }
  ];

  const performanceMetrics = [
    {
      title: 'Target Achievement',
      value: '92%',
      trend: '+5%',
      color: theme.palette.success.main
    },
    {
      title: 'Conversion Rate',
      value: '28%',
      trend: '+2%',
      color: theme.palette.primary.main
    },
    {
      title: 'Avg Deal Size',
      value: '₹42K',
      trend: '+8%',
      color: theme.palette.info.main
    }
  ];

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3 
      }}>
        <Typography variant="h6">
          {personalView 
            ? 'My Performance' 
            : zoneView 
              ? 'Zone Performance' 
              : 'Overall Performance'}
        </Typography>
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={(e, value) => value && setTimeRange(value)}
          size="small"
        >
          <ToggleButton value="week">Week</ToggleButton>
          <ToggleButton value="month">Month</ToggleButton>
          <ToggleButton value="quarter">Quarter</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Performance Metrics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {performanceMetrics.map((metric) => (
          <Grid item xs={12} md={4} key={metric.title}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" variant="subtitle2">
                  {metric.title}
                </Typography>
                <Typography variant="h4" sx={{ my: 1 }}>
                  {metric.value}
                </Typography>
                <Typography 
                  variant="body2"
                  color={metric.trend.startsWith('+') ? 'success.main' : 'error.main'}
                >
                  {metric.trend} vs last {timeRange}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Sales Trend Chart */}
      <Box sx={{ height: 300, mt: 4 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="sales" 
              stroke={theme.palette.primary.main} 
              name="Sales"
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="target" 
              stroke={theme.palette.warning.main} 
              name="Target"
              strokeDasharray="5 5"
            />
            <Line 
              type="monotone" 
              dataKey="lastYear" 
              stroke={theme.palette.grey[400]} 
              name="Last Year"
              strokeDasharray="3 3"
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>

      {/* Performance Comparison Chart */}
      {!personalView && (
        <Box sx={{ height: 300, mt: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {zoneView ? 'Executive Performance' : 'Zone Performance'}
          </Typography>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { name: zoneView ? 'Exec 1' : 'Zone A', current: 4000, target: 4500 },
              { name: zoneView ? 'Exec 2' : 'Zone B', current: 3500, target: 4000 },
              { name: zoneView ? 'Exec 3' : 'Zone C', current: 4800, target: 4500 },
              { name: zoneView ? 'Exec 4' : 'Zone D', current: 3800, target: 4000 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="current" fill={theme.palette.primary.main} name="Current" />
              <Bar dataKey="target" fill={theme.palette.warning.main} name="Target" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Box>
  );
};

export default PerformanceMetrics; 