import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Card,
  CardContent,
  Skeleton,
  SelectChangeEvent,
  Chip
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp as TrendingUpIcon,
  BarChart as BarChartIcon,
  Timeline as TimelineIcon,
  DonutLarge as DonutIcon
} from '@mui/icons-material';
import distributorOrderService from '../services/distributorOrderService';
import dayjs from 'dayjs';
import DistributorTimeSeriesChart from './DistributorTimeSeriesChart';
import DistributorVolumeAnalysis from './DistributorVolumeAnalysis';

interface ThicknessData {
  month: string;
  thickness_72_92: number;
  thickness_08: number;
  thickness_1mm: number;
  total: number;
}

interface DistributorData {
  name: string;
  volume: number;
  orders: number;
  percentage?: number;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0', '#ffb347', '#67b7dc', '#a4de6c', '#ffd93d'];

const DistributorAnalytics: React.FC = () => {
  const [thicknessData, setThicknessData] = useState<ThicknessData[]>([]);
  const [distributorData, setDistributorData] = useState<DistributorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6months');
  const [topCount, setTopCount] = useState('10');
  const [chartType, setChartType] = useState<'line' | 'area' | 'stacked'>('area');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange, topCount, startDate, endDate]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Calculate date range
      let start = startDate;
      let end = endDate;

      if (!start || !end) {
        const now = dayjs();
        end = now.format('YYYY-MM-DD');

        switch (timeRange) {
          case '3months':
            start = now.subtract(3, 'month').format('YYYY-MM-DD');
            break;
          case '6months':
            start = now.subtract(6, 'month').format('YYYY-MM-DD');
            break;
          case '1year':
            start = now.subtract(1, 'year').format('YYYY-MM-DD');
            break;
          default:
            start = now.subtract(6, 'month').format('YYYY-MM-DD');
        }
      }

      // Load thickness trends
      const trendsResponse = await distributorOrderService.getTrends('monthly', start, end);
      if (trendsResponse.success && trendsResponse.data) {
        const formattedThickness = trendsResponse.data.map((item: any) => ({
          month: item.period.substring(0, 7), // Format as YYYY-MM
          thickness_72_92: parseInt(item.thickness_72_92_total || 0),
          thickness_08: parseInt(item.thickness_08_total || 0),
          thickness_1mm: parseInt(item.thickness_1mm_total || 0),
          total: parseInt(item.total_volume || 0)
        }));
        setThicknessData(formattedThickness);
      }

