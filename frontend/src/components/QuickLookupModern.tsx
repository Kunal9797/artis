import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  InputAdornment,
  Skeleton,
  useMediaQuery,
  useTheme,
  IconButton,
  Collapse,
  Fade,
  Zoom
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import InventoryIcon from '@mui/icons-material/Inventory';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CategoryIcon from '@mui/icons-material/Category';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Bar, BarChart } from 'recharts';

const SUPABASE_URL = 'https://igkjogpnyppwpfvwdvby.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlna2pvZ3BueXBwd3BmdndkdmJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MzU3MDcsImV4cCI6MjA2NzExMTcwN30.k_5Mxs_XSP4W5OUAcbYeAQCTQYqehHilVQsRoIdD2hM';

interface StockInfo {
  artisCode: string;
  name: string;
  supplierCode: string;
  currentStock: number;
  avgConsumption: number;
  stockStatus: string;
  monthsOfStockRemaining: number;
  category: string;
  supplier: string;
  catalogs: string[];
}

interface ConsumptionHistory {
  monthlyData: Array<{ month: string; consumption: number }>;
  averageMonthlyConsumption: number;
  totalConsumption: number;
  trend: string;
}

interface SearchResults {
  products: Array<any>;
  summary: {
    totalProducts: number;
    criticalStockCount: number;
    lowStockCount: number;
  };
}

// Quick access buttons with popular codes
const QUICK_ACCESS_CODES = [
  { code: '909', label: 'Popular' },
  { code: '917', label: 'Common' },
  { code: '968', label: 'Trending' },
  { code: '551', label: 'Classic' },
];

