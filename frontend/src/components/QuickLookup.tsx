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
  Divider,
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
  Stack
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import InventoryIcon from '@mui/icons-material/Inventory';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

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

const QuickLookup: React.FC = () => {
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

  const handleStockLookup = async () => {
    if (!artisCode.trim()) {
      setError('Please enter a design code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get stock info
      const stockData = await callSupabaseFunction('get-stock-info', { artisCode });
      setStockInfo(stockData);

      // Get consumption history
      const historyData = await callSupabaseFunction('get-consumption-history', {
        artisCode,
        months: 6
      });
      setConsumptionHistory(historyData);
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
      case 'critical': return 'error';
      case 'low': return 'warning';
      case 'adequate': return 'success';
      case 'high': return 'info';
      default: return 'default';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUpIcon color="error" />;
      case 'decreasing': return <TrendingDownIcon color="success" />;
      default: return <TrendingFlatIcon color="action" />;
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Quick Lookup
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Instantly check stock levels and consumption data using our Edge Functions
        </Typography>

        <Paper sx={{ mt: 3 }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
            <Tab label="Stock Lookup" />
            <Tab label="Product Search" />
          </Tabs>

          {/* Stock Lookup Tab */}
          {activeTab === 0 && (
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Design Code"
                    placeholder="Enter code (e.g., 909, 917)"
                    value={artisCode}
                    onChange={(e) => setArtisCode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleStockLookup()}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleStockLookup}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
                    sx={{ height: '56px' }}
                  >
                    {loading ? 'Loading...' : 'Lookup'}
                  </Button>
                </Grid>
              </Grid>

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              {stockInfo && (
                <Grid container spacing={3} sx={{ mt: 2 }}>
                  {/* Stock Info Card */}
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Stock Information
                        </Typography>
                        <Divider sx={{ mb: 2 }} />

                        <Stack spacing={2}>
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Product Name
                            </Typography>
                            <Typography variant="h6">
                              {stockInfo.name || 'N/A'}
                            </Typography>
                          </Box>

                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Supplier Code
                            </Typography>
                            <Typography>
                              {stockInfo.supplierCode}
                            </Typography>
                          </Box>

                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Current Stock
                            </Typography>
                            <Typography variant="h5" color="primary">
                              {stockInfo.currentStock.toLocaleString()} kg
                            </Typography>
                          </Box>

                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Average Monthly Consumption
                            </Typography>
                            <Typography>
                              {stockInfo.avgConsumption.toLocaleString()} kg/month
                            </Typography>
                          </Box>

                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Stock Status
                            </Typography>
                            <Chip
                              label={stockInfo.stockStatus.toUpperCase()}
                              color={getStockStatusColor(stockInfo.stockStatus) as any}
                              size="small"
                            />
                          </Box>

                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Months of Stock Remaining
                            </Typography>
                            <Typography variant="h6" color={stockInfo.monthsOfStockRemaining < 2 ? 'error' : 'inherit'}>
                              {stockInfo.monthsOfStockRemaining || 'N/A'} months
                            </Typography>
                          </Box>

                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Category / Supplier
                            </Typography>
                            <Typography>
                              {stockInfo.category} / {stockInfo.supplier}
                            </Typography>
                          </Box>

                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              Catalogs
                            </Typography>
                            <Stack direction="row" spacing={1}>
                              {stockInfo.catalogs.map((catalog) => (
                                <Chip key={catalog} label={catalog} size="small" variant="outlined" />
                              ))}
                            </Stack>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Consumption History Card */}
                  {consumptionHistory && (
                    <Grid item xs={12} md={6}>
                      <Card>
                        <CardContent>
                          <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography variant="h6" gutterBottom>
                              Consumption History (6 Months)
                            </Typography>
                            {getTrendIcon(consumptionHistory.trend)}
                          </Box>
                          <Divider sx={{ mb: 2 }} />

                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Month</TableCell>
                                  <TableCell align="right">Consumption (kg)</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {consumptionHistory.monthlyData.map((data) => (
                                  <TableRow key={data.month}>
                                    <TableCell>{data.month}</TableCell>
                                    <TableCell align="right">
                                      {data.consumption.toLocaleString()}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                <TableRow>
                                  <TableCell><strong>Average</strong></TableCell>
                                  <TableCell align="right">
                                    <strong>{consumptionHistory.averageMonthlyConsumption.toLocaleString()}</strong>
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </TableContainer>

                          <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              Total Consumption (6 months)
                            </Typography>
                            <Typography variant="h6">
                              {consumptionHistory.totalConsumption.toLocaleString()} kg
                            </Typography>
                          </Box>
                        </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            )}
            </Box>
          )}

          {/* Product Search Tab */}
          {activeTab === 1 && (
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Catalog</InputLabel>
                    <Select
                      value={searchCatalog}
                      onChange={(e) => setSearchCatalog(e.target.value)}
                      label="Catalog"
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="Artis">Artis</MenuItem>
                      <MenuItem value="Woodrica">Woodrica</MenuItem>
                      <MenuItem value="Artvio">Artvio</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={searchCategory}
                      onChange={(e) => setSearchCategory(e.target.value)}
                      label="Category"
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="Wooden">Wooden</MenuItem>
                      <MenuItem value="Marble">Marble</MenuItem>
                      <MenuItem value="Solid">Solid</MenuItem>
                      <MenuItem value="Abstract">Abstract</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleSearch}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
                    sx={{ height: '56px' }}
                  >
                    {loading ? 'Searching...' : 'Search'}
                  </Button>
                </Grid>
              </Grid>

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}

              {searchResults && (
                <Box sx={{ mt: 3 }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6">
                      Found {searchResults.summary.totalProducts} products
                    </Typography>
                    <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                      <Chip
                        label={`Critical: ${searchResults.summary.criticalStockCount}`}
                        color="error"
                        size="small"
                      />
                      <Chip
                        label={`Low: ${searchResults.summary.lowStockCount}`}
                        color="warning"
                        size="small"
                      />
                    </Stack>
                  </Box>

                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Code</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>Supplier</TableCell>
                          <TableCell>Category</TableCell>
                          <TableCell align="right">Stock (kg)</TableCell>
                          <TableCell align="right">Avg Consumption</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Catalogs</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {searchResults.products.map((product: any) => (
                          <TableRow key={product.artisCode}>
                            <TableCell>
                              <Button
                                size="small"
                                onClick={() => {
                                  setArtisCode(product.artisCode);
                                  setActiveTab(0);
                                }}
                              >
                                {product.artisCode}
                              </Button>
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
                                color={getStockStatusColor(product.stockStatus) as any}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {product.catalogs.join(', ')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}
        </Paper>

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Tip: Common codes to try: 909, 917, 968, 551, 552, 1021
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default QuickLookup;