      // Load top distributors
      const topResponse = await distributorOrderService.getTopDistributors(start, end, parseInt(topCount));
      if (topResponse.success && topResponse.data) {
        const totalVolume = topResponse.data.reduce((sum: number, d: any) => sum + parseInt(d.total_volume), 0);
        const formattedDistributors = topResponse.data.map((dist: any) => ({
          name: dist.distributor_name,
          volume: parseInt(dist.total_volume),
          orders: parseInt(dist.total_orders),
          percentage: ((parseInt(dist.total_volume) / totalVolume) * 100).toFixed(1)
        }));
        setDistributorData(formattedDistributors);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderThicknessEvolution = () => {
    if (loading) {
      return <Skeleton variant="rectangular" height={400} />;
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        {chartType === 'line' ? (
          <LineChart data={thicknessData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value: any) => value.toLocaleString()} />
            <Legend />
            <Line type="monotone" dataKey="thickness_72_92" stroke="#8884d8" name=".72/.82/.92mm" strokeWidth={2} />
            <Line type="monotone" dataKey="thickness_08" stroke="#82ca9d" name="0.8mm" strokeWidth={2} />
            <Line type="monotone" dataKey="thickness_1mm" stroke="#ffc658" name="1mm" strokeWidth={2} />
          </LineChart>
        ) : chartType === 'area' ? (
          <AreaChart data={thicknessData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value: any) => value.toLocaleString()} />
            <Legend />
            <Area type="monotone" dataKey="thickness_72_92" stackId="1" stroke="#8884d8" fill="#8884d8" name=".72/.82/.92mm" />
            <Area type="monotone" dataKey="thickness_08" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="0.8mm" />
            <Area type="monotone" dataKey="thickness_1mm" stackId="1" stroke="#ffc658" fill="#ffc658" name="1mm" />
          </AreaChart>
        ) : (
          <BarChart data={thicknessData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value: any) => value.toLocaleString()} />
            <Legend />
            <Bar dataKey="thickness_72_92" stackId="a" fill="#8884d8" name=".72/.82/.92mm" />
            <Bar dataKey="thickness_08" stackId="a" fill="#82ca9d" name="0.8mm" />
            <Bar dataKey="thickness_1mm" stackId="a" fill="#ffc658" name="1mm" />
          </BarChart>
        )}
      </ResponsiveContainer>
    );
  };

  const renderTopDistributors = () => {
    if (loading) {
      return <Skeleton variant="rectangular" height={400} />;
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={distributorData}
          layout="horizontal"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" width={100} />
          <Tooltip
            formatter={(value: any) => value.toLocaleString()}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <Paper sx={{ p: 1 }}>
                    <Typography variant="subtitle2">{data.name}</Typography>
                    <Typography variant="body2">Volume: {data.volume.toLocaleString()}</Typography>
                    <Typography variant="body2">Orders: {data.orders}</Typography>
                    <Typography variant="body2">Share: {data.percentage}%</Typography>
                  </Paper>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="volume" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderDistributorPie = () => {
    if (loading) {
      return <Skeleton variant="rectangular" height={400} />;
    }

    const pieData = distributorData.slice(0, 5).map((d, index) => ({
      ...d,
      color: COLORS[index % COLORS.length]
    }));

    return (
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) => `${entry.name}: ${entry.percentage}%`}
            outerRadius={120}
            fill="#8884d8"
            dataKey="volume"
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: any) => value.toLocaleString()} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const calculateSummaryStats = () => {
    const totalVolume = distributorData.reduce((sum, d) => sum + d.volume, 0);
    const totalOrders = distributorData.reduce((sum, d) => sum + d.orders, 0);
    const avgOrderSize = totalOrders > 0 ? Math.round(totalVolume / totalOrders) : 0;

    const latestMonth = thicknessData[thicknessData.length - 1];
    const thickness08Percentage = latestMonth
      ? ((latestMonth.thickness_08 / latestMonth.total) * 100).toFixed(1)
      : '0';

    return {
      totalVolume,
      totalOrders,
      avgOrderSize,
      thickness08Percentage
    };
  };

  const stats = calculateSummaryStats();

  return (
    <Box>
      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={(e: SelectChangeEvent) => setTimeRange(e.target.value)}
              >
                <MenuItem value="3months">Last 3 Months</MenuItem>
                <MenuItem value="6months">Last 6 Months</MenuItem>
                <MenuItem value="1year">Last Year</MenuItem>
                <MenuItem value="custom">Custom Range</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Top Distributors</InputLabel>
              <Select
                value={topCount}
                label="Top Distributors"
                onChange={(e: SelectChangeEvent) => setTopCount(e.target.value)}
              >
                <MenuItem value="5">Top 5</MenuItem>
                <MenuItem value="10">Top 10</MenuItem>
                <MenuItem value="15">Top 15</MenuItem>
                <MenuItem value="20">Top 20</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {timeRange === 'custom' && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </>
          )}
        </Grid>
      </Paper>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Total Volume (Selected Period)
              </Typography>
              <Typography variant="h5">
                {stats.totalVolume.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Total Orders
              </Typography>
              <Typography variant="h5">
                {stats.totalOrders.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Avg Order Size
              </Typography>
              <Typography variant="h5">
                {stats.avgOrderSize.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                0.8mm Dominance
              </Typography>
              <Typography variant="h5">
                {stats.thickness08Percentage}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Thickness Evolution Chart */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimelineIcon color="primary" />
                Thickness Evolution Over Time
              </Typography>
              <ToggleButtonGroup
                value={chartType}
                exclusive
                onChange={(e, value) => value && setChartType(value)}
                size="small"
              >
                <ToggleButton value="line">Line</ToggleButton>
                <ToggleButton value="area">Area</ToggleButton>
                <ToggleButton value="stacked">Stacked</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {renderThicknessEvolution()}
            <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip label=".72/.82/.92mm" sx={{ bgcolor: '#8884d8', color: 'white' }} size="small" />
              <Chip label="0.8mm (Most Popular)" sx={{ bgcolor: '#82ca9d', color: 'white' }} size="small" />
              <Chip label="1mm" sx={{ bgcolor: '#ffc658', color: 'white' }} size="small" />
            </Box>
          </Paper>
        </Grid>

        {/* Top Distributors Bar Chart */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <BarChartIcon color="primary" />
              Top {topCount} Distributors by Volume
            </Typography>
            {renderTopDistributors()}
          </Paper>
        </Grid>

        {/* Market Share Pie Chart */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <DonutIcon color="primary" />
              Top 5 Market Share
            </Typography>
            {renderDistributorPie()}
          </Paper>
        </Grid>

        {/* Monthly Comparison */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUpIcon color="primary" />
              Volume Trend Analysis
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={thicknessData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: any) => value.toLocaleString()} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#8884d8"
                  name="Total Volume"
                  strokeWidth={3}
                  dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Interactive Distributor/Location Time Series */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimelineIcon color="primary" />
          Custom Time Series Analysis
        </Typography>
        <DistributorTimeSeriesChart />
      </Box>

      {/* Volume Analysis with Table */}
      <Box sx={{ mt: 3 }}>
        <DistributorVolumeAnalysis />
      </Box>
    </Box>
  );
};

export default DistributorAnalytics;