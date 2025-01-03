import React, { useEffect, useState, useMemo, memo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import UploadIcon from '@mui/icons-material/Upload';
import GridViewIcon from '@mui/icons-material/GridView';
import ListIcon from '@mui/icons-material/List';
import InfoIcon from '@mui/icons-material/Info';
import { getAllInventory, api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import TransactionDialog from './TransactionDialog';
import ProductDetailsDialog from './ProductDetailsDialog';
import BulkUploadDialog from './BulkUploadDialog';
import SearchIcon from '@mui/icons-material/Search';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

interface InventoryItem {
  id: string;
  productId: string;
  currentStock: number;
  avgConsumption?: number;
  product: {
    artisCode: string;
    name: string;
    supplier?: string;
    category?: string;
    supplierCode?: string;
  };
}

interface FilterState {
  search: string;
  supplier: string;
  category: string;
}

interface CatalogProduct {
  id: string;
  artisCode: string;
  name?: string;
  supplier?: string;
  category?: string;
  supplierCode?: string;
  catalogs?: string[];
}

interface TransactionData {
  type: 'IN' | 'OUT';
  quantity: number;
  date: string;
}

interface ProductWithTracking {
  id: string;
  artisCode: string;
  name: string;
  supplier?: string;
  category?: string;
  supplierCode?: string;
  catalogs?: string[];
  _artisCodeSet: Set<string>;
  _processedCodes?: Set<string>;
}

interface GroupedInventoryItem {
  id: string;
  productId: string;
  currentStock: number;
  avgConsumption: number;
  product: ProductWithTracking;
}

const normalizeSupplierCode = (supplierCode: string): string => {
  return supplierCode.replace(/\s+/g, '').toUpperCase();
};

const calculateAverageConsumption = (transactions: TransactionData[]) => {
  console.log('Calculating average consumption for transactions:', transactions);
  
  // Get all OUT transactions including zeros
  const outTransactions = transactions.filter(t => t.type === 'OUT');
  console.log('All OUT transactions:', outTransactions);
  
  if (outTransactions.length === 0) {
    console.log('No OUT transactions found');
    return 0;
  }
  
  const totalConsumption = outTransactions.reduce((sum: number, t: TransactionData) => {
    const quantity = Number(t.quantity) || 0; // Convert to number, use 0 if NaN
    console.log('Adding transaction quantity:', quantity, 'to sum:', sum);
    return sum + quantity;
  }, 0);
  
  // Always divide by total number of OUT transactions
  const average = totalConsumption / outTransactions.length;
  console.log('Final average consumption:', average, 'from', outTransactions.length, 'transactions');
  return Number(average.toFixed(2));
};

const InventoryList: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    supplier: '',
    category: ''
  });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortField, setSortField] = useState<'currentStock' | 'avgConsumption'>('currentStock');
  const [dialogState, setDialogState] = useState({
    transaction: false,
    details: false,
    bulkUpload: false
  });
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);

  const groupInventoryBySupplierCode = async (inventory: InventoryItem[]): Promise<InventoryItem[]> => {
    const preGrouped = new Map<string, GroupedInventoryItem>();
    
    try {
      const response = await api.get('/products');
      const catalogProducts: CatalogProduct[] = response.data;
      
      catalogProducts.forEach(p => {
        if (p.supplierCode && p.supplier) {
          const normalizedSupplierCode = normalizeSupplierCode(p.supplierCode);
          const groupKey = `${normalizedSupplierCode}_${p.supplier}`;
          
          if (!preGrouped.has(groupKey)) {
            preGrouped.set(groupKey, {
              id: groupKey,
              productId: '',
              currentStock: 0,
              avgConsumption: 0,
              product: {
                id: p.id,
                artisCode: p.artisCode,
                name: p.name || '',
                supplier: p.supplier,
                supplierCode: p.supplierCode,
                category: p.category,
                _artisCodeSet: new Set([p.artisCode]),
                _processedCodes: new Set()
              }
            });
          } else {
            const existing = preGrouped.get(groupKey);
            if (existing) {
              existing.product._artisCodeSet.add(p.artisCode);
            }
          }
        }
      });

      for (const item of inventory) {
        const normalizedSupplierCode = item.product.supplierCode ? normalizeSupplierCode(item.product.supplierCode) : '';
        const groupKey = `${normalizedSupplierCode}_${item.product.supplier || ''}`;
        
        try {
          const details = await api.get(`/inventory/${item.id}/details`);
          const itemAvgConsumption = calculateAverageConsumption(details.data.transactions || []);

          if (preGrouped.has(groupKey)) {
            const existing = preGrouped.get(groupKey);
            if (existing) {
              existing.currentStock += Number(parseFloat(item.currentStock.toString()).toFixed(2));
              
              if (!existing.product._processedCodes?.has(item.product.artisCode)) {
                existing.avgConsumption = (existing.avgConsumption || 0) + itemAvgConsumption;
                existing.product._processedCodes?.add(item.product.artisCode);
              }
              
              existing.productId = existing.productId || item.productId;
              existing.product.name = existing.product.name || item.product.name || '';
              existing.product.category = existing.product.category || item.product.category;
              existing.product._artisCodeSet.add(item.product.artisCode);
            }
          } else {
            const newItem: GroupedInventoryItem = {
              ...item,
              avgConsumption: itemAvgConsumption,
              product: {
                ...item.product,
                id: item.productId,
                _artisCodeSet: new Set([item.product.artisCode]),
                _processedCodes: new Set([item.product.artisCode])
              }
            };
            preGrouped.set(item.id, newItem);
          }
        } catch (error) {
          console.error(`Failed to fetch details for item ${item.id}:`, error);
        }
      }

      return Array.from(preGrouped.values()).map(item => {
        const artisCodesArray = Array.from(item.product._artisCodeSet).sort((a, b) => Number(a) - Number(b));
        const { _artisCodeSet, _processedCodes, ...productRest } = item.product;
        
        return {
          ...item,
          product: {
            ...productRest,
            name: productRest.name || '',
            artisCode: artisCodesArray.join(' / ')
          }
        } as InventoryItem;
      });
    } catch (error) {
      console.error('Error in groupInventoryBySupplierCode:', error);
      return inventory;
    }
  };

  useEffect(() => {
    const filterInventory = async () => {
      try {
        // First group by supplier code
        let result = await groupInventoryBySupplierCode(inventory);

        // Apply filters
        if (filters.search) {
          const query = filters.search.toLowerCase().trim();
          result = result.filter((item: InventoryItem) => 
            (item.product.artisCode?.toLowerCase() || '').includes(query) ||
            (item.product.supplierCode?.toLowerCase() || '').includes(query) ||
            (item.product.supplier?.toLowerCase() || '').includes(query)
          );
        }

        if (filters.supplier) {
          result = result.filter((item: InventoryItem) => item.product.supplier === filters.supplier);
        }

        if (filters.category) {
          result = result.filter((item: InventoryItem) => item.product.category === filters.category);
        }

        // Apply sorting
        result.sort((a: InventoryItem, b: InventoryItem) => {
          const aValue = sortField === 'currentStock' ? a.currentStock : (a.avgConsumption || 0);
          const bValue = sortField === 'currentStock' ? b.currentStock : (b.avgConsumption || 0);
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        });

        setFilteredItems(result);
      } catch (error) {
        console.error('Error in filterInventory:', error);
      }
    };

    filterInventory();
  }, [inventory, filters, sortField, sortOrder]);

  // Simplified fetch function for debugging
  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching inventory...');
      
      // Check for auth token
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No auth token found');
        setError('Please log in to view inventory');
        return;
      }

      const response = await getAllInventory();
      console.log('Inventory response:', response);
      
      if (!response?.data) {
        throw new Error('No data received from server');
      }

      setInventory(response.data);
    } catch (error: any) {
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status
      });
      
      if (error.response?.status === 401) {
        setError('Session expired. Please log in again.');
        // Optionally redirect to login
        // window.location.href = '/login';
      } else {
        setError(error.response?.data?.message || 'Failed to fetch inventory');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Simple loading view for testing
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Simple error view for testing
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
        <Button onClick={fetchInventory} sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  const handleViewModeToggle = () => {
    console.log('Current view mode:', viewMode);
    setViewMode(prev => {
      const newMode = prev === 'list' ? 'grid' : 'list';
      console.log('Switching to:', newMode);
      return newMode;
    });
  };

  const FilterControls = memo(() => (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
          placeholder="Search by code or supplier..."
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            sx: { height: '40px' }
          }}
          sx={{ flexGrow: 1 }}
          size="small"
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Supplier</InputLabel>
          <Select
            value={filters.supplier}
            onChange={(e: SelectChangeEvent) => 
              setFilters(prev => ({ ...prev, supplier: e.target.value }))
            }
            label="Supplier"
          >
            <MenuItem value="">All</MenuItem>
            {Array.from(new Set(inventory.map(item => item.product.supplier)))
              .filter(Boolean)
              .sort()
              .map(supplier => (
                <MenuItem key={supplier} value={supplier}>{supplier}</MenuItem>
              ))
            }
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={filters.category}
            onChange={(e: SelectChangeEvent) => 
              setFilters(prev => ({ ...prev, category: e.target.value }))
            }
            label="Category"
          >
            <MenuItem value="">All</MenuItem>
            {Array.from(new Set(inventory.map(item => item.product.category)))
              .filter(Boolean)
              .sort()
              .map(category => (
                <MenuItem key={category} value={category}>{category}</MenuItem>
              ))
            }
          </Select>
        </FormControl>
        <Tooltip title={`Switch to ${viewMode === 'list' ? 'grid' : 'list'} view`}>
          <IconButton onClick={handleViewModeToggle} size="small">
            {viewMode === 'list' ? <GridViewIcon /> : <ListIcon />}
          </IconButton>
        </Tooltip>
        <IconButton onClick={fetchInventory} size="small">
          <RefreshIcon />
        </IconButton>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => setDialogState(prev => ({ ...prev, transaction: true }))}
          size="small"
        >
          Add Transaction
        </Button>
        <Button
          startIcon={<UploadIcon />}
          variant="outlined"
          onClick={() => setDialogState(prev => ({ ...prev, bulkUpload: true }))}
          size="small"
        >
          Bulk Upload
        </Button>
      </Box>
    </Box>
  ));

  return (
    <Box sx={{ 
      bgcolor: theme => theme.palette.mode === 'dark' ? '#121212' : '#f8fafc',
      minHeight: '100vh',
      p: 3
    }}>
      <Box sx={{ mb: 3, mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h1" sx={{
          fontWeight: 600,
          color: theme => theme.palette.mode === 'dark' ? '#fff' : 'rgba(0, 0, 0, 0.87)',
          mb: 3
        }}>
          Inventory Management
        </Typography>
      </Box>

      <FilterControls />

      {viewMode === 'list' ? (
        <TableContainer component={Paper} sx={{ 
          maxHeight: 'calc(100vh - 250px)', 
          overflow: 'auto',
          boxShadow: theme => theme.palette.mode === 'dark' 
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.4)'
            : '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          borderRadius: '8px',
          bgcolor: theme => theme.palette.mode === 'dark' ? '#1e1e1e' : '#fff',
          border: theme => theme.palette.mode === 'dark' ? '1px solid #333' : 'none',
        }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow sx={{ 
                '& th': {
                  backgroundColor: theme => theme.palette.mode === 'dark' ? '#22272e' : '#f8fafc',
                  borderBottom: theme => `2px solid ${theme.palette.mode === 'dark' ? '#444d56' : '#e2e8f0'}`,
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: theme => theme.palette.mode === 'dark' ? '#e6edf3' : 'inherit'
                }
              }}>
                <TableCell align="center" sx={{ fontWeight: 'bold', width: '50px' }}>#</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: '150px' }}>Design Code</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: '200px' }}>Supplier Info</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: '120px' }}>Category</TableCell>
                <TableCell 
                  onClick={() => {
                    setSortField('currentStock');
                    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                  }}
                  align="right"
                  sx={{ 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    minWidth: '120px',
                    userSelect: 'none'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                    Current Stock
                    {sortField === 'currentStock' && (
                      <span style={{ 
                        fontSize: '1.6rem', 
                        color: '#1976d2',
                        fontWeight: 900,
                        lineHeight: 0.7,
                        WebkitTextStroke: '2px currentColor'
                      }}>
                        {sortOrder === 'desc' ? '↑' : '↓'}
                      </span>
                    )}
                  </Box>
                </TableCell>
                <TableCell 
                  onClick={() => {
                    setSortField('avgConsumption');
                    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                  }}
                  align="center"
                  sx={{ 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    minWidth: '120px',
                    userSelect: 'none'
                  }}
                >
                  Avg. Consumption
                  {sortField === 'avgConsumption' && (
                    <span style={{ 
                      fontSize: '1.6rem', 
                      color: '#1976d2',
                      fontWeight: 900,
                      lineHeight: 0.7,
                      WebkitTextStroke: '2px currentColor',
                      verticalAlign: 'middle',
                      marginLeft: '4px'
                    }}>
                      {sortOrder === 'desc' ? '↑' : '↓'}
                    </span>
                  )}
                </TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', width: '80px' }}>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody sx={{ 
              transition: 'opacity 0.2s ease-in-out',
              opacity: loading ? 0.5 : 1 
            }}>
              {filteredItems.map((item: InventoryItem, index: number) => (
                <TableRow 
                  key={item.id} 
                  hover
                  sx={{
                    '&:nth-of-type(odd)': {
                      backgroundColor: theme => theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.03)'
                        : 'rgba(0, 0, 0, 0.03)'
                    },
                    '&:hover': {
                      backgroundColor: theme => theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.05) !important'
                        : 'rgba(0, 0, 0, 0.05) !important'
                    },
                    '& td': {
                      color: theme => theme.palette.mode === 'dark' ? '#e6edf3' : 'inherit',
                      borderBottom: theme => `1px solid ${theme.palette.mode === 'dark' ? '#444d56' : '#e2e8f0'}`
                    }
                  }}
                >
                  <TableCell>
                    <Typography sx={{ 
                      color: theme => theme.palette.mode === 'dark' ? '#e6edf3' : '#1e293b'
                    }}>
                      {index + 1}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ 
                      fontWeight: '500',
                      fontSize: '1.1rem',
                      color: theme => theme.palette.mode === 'dark' ? '#58a6ff' : '#1e293b'
                    }}>
                      {item.product.artisCode}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ 
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateX(4px)'
                      }
                    }}>
                      <Typography variant="body2" sx={{ 
                        fontWeight: '500',
                        fontSize: '0.95rem',
                        color: theme => theme.palette.mode === 'dark' ? '#e6edf3' : '#0f172a'
                      }}>
                        {item.product.supplierCode || '-'}
                      </Typography>
                      <Typography variant="body2" sx={{
                        color: theme => theme.palette.mode === 'dark' ? '#8b949e' : '#64748b',
                        '&:hover': {
                          color: theme => theme.palette.mode === 'dark' ? '#58a6ff' : '#1976d2'
                        }
                      }}>
                        {item.product.supplier || '-'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.product.category || 'Plain Colours'}
                      sx={{
                        backgroundColor: theme => theme.palette.mode === 'dark' ? '#1f6feb' : '#e3f2fd',
                        color: theme => theme.palette.mode === 'dark' ? '#fff' : '#1976d2',
                        borderRadius: '16px',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        '&:hover': {
                          backgroundColor: theme => theme.palette.mode === 'dark' ? '#388fe5' : '#bbdefb'
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '4px'
                    }}>
                      <Typography sx={{ 
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        color: theme => item.currentStock < 0 
                          ? '#f44336' 
                          : theme.palette.mode === 'dark' ? '#e6edf3' : '#0D47A1',
                      }}>
                        {item.currentStock}
                      </Typography>
                      <Typography sx={{ 
                        fontSize: '0.9rem',
                        color: theme => theme.palette.mode === 'dark' ? '#8b949e' : 'rgba(0, 0, 0, 0.87)',
                        fontWeight: 400
                      }}>
                        kgs
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '4px'
                    }}>
                      {item.avgConsumption && item.avgConsumption > 0 ? (
                        <>
                          <Typography sx={{ 
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            color: theme => theme.palette.mode === 'dark' ? '#58a6ff' : '#0D47A1'
                          }}>
                            {Number(item.avgConsumption).toFixed(2)}
                          </Typography>
                          <Typography sx={{ 
                            fontSize: '0.9rem',
                            color: theme => theme.palette.mode === 'dark' ? '#8b949e' : 'rgba(0, 0, 0, 0.87)',
                            fontWeight: 400
                          }}>
                            kgs
                          </Typography>
                        </>
                      ) : '-'}
                    </Box>
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      borderRight: '1px solid rgba(224, 224, 224, 0.4)',
                      '&:last-child': {
                        borderRight: 'none'
                      }
                    }}
                  >
                    <Tooltip title="View Details">
                      <IconButton 
                        size="small"
                        sx={{
                          color: '#1976d2',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor: '#e3f2fd',
                            transform: 'scale(1.1)'
                          }
                        }}
                        onClick={() => {
                          setSelectedProduct(item.productId);
                          setDialogState(prev => ({ ...prev, details: true }));
                        }}
                      >
                        <InfoIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Grid container spacing={2}>
          {filteredItems.map((item: InventoryItem, index: number) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
              <Card sx={{
                bgcolor: theme => theme.palette.mode === 'dark' ? '#1e1e1e' : '#fff',
                border: '1px solid',
                borderColor: theme => theme.palette.mode === 'dark' ? '#333' : '#e2e8f0',
                borderRadius: '8px',
                position: 'relative',
                p: 2,
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
                  <Chip
                    label={item.product.category || 'Plain Colours'}
                    sx={{
                      backgroundColor: theme => theme.palette.mode === 'dark' ? '#1f6feb' : '#e3f2fd',
                      color: theme => theme.palette.mode === 'dark' ? '#fff' : '#1976d2',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      padding: '4px 8px',
                      height: '32px'
                    }}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography sx={{ 
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: theme => theme.palette.mode === 'dark' ? '#90caf9' : '#1e293b',
                    mb: 1
                  }}>
                    {item.product.artisCode}
                  </Typography>
                  <Typography sx={{
                    color: theme => theme.palette.mode === 'dark' ? '#fff' : '#64748b',
                    fontSize: '0.875rem'
                  }}>
                    {item.product.supplierCode}
                  </Typography>
                  <Typography sx={{
                    color: theme => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b',
                    fontSize: '1.1rem',
                    fontWeight: 500
                  }}>
                    {item.product.supplier}
                  </Typography>
                </Box>

                <Box sx={{ mt: 'auto' }}>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    mb: 2 
                  }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ 
                        color: theme => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b',
                        fontSize: '0.875rem',
                        mb: 0.5 
                      }}>
                        Current Stock
                      </Typography>
                      <Typography sx={{
                        fontSize: '1.5rem',
                        fontWeight: 600,
                        color: theme => theme.palette.mode === 'dark' ? '#fff' : '#1e293b'
                      }}>
                        {item.currentStock}
                        <Typography component="span" sx={{
                          fontSize: '0.875rem',
                          color: theme => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b',
                          ml: 1
                        }}>
                          kgs
                        </Typography>
                      </Typography>
                    </Box>

                    <Box sx={{ flex: 1, textAlign: 'right' }}>
                      <Typography sx={{ 
                        color: theme => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b',
                        fontSize: '0.875rem',
                        mb: 0.5 
                      }}>
                        Avg. Consumption
                      </Typography>
                      <Typography sx={{
                        fontSize: '1.5rem',
                        fontWeight: 600,
                        color: theme => theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2'
                      }}>
                        {Number(item.avgConsumption).toFixed(2)}
                        <Typography component="span" sx={{
                          fontSize: '0.875rem',
                          color: theme => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b',
                          ml: 1
                        }}>
                          kgs
                        </Typography>
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<InfoIcon />}
                    onClick={() => {
                      setSelectedProduct(item.productId);
                      setDialogState(prev => ({ ...prev, details: true }));
                    }}
                    sx={{
                      borderColor: theme => theme.palette.mode === 'dark' ? '#333' : '#e2e8f0',
                      color: theme => theme.palette.mode === 'dark' ? '#fff' : '#1e293b',
                      '&:hover': {
                        borderColor: theme => theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2',
                        backgroundColor: 'transparent'
                      }
                    }}
                  >
                    DETAILS
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <TransactionDialog
        open={dialogState.transaction}
        onClose={() => setDialogState(prev => ({ ...prev, transaction: false }))}
        productId={selectedProduct || ''}
        onSuccess={fetchInventory}
      />

      <ProductDetailsDialog
        open={dialogState.details}
        onClose={() => setDialogState(prev => ({ ...prev, details: false }))}
        productId={selectedProduct || ''}
      />

      <BulkUploadDialog
        open={dialogState.bulkUpload}
        onClose={() => setDialogState(prev => ({ ...prev, bulkUpload: false }))}
        onSuccess={fetchInventory}
      />

      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        mt: 4, 
        borderTop: '1px solid',
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
        pt: 2
      }}>
        <Button
          variant="contained"
          color="error"
          onClick={async () => {
            if (window.confirm('Are you sure you want to clear all inventory?')) {
              try {
                await api.delete('/inventory');
                fetchInventory();
              } catch (error) {
                setError('Failed to clear inventory');
              }
            }
          }}
          sx={{ 
            bgcolor: '#d32f2f',
            '&:hover': { 
              bgcolor: '#b71c1c'
            },
            fontWeight: 'bold',
            px: 4
          }}
        >
          Clear All
        </Button>
      </Box>
    </Box>
  );
};

export default InventoryList; 