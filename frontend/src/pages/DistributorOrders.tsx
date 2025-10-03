import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  IconButton,
  Chip,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  SelectChangeEvent,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Store as StoreIcon,
  Inventory as InventoryIcon,
  Analytics as AnalyticsIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
// Date picker imports temporarily removed due to version issues
// We'll use regular text fields for dates for now
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import dayjs from 'dayjs';
import distributorOrderService from '../services/distributorOrderService';
import DistributorRankings from '../components/DistributorRankings';
import DistributorAnalytics from '../components/DistributorAnalytics';

// Mock data for fallback
const mockOrders = [
  {
    id: 1,
    distributor_name: 'Rajgiri Ply',
    location: 'Mumbai',
    state: 'Maharashtra',
    order_date: '2025-07-17',
    thickness_72_92: 0,
    thickness_08: 40,
    thickness_1mm: 0,
    total_pieces: 40,
    month_year: 'July 2025'
  },
  {
    id: 2,
    distributor_name: 'Star Laminate',
    location: 'Thane',
    state: 'Maharashtra',
    order_date: '2025-07-17',
    thickness_72_92: 0,
    thickness_08: 2449,
    thickness_1mm: 0,
    total_pieces: 2449,
    month_year: 'July 2025'
  },
  {
    id: 3,
    distributor_name: 'Bharat Timber',
    location: 'Vasai',
    state: 'Maharashtra',
    order_date: '2025-08-21',
    thickness_72_92: 774,
    thickness_08: 152,
    thickness_1mm: 0,
    total_pieces: 926,
    month_year: 'August 2025'
  },
  {
    id: 4,
    distributor_name: 'Shiv Laminates',
    location: 'Latur',
    state: 'Maharashtra',
    order_date: '2025-05-01',
    thickness_72_92: 0,
    thickness_08: 4093,
    thickness_1mm: 0,
    total_pieces: 4093,
    month_year: 'May 2025'
  },
  {
    id: 5,
    distributor_name: 'Gopalji Plywood',
    location: 'Dehradun',
    state: 'Uttarakhand',
    order_date: '2025-04-07',
    thickness_72_92: 42,
    thickness_08: 0,
    thickness_1mm: 0,
    total_pieces: 42,
    month_year: 'April 2025'
  }
];

const mockTrendData = [
  { month: 'Apr 2025', orders: 12, volume: 15600, thickness_72_92: 8000, thickness_08: 6000, thickness_1mm: 1600 },
  { month: 'May 2025', orders: 18, volume: 22400, thickness_72_92: 10000, thickness_08: 9400, thickness_1mm: 3000 },
  { month: 'Jun 2025', orders: 15, volume: 18900, thickness_72_92: 8500, thickness_08: 8000, thickness_1mm: 2400 },
  { month: 'Jul 2025', orders: 24, volume: 31200, thickness_72_92: 14000, thickness_08: 13200, thickness_1mm: 4000 },
  { month: 'Aug 2025', orders: 20, volume: 25600, thickness_72_92: 11000, thickness_08: 11600, thickness_1mm: 3000 }
];

const mockThicknessData = [
  { name: '.72/.82/.92 mm', value: 816, color: '#8884d8' },
  { name: '0.8 mm', value: 10774, color: '#82ca9d' },
  { name: '1 mm', value: 0, color: '#ffc658' }
];

const mockLocationData = [
  { location: 'Maharashtra', orders: 45, volume: 58420 },
  { location: 'Uttarakhand', orders: 22, volume: 28100 },
  { location: 'Karnataka', orders: 18, volume: 21500 },
  { location: 'Uttar Pradesh', orders: 15, volume: 18200 }
];

interface FilterState {
  distributor: string;
  location: string;
  thickness: string;
  startDate: string;
  endDate: string;
}

const DistributorOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalOrders, setTotalOrders] = useState(0);
  const [chartView, setChartView] = useState<'trends' | 'thickness' | 'location'>('trends');
  const [filters, setFilters] = useState<FilterState>({
    distributor: '',
    location: '',
    thickness: '',
    startDate: '',
    endDate: ''
  });
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    volumeThisMonth: 0,
    activeDistributors: 0,
    avgOrderSize: 0
  });
  const [trendData, setTrendData] = useState<any[]>([]);
  const [thicknessData, setThicknessData] = useState<any[]>([]);
  const [locationData, setLocationData] = useState<any[]>([]);
  const [showThicknessLines, setShowThicknessLines] = useState(true);

  // Load data on component mount and when filters change
  useEffect(() => {
    loadData();
    loadAnalytics();
  }, [page, rowsPerPage]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Prepare filters for API
      const apiFilters: any = {
        page: page + 1,
        limit: rowsPerPage,
        sort_by: 'order_date',
        sort_order: 'DESC'
      };

      if (filters.distributor) apiFilters.distributor_name = filters.distributor;
      if (filters.location) apiFilters.location = filters.location;
      if (filters.startDate) apiFilters.start_date = filters.startDate;
      if (filters.endDate) apiFilters.end_date = filters.endDate;

      const response = await distributorOrderService.getOrders(apiFilters);

      if (response.success) {
        setOrders(response.data);
        setTotalOrders(response.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      // Fallback to mock data if API fails
      setOrders(mockOrders);
      setTotalOrders(mockOrders.length);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      // Load analytics summary
      const summaryResponse = await distributorOrderService.getAnalyticsSummary(
        filters.startDate,
        filters.endDate
      );

      if (summaryResponse.success) {
        const data = summaryResponse.data;
        setMetrics({
          totalOrders: parseInt(data.total_orders) || 0,
          volumeThisMonth: parseInt(data.volume_this_month) || 0,
          activeDistributors: parseInt(data.active_distributors) || 0,
          avgOrderSize: Math.round(parseFloat(data.avg_order_size)) || 0
        });
      }

      // Load trends data
      const trendsResponse = await distributorOrderService.getTrends(
        'monthly',
        filters.startDate,
        filters.endDate
      );

      if (trendsResponse.success && trendsResponse.data) {
        const formattedTrends = trendsResponse.data.map((item: any) => ({
          month: item.period,
          orders: parseInt(item.total_orders),
          volume: parseInt(item.total_volume),
          thickness_72_92: parseInt(item.thickness_72_92_total || 0),
          thickness_08: parseInt(item.thickness_08_total || 0),
          thickness_1mm: parseInt(item.thickness_1mm_total || 0)
        }));
        setTrendData(formattedTrends);
      }

      // Load thickness analysis
      const thicknessResponse = await distributorOrderService.getThicknessAnalysis({
        start_date: filters.startDate,
        end_date: filters.endDate
      });

      if (thicknessResponse.success && thicknessResponse.data) {
        const data = thicknessResponse.data;
        const formattedThickness = [
          { name: '.72/.82/.92 mm', value: data.thickness_72_92.quantity, color: '#8884d8' },
          { name: '0.8 mm', value: data.thickness_08.quantity, color: '#82ca9d' },
          { name: '1 mm', value: data.thickness_1mm.quantity, color: '#ffc658' }
        ];
        setThicknessData(formattedThickness);
      }

      // Load location analysis
      const locationResponse = await distributorOrderService.getLocationAnalysis({
        start_date: filters.startDate,
        end_date: filters.endDate,
        group_by: 'state'
      });

      if (locationResponse.success && locationResponse.data) {
        const formattedLocation = locationResponse.data.slice(0, 10).map((item: any) => ({
          location: item.state || item.location,
          orders: parseInt(item.total_orders),
          volume: parseInt(item.total_volume)
        }));
        setLocationData(formattedLocation);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Use mock data as fallback
      setTrendData(mockTrendData);
      setThicknessData(mockThicknessData);
      setLocationData(mockLocationData);
    }
  };

  const handleFilterChange = (field: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleExport = () => {
    // Export functionality
    console.log('Exporting data...');
  };

  const handleRefresh = async () => {
    await loadData();
    await loadAnalytics();
  };

  const handleApplyFilters = async () => {
    setPage(0);
    await loadData();
    await loadAnalytics();
  };

  const renderChart = () => {
    switch (chartView) {
      case 'trends':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData.length > 0 ? trendData : mockTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="orders" stroke="#8884d8" name="Orders" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="volume" stroke="#82ca9d" name="Volume" strokeWidth={2} />
              {showThicknessLines && (
                <>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="thickness_72_92"
                    stroke="#ff7c7c"
                    name=".72/.82/.92mm"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="thickness_08"
                    stroke="#ffc658"
                    name="0.8mm"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="thickness_1mm"
                    stroke="#a4de6c"
                    name="1mm"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        );
      case 'thickness':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={thicknessData.length > 0 ? thicknessData : mockThicknessData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={entry => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {(thicknessData.length > 0 ? thicknessData : mockThicknessData).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'location':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={locationData.length > 0 ? locationData : mockLocationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="location" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="volume" fill="#8884d8" name="Volume" />
              <Bar dataKey="orders" fill="#82ca9d" name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1">
            Distributor Orders
          </Typography>
          <Box>
            <IconButton onClick={handleRefresh} sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
            >
              Export
            </Button>
          </Box>
        </Box>

        {/* Metrics Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Orders This Month
                    </Typography>
                    <Typography variant="h4">
                      {metrics.totalOrders}
                    </Typography>
                  </Box>
                  <TrendingUpIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.6 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Volume This Month
                    </Typography>
                    <Typography variant="h4">
                      {metrics.volumeThisMonth.toLocaleString()}
                    </Typography>
                  </Box>
                  <InventoryIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.6 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Active Distributors
                    </Typography>
                    <Typography variant="h4">
                      {metrics.activeDistributors}
                    </Typography>
                  </Box>
                  <StoreIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.6 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      Avg Order Size
                    </Typography>
                    <Typography variant="h4">
                      {metrics.avgOrderSize}
                    </Typography>
                  </Box>
                  <AnalyticsIcon sx={{ fontSize: 40, color: 'info.main', opacity: 0.6 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts Section */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h6">Analytics</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {chartView === 'trends' && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={showThicknessLines}
                      onChange={(e) => setShowThicknessLines(e.target.checked)}
                      size="small"
                      color="primary"
                    />
                  }
                  label="Show Thickness Breakdown"
                  sx={{ mr: 2 }}
                />
              )}
              <ToggleButtonGroup
                value={chartView}
                exclusive
                onChange={(e, value) => value && setChartView(value)}
                size="small"
              >
                <ToggleButton value="trends">Trends</ToggleButton>
                <ToggleButton value="thickness">Thickness</ToggleButton>
                <ToggleButton value="location">Location</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
          {renderChart()}
        </Paper>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Distributor"
                value={filters.distributor}
                onChange={(e) => handleFilterChange('distributor', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Location"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Thickness</InputLabel>
                <Select
                  value={filters.thickness}
                  label="Thickness"
                  onChange={(e: SelectChangeEvent) => handleFilterChange('thickness', e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="72_92">.72/.82/.92 mm</MenuItem>
                  <MenuItem value="08">0.8 mm</MenuItem>
                  <MenuItem value="1mm">1 mm</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<FilterListIcon />}
                onClick={handleApplyFilters}
              >
                Apply
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Distributor Analytics with Charts */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" sx={{ mb: 3 }}>
            Analytics & Insights
          </Typography>
          <DistributorAnalytics />
        </Paper>

        {/* Distributor Rankings */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <DistributorRankings />
        </Paper>

        {/* Orders Table */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Recent Orders
          </Typography>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Distributor</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>State</TableCell>
                      <TableCell align="right">.72/.82/.92</TableCell>
                      <TableCell align="right">0.8 mm</TableCell>
                      <TableCell align="right">1 mm</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.length > 0 ? (
                      orders.map((order) => (
                        <TableRow key={order.id} hover>
                          <TableCell>{dayjs(order.order_date).format('DD.MM.YYYY')}</TableCell>
                          <TableCell>{order.distributor_name}</TableCell>
                          <TableCell>{order.location}</TableCell>
                          <TableCell>
                            <Chip label={order.state || 'N/A'} size="small" />
                          </TableCell>
                          <TableCell align="right">{order.thickness_72_92 || '-'}</TableCell>
                          <TableCell align="right">{order.thickness_08 || '-'}</TableCell>
                          <TableCell align="right">{order.thickness_1mm || '-'}</TableCell>
                          <TableCell align="right">
                            <strong>{order.total_pieces}</strong>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          No orders found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={totalOrders}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          )}
        </Paper>
      </Container>
  );
};

export default DistributorOrders;