const QuickLookupModern: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stock lookup state
  const [artisCode, setArtisCode] = useState('');
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  const [consumptionHistory, setConsumptionHistory] = useState<ConsumptionHistory | null>(null);

  // Search state
  const [searchCatalog, setSearchCatalog] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);

  const callSupabaseFunction = async (functionName: string, params: Record<string, any>) => {
    const url = new URL(`${SUPABASE_URL}/functions/v1/${functionName}`);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error: ${errorText}`);
    }

    return await response.json();
  };

  const handleStockLookup = async (code?: string) => {
    const searchCode = code || artisCode;
    if (!searchCode.trim()) {
      setError('Please enter a design code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get stock info
      const stockData = await callSupabaseFunction('get-stock-info', { artisCode: searchCode });
      setStockInfo(stockData);

      // Get consumption history
      const historyData = await callSupabaseFunction('get-consumption-history', {
        artisCode: searchCode,
        months: 6
      });
      setConsumptionHistory(historyData);

      // Update the input field if using quick access
      if (code) {
        setArtisCode(code);
      }
    } catch (err: any) {
      setError(err.message);
      setStockInfo(null);
      setConsumptionHistory(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setError(null);

    try {
      const results = await callSupabaseFunction('search-products', {
        catalog: searchCatalog,
        category: searchCategory,
        limit: 20
      });
      setSearchResults(results);
    } catch (err: any) {
      setError(err.message);
      setSearchResults(null);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return theme.palette.error.main;
      case 'low': return theme.palette.warning.main;
      case 'adequate': return theme.palette.success.main;
      case 'high': return theme.palette.info.main;
      default: return theme.palette.grey[500];
    }
  };

  const getStockStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return <ErrorOutlineIcon sx={{ fontSize: 20 }} />;
      case 'low': return <WarningAmberIcon sx={{ fontSize: 20 }} />;
      case 'adequate': return <CheckCircleIcon sx={{ fontSize: 20 }} />;
      case 'high': return <InventoryIcon sx={{ fontSize: 20 }} />;
      default: return undefined;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUpIcon color="error" />;
      case 'decreasing': return <TrendingDownIcon color="success" />;
      default: return <TrendingFlatIcon color="action" />;
    }
  };

  // Format chart data for Recharts
  const getChartData = () => {
    if (!consumptionHistory) return [];
    return consumptionHistory.monthlyData.map(item => ({
      month: item.month.substring(5), // Show only MM part
      consumption: item.consumption,
      average: consumptionHistory.averageMonthlyConsumption
    }));
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: { xs: 2, md: 4 }, mb: 4 }}>
        {/* Header with gradient */}
        <Box sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 3,
          p: { xs: 2, md: 3 },
          mb: 3,
          color: 'white'
        }}>
          <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold" gutterBottom>
            Quick Lookup
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Instantly check stock levels and consumption data
          </Typography>
        </Box>

        {/* Modern Tab Design */}
        <Paper sx={{
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
        }}>
          <Tabs
            value={activeTab}
            onChange={(e, v) => setActiveTab(v)}
            sx={{
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              '& .MuiTab-root': {
                minHeight: { xs: 48, md: 56 },
                fontWeight: 600,
              }
            }}
          >
            <Tab label="Stock Lookup" icon={<InventoryIcon />} iconPosition="start" />
            <Tab label="Product Search" icon={<CategoryIcon />} iconPosition="start" />
          </Tabs>

          {/* Stock Lookup Tab */}
          {activeTab === 0 && (
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              {/* Search Input with Modern Design */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 3,
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  borderRadius: 2
                }}
              >
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Design Code"
                      placeholder="Enter code (e.g., 909)"
                      value={artisCode}
                      onChange={(e) => setArtisCode(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleStockLookup()}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                        sx: { borderRadius: 2 }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: theme.palette.background.paper,
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => handleStockLookup()}
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
                      sx={{
                        height: '56px',
                        borderRadius: 2,
                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                        boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                      }}
                    >
                      {loading ? '' : 'Search'}
                    </Button>
                  </Grid>
                  <Grid item xs={6} md={2}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => {
                        setArtisCode('');
                        setStockInfo(null);
                        setConsumptionHistory(null);
                        setError(null);
                      }}
                      startIcon={<RefreshIcon />}
                      sx={{
                        height: '56px',
                        borderRadius: 2
                      }}
                    >
                      Clear
                    </Button>
                  </Grid>
                </Grid>

                {/* Quick Access Buttons */}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Quick Access:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {QUICK_ACCESS_CODES.map((item) => (
                      <Chip
                        key={item.code}
                        label={`${item.code} - ${item.label}`}
                        onClick={() => handleStockLookup(item.code)}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': {
                            transform: 'scale(1.05)',
                            boxShadow: 2
                          },
                          transition: 'all 0.2s'
                        }}
                        color={artisCode === item.code ? "primary" : "default"}
                        variant={artisCode === item.code ? "filled" : "outlined"}
                      />
                    ))}
                  </Stack>
                </Box>
              </Paper>

              {error && (
                <Zoom in={true}>
                  <Alert
                    severity="error"
                    sx={{ mb: 2, borderRadius: 2 }}
                    onClose={() => setError(null)}
                  >
                    {error}
                  </Alert>
                </Zoom>
              )}

              {stockInfo && (
                <Fade in={true}>
                  <Grid container spacing={2}>
                    {/* Main Stock Widget - Mobile Optimized */}
                    <Grid item xs={12} md={6}>
                      <Card sx={{
                        borderRadius: 3,
                        background: `linear-gradient(135deg, ${getStockStatusColor(stockInfo.stockStatus)}22 0%, ${getStockStatusColor(stockInfo.stockStatus)}11 100%)`,
                        border: `1px solid ${getStockStatusColor(stockInfo.stockStatus)}44`
                      }}>
                        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                          {/* Header with Status */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Box>
                              <Typography variant="overline" color="text.secondary">
                                {stockInfo.supplierCode}
                              </Typography>
                              <Typography variant="h5" fontWeight="bold">
                                {stockInfo.name || 'Product Name N/A'}
                              </Typography>
                              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                {stockInfo.catalogs.map((catalog) => (
                                  <Chip key={catalog} label={catalog} size="small" variant="outlined" />
                                ))}
                              </Stack>
                            </Box>
                            <Chip
                              icon={getStockStatusIcon(stockInfo.stockStatus)}
                              label={stockInfo.stockStatus.toUpperCase()}
                              sx={{
                                backgroundColor: getStockStatusColor(stockInfo.stockStatus),
                                color: 'white',
                                fontWeight: 'bold'
                              }}
                            />
                          </Box>

                          {/* Stock Metrics Grid */}
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center', backgroundColor: 'background.paper' }}>
                                <InventoryIcon color="primary" sx={{ mb: 1 }} />
                                <Typography variant="h4" fontWeight="bold" color="primary">
                                  {stockInfo.currentStock.toLocaleString()}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  kg in stock
                                </Typography>
                              </Paper>
                            </Grid>
                            <Grid item xs={6}>
                              <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center', backgroundColor: 'background.paper' }}>
                                <AccessTimeIcon color="secondary" sx={{ mb: 1 }} />
                                <Typography variant="h4" fontWeight="bold" color="secondary">
                                  {stockInfo.monthsOfStockRemaining?.toFixed(1) || '0'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  months remaining
                                </Typography>
                              </Paper>
                            </Grid>
                          </Grid>

                          {/* Additional Info */}
                          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Stack spacing={1}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">
                                  Avg. Consumption
                                </Typography>
                                <Typography variant="body2" fontWeight="medium">
                                  {stockInfo.avgConsumption.toLocaleString()} kg/month
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">
                                  Category
                                </Typography>
                                <Typography variant="body2" fontWeight="medium">
                                  {stockInfo.category}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">
                                  Supplier
                                </Typography>
                                <Typography variant="body2" fontWeight="medium">
                                  {stockInfo.supplier}
                                </Typography>
                              </Box>
                            </Stack>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Consumption Chart Widget */}
                    {consumptionHistory && (
                      <Grid item xs={12} md={6}>
                        <Card sx={{
                          borderRadius: 3,
                          height: '100%'
                        }}>
                          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                              <Typography variant="h6" fontWeight="bold">
                                6-Month Trend
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {getTrendIcon(consumptionHistory.trend)}
                                <Typography variant="body2" color="text.secondary">
                                  {consumptionHistory.trend}
                                </Typography>
                              </Box>
                            </Box>

                            {/* Modern Line Chart */}
                            <Box sx={{ width: '100%', height: isMobile ? 200 : 250 }}>
                              <ResponsiveContainer>
                                <AreaChart data={getChartData()}>
                                  <defs>
                                    <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                  <XAxis
                                    dataKey="month"
                                    style={{ fontSize: 12 }}
                                    tick={{ fill: theme.palette.text.secondary }}
                                  />
                                  <YAxis
                                    style={{ fontSize: 12 }}
                                    tick={{ fill: theme.palette.text.secondary }}
                                  />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: theme.palette.background.paper,
                                      borderRadius: 8,
                                      border: `1px solid ${theme.palette.divider}`
                                    }}
                                  />
                                  <Area
                                    type="monotone"
                                    dataKey="consumption"
                                    stroke="#8884d8"
                                    fillOpacity={1}
                                    fill="url(#colorConsumption)"
                                    strokeWidth={2}
                                  />
                                  <Line
                                    type="monotone"
                                    dataKey="average"
                                    stroke="#ff7300"
                                    strokeDasharray="5 5"
                                    strokeWidth={2}
                                    dot={false}
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            </Box>

                            {/* Summary Stats */}
                            <Grid container spacing={2} sx={{ mt: 1 }}>
                              <Grid item xs={6}>
                                <Paper sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'rgba(136, 132, 216, 0.1)' }}>
                                  <Typography variant="caption" color="text.secondary">
                                    Total (6 months)
                                  </Typography>
                                  <Typography variant="h6" fontWeight="bold">
                                    {consumptionHistory.totalConsumption.toLocaleString()} kg
                                  </Typography>
                                </Paper>
                              </Grid>
                              <Grid item xs={6}>
                                <Paper sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'rgba(255, 115, 0, 0.1)' }}>
                                  <Typography variant="caption" color="text.secondary">
                                    Monthly Avg
                                  </Typography>
                                  <Typography variant="h6" fontWeight="bold">
                                    {consumptionHistory.averageMonthlyConsumption.toLocaleString()} kg
                                  </Typography>
                                </Paper>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>
                    )}
                  </Grid>
                </Fade>
              )}
            </Box>
          )}

          {/* Product Search Tab */}
          {activeTab === 1 && (
            <Box sx={{ p: { xs: 2, md: 3 } }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 3,
                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  borderRadius: 2
                }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Catalog</InputLabel>
                      <Select
                        value={searchCatalog}
                        onChange={(e) => setSearchCatalog(e.target.value)}
                        label="Catalog"
                        sx={{ borderRadius: 2 }}
                      >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="Artis">Artis</MenuItem>
                        <MenuItem value="Woodrica">Woodrica</MenuItem>
                        <MenuItem value="Artvio">Artvio</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={searchCategory}
                        onChange={(e) => setSearchCategory(e.target.value)}
                        label="Category"
                        sx={{ borderRadius: 2 }}
                      >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="Wooden">Wooden</MenuItem>
                        <MenuItem value="Marble">Marble</MenuItem>
                        <MenuItem value="Solid">Solid</MenuItem>
                        <MenuItem value="Abstract">Abstract</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleSearch}
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
                      sx={{
                        height: '56px',
                        borderRadius: 2,
                        background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                        boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                      }}
                    >
                      {loading ? 'Searching...' : 'Search Products'}
                    </Button>
                  </Grid>
                </Grid>
              </Paper>

              {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              {searchResults && (
                <Fade in={true}>
                  <Box>
                    {/* Search Summary Cards */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid item xs={4}>
                        <Card sx={{ borderRadius: 2, textAlign: 'center' }}>
                          <CardContent sx={{ p: 2 }}>
                            <Typography variant="h4" color="primary">
                              {searchResults.summary.totalProducts}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Total Products
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={4}>
                        <Card sx={{ borderRadius: 2, textAlign: 'center', bgcolor: 'error.main', color: 'white' }}>
                          <CardContent sx={{ p: 2 }}>
                            <Typography variant="h4">
                              {searchResults.summary.criticalStockCount}
                            </Typography>
                            <Typography variant="caption">
                              Critical Stock
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={4}>
                        <Card sx={{ borderRadius: 2, textAlign: 'center', bgcolor: 'warning.main', color: 'white' }}>
                          <CardContent sx={{ p: 2 }}>
                            <Typography variant="h4">
                              {searchResults.summary.lowStockCount}
                            </Typography>
                            <Typography variant="caption">
                              Low Stock
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>

                    {/* Results Table - Mobile Responsive */}
                    {isMobile ? (
                      // Mobile Card View
                      <Stack spacing={2}>
                        {searchResults.products.slice(0, 10).map((product: any) => (
                          <Card key={product.artisCode} sx={{ borderRadius: 2 }}>
                            <CardContent>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="h6" fontWeight="bold">
                                  {product.artisCode}
                                </Typography>
                                <Chip
                                  label={product.stockStatus}
                                  size="small"
                                  sx={{
                                    backgroundColor: getStockStatusColor(product.stockStatus),
                                    color: 'white'
                                  }}
                                />
                              </Box>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                {product.name || 'N/A'} • {product.supplier}
                              </Typography>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    Stock
                                  </Typography>
                                  <Typography variant="body1" fontWeight="medium">
                                    {product.currentStock.toLocaleString()} kg
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    Avg/Month
                                  </Typography>
                                  <Typography variant="body1" fontWeight="medium">
                                    {product.avgConsumption.toLocaleString()} kg
                                  </Typography>
                                </Box>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => {
                                    setArtisCode(product.artisCode);
                                    setActiveTab(0);
                                    handleStockLookup(product.artisCode);
                                  }}
                                  sx={{ alignSelf: 'center' }}
                                >
                                  View
                                </Button>
                              </Box>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    ) : (
                      // Desktop Table View
                      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Code</TableCell>
                              <TableCell>Name</TableCell>
                              <TableCell>Supplier</TableCell>
                              <TableCell>Category</TableCell>
                              <TableCell align="right">Stock (kg)</TableCell>
                              <TableCell align="right">Avg/Month</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {searchResults.products.map((product: any) => (
                              <TableRow key={product.artisCode} hover>
                                <TableCell>
                                  <Typography fontWeight="medium">
                                    {product.artisCode}
                                  </Typography>
                                </TableCell>
                                <TableCell>{product.name || 'N/A'}</TableCell>
                                <TableCell>{product.supplier}</TableCell>
                                <TableCell>{product.category}</TableCell>
                                <TableCell align="right">
                                  {product.currentStock.toLocaleString()}
                                </TableCell>
                                <TableCell align="right">
                                  {product.avgConsumption.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={product.stockStatus}
                                    size="small"
                                    sx={{
                                      backgroundColor: getStockStatusColor(product.stockStatus),
                                      color: 'white'
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="small"
                                    onClick={() => {
                                      setArtisCode(product.artisCode);
                                      setActiveTab(0);
                                      handleStockLookup(product.artisCode);
                                    }}
                                  >
                                    View Details
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                </Fade>
              )}
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default QuickLookupModern;