import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
  Card,
  CardContent,
  useTheme,
  CircularProgress
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
import { salesApi } from '../../../../services/salesApi';
import { PerformanceMetric } from '../../../../types/sales';

interface PerformanceMetricsProps {
  personalView?: boolean;
  zoneView?: boolean;
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ 
  personalView = false,
  zoneView = false 
}) => {
  const theme = useTheme();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetric | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const view = personalView ? 'personal' : zoneView ? 'zone' : 'country';
        const response = await salesApi.getPerformanceMetrics({ view, timeRange });
        setMetrics(response.data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching metrics:', err);
        setError(err.response?.data?.error || 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [timeRange, personalView, zoneView]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ p: 3, color: 'error.main' }}><Typography>{error}</Typography></Box>;
  if (!metrics) return null;

  const performanceMetrics = [
    {
      title: 'Target Achievement',
      value: `${metrics.metrics.targetAchievement.toFixed(1) || '0.0'}%`,
      trend: metrics.metrics.targetAchievementTrend || '0.0%',
      color: theme.palette.success.main
    },
    {
      title: 'Visits Completed',
      value: metrics.metrics.visitsCompleted.toString() || '0',
      trend: metrics.metrics.visitsCompletedTrend || '0.0%',
      color: theme.palette.primary.main
    },
    {
      title: 'Avg Deal Size',
      value: `₹${(metrics.metrics.avgDealSize/1000 || 0).toFixed(1)}K`,
      trend: metrics.metrics.avgDealSizeTrend || '0.0%',
      color: theme.palette.info.main
    }
  ];

  return (
    <Box>
      {/* Time Range Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          {personalView ? 'My Performance' : zoneView ? 'Zone Performance' : 'Overall Performance'}
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

      {/* Metric Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {performanceMetrics.map((metric) => (
          <Grid item xs={12} md={4} key={metric.title}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" variant="subtitle2">{metric.title}</Typography>
                <Typography variant="h4" sx={{ my: 1 }}>{metric.value}</Typography>
                <Typography variant="body2" color={metric.trend.startsWith('+') ? 'success.main' : 'error.main'}>
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
          <LineChart data={metrics.timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => new Date(date).toLocaleDateString()}
            />
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
          </LineChart>
        </ResponsiveContainer>
      </Box>

      {/* Comparison Chart for non-personal views */}
      {!personalView && metrics.comparisonData && (
        <Box sx={{ height: 300, mt: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {zoneView ? 'Executive Performance' : 'Zone Performance'}
          </Typography>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics.comparisonData}>
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