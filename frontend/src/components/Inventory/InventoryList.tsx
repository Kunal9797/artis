import React, { useEffect, useState, useMemo } from 'react';
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import UploadIcon from '@mui/icons-material/Upload';
import { getAllInventory, api } from '../../services/api';
import TransactionDialog from './TransactionDialog';
import ProductDetailsDialog from './ProductDetailsDialog';
import BulkUploadDialog from './BulkUploadDialog';
import GridViewIcon from '@mui/icons-material/GridView';
import ListIcon from '@mui/icons-material/List';
import { useTheme } from '../../context/ThemeContext';

interface InventoryItem {
  id: string;
  productId: string;
  currentStock: number;
  product: {
    artisCode: string;
    name: string;
    supplier?: string;
    category?: string;
    supplierCode?: string;
    relatedArtisCode?: string;
  };
}

interface ProductWithSet extends Omit<InventoryItem['product'], 'relatedArtisCode'> {
  _artisCodeSet?: Set<string>;
}

interface GroupedInventoryItem extends Omit<InventoryItem, 'product'> {
  product: ProductWithSet;
}

interface CatalogProduct {
  artisCode: string;
  supplierCode?: string;
  supplier?: string;
}

interface FilterState {
  search: string;
  supplier: string;
  category: string;
}

const normalizeSupplierCode = (supplierCode: string): string => {
  return supplierCode.replace(/\s+/g, '').toUpperCase();
};

const groupInventoryBySupplierCode = async (inventory: InventoryItem[]): Promise<InventoryItem[]> => {
  const preGrouped = new Map();
  
  try {
    const response = await api.get('/products');
    const catalogProducts: CatalogProduct[] = response.data;
    
    // Create a map of supplier codes to artis codes
    const supplierCodeMap = new Map<string, Set<string>>();
    catalogProducts.forEach((product: CatalogProduct) => {
      if (product.supplierCode && product.supplier) {
        const key = `${normalizeSupplierCode(product.supplierCode)}_${product.supplier}`;
        if (!supplierCodeMap.has(key)) {
          supplierCodeMap.set(key, new Set([product.artisCode]));
        } else {
          supplierCodeMap.get(key)?.add(product.artisCode);
        }
      }
    });

    // Process inventory items with precise decimal handling
    inventory.forEach(item => {
      const normalizedSupplierCode = item.product.supplierCode ? normalizeSupplierCode(item.product.supplierCode) : '';
      const groupKey = `${normalizedSupplierCode}_${item.product.supplier || ''}`;
      
      if (normalizedSupplierCode && item.product.supplier && supplierCodeMap.has(groupKey)) {
        if (!preGrouped.has(groupKey)) {
          preGrouped.set(groupKey, {
            ...item,
            currentStock: Number(parseFloat(item.currentStock.toString()).toFixed(2)),
            product: {
              ...item.product,
              artisCode: Array.from(supplierCodeMap.get(groupKey) || [])
                .sort((a, b) => Number(a) - Number(b))
                .join(' / ')
            }
          });
        } else {
          const existing = preGrouped.get(groupKey);
          const newStock = Number(existing.currentStock) + Number(item.currentStock);
          existing.currentStock = Number(parseFloat(newStock.toString()).toFixed(2));
        }
      } else {
        preGrouped.set(item.id, {
          ...item,
          currentStock: Number(parseFloat(item.currentStock.toString()).toFixed(2))
        });
      }
    });

    return Array.from(preGrouped.values());
  } catch (error) {
    console.error('Error grouping inventory:', error);
    return inventory;
  }
};

const InventoryList: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    supplier: '',
    category: '',
  });

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getAllInventory();
      const inventoryData = Array.isArray(response?.data) ? response.data : [];
      const groupedData = await groupInventoryBySupplierCode(inventoryData);
      setInventory(groupedData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setError('Failed to fetch inventory');
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const sortedInventory = useMemo(() => {
    if (!Array.isArray(inventory)) return [];
    return [...inventory].sort((a, b) => {
      // Parse the numbers to ensure correct comparison
      const stockA = Number(parseFloat(a.currentStock.toString()).toFixed(2));
      const stockB = Number(parseFloat(b.currentStock.toString()).toFixed(2));
      return sortOrder === 'asc' ? stockA - stockB : stockB - stockA;
    });
  }, [inventory, sortOrder]);

  const { suppliers, categories } = useMemo(() => {
    const suppliersSet = new Set<string>();
    const categoriesSet = new Set<string>();

    inventory.forEach((item) => {
      if (item.product?.supplier) suppliersSet.add(item.product.supplier);
      if (item.product?.category) categoriesSet.add(item.product.category);
    });

    return {
      suppliers: Array.from(suppliersSet).sort(),
      categories: Array.from(categoriesSet).sort(),
    };
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const searchTerm = filters.search.toLowerCase();
      const matchesSearch = 
        item.product?.artisCode?.toLowerCase().includes(searchTerm) ||
        item.product?.name?.toLowerCase().includes(searchTerm) ||
        item.product?.supplierCode?.toLowerCase().includes(searchTerm);

      const matchesSupplier = !filters.supplier || item.product?.supplier === filters.supplier;
      const matchesCategory = !filters.category || item.product?.category === filters.category;

      return matchesSearch && matchesSupplier && matchesCategory;
    });
  }, [inventory, filters]);

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const renderGridView = () => (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
        <Typography variant="subtitle1" sx={{ mr: 1 }}>Sort by Current Stock:</Typography>
        <Button 
          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
          startIcon={sortOrder === 'asc' ? '↑' : '↓'}
          sx={{ 
            color: isDarkMode ? '#90CAF9' : '#1976d2',
            fontWeight: 'bold'
          }}
        >
          {sortOrder === 'asc' ? 'Low to High' : 'High to Low'}
        </Button>
      </Box>
      <Grid container spacing={2}>
        {filteredInventory
          .sort((a, b) => {
            const stockA = Number(parseFloat(a.currentStock.toString()).toFixed(2));
            const stockB = Number(parseFloat(b.currentStock.toString()).toFixed(2));
            return sortOrder === 'asc' ? stockA - stockB : stockB - stockA;
          })
          .map((item) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent>
                  <Typography variant="h6">{item.product.artisCode}</Typography>
                  <Typography color="textSecondary">{item.product.supplierCode || '-'}</Typography>
                  <Typography>{item.product.supplier || '-'}</Typography>
                  <Typography>{item.product.category || '-'}</Typography>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      mt: 2,
                      color: isDarkMode ? '#90CAF9' : '#1A237E',
                      fontWeight: 'bold'
                    }}
                  >
                    {item.currentStock}<span className="unit">kgs</span>
                  </Typography>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    sx={{ mt: 2 }}
                    onClick={async () => {
                      const artisCodesArray = item.product.artisCode.split('/').map(code => code.trim());
                      let selectedId = item.productId;

                      if (artisCodesArray.length > 1) {
                        try {
                          const firstArtisCode = artisCodesArray[0];
                          const response = await api.get(`/products/by-artis-code/${firstArtisCode}`);
                          if (response.data) {
                            selectedId = response.data.id;
                          }
                        } catch (error) {
                          console.error('Error finding product:', error);
                        }
                      }
                      
                      setSelectedProduct(selectedId);
                      setDetailsOpen(true);
                    }}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
      </Grid>
    </Box>
  );

  const renderFilterControls = () => (
    <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <TextField
        label="Search"
        variant="outlined"
        size="small"
        value={filters.search}
        onChange={(e) => handleFilterChange('search', e.target.value)}
        sx={{ minWidth: 200 }}
      />

      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel>Supplier</InputLabel>
        <Select
          value={filters.supplier}
          label="Supplier"
          onChange={(e: SelectChangeEvent) => handleFilterChange('supplier', e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          {suppliers.map((supplier) => (
            <MenuItem key={supplier} value={supplier}>
              {supplier}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel>Category</InputLabel>
        <Select
          value={filters.category}
          label="Category"
          onChange={(e: SelectChangeEvent) => handleFilterChange('category', e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          {categories.map((category) => (
            <MenuItem key={category} value={category}>
              {category}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Inventory Management
        </Typography>
        <Box>
          <IconButton 
            onClick={() => setViewMode(prev => prev === 'list' ? 'grid' : 'list')} 
            sx={{ mr: 1 }}
          >
            {viewMode === 'list' ? <GridViewIcon /> : <ListIcon />}
          </IconButton>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchInventory} sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setBulkUploadOpen(true)}
            sx={{ mr: 1 }}
          >
            Bulk Upload
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setTransactionOpen(true)}
          >
            Add Transaction
          </Button>
        </Box>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {renderFilterControls()}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : viewMode === 'list' ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width="50">#</TableCell>
                <TableCell>Design Code</TableCell>
                <TableCell>Supplier Code</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell>Category</TableCell>
                <TableCell 
                  align="right" 
                  sx={{ 
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    backgroundColor: 'primary.main',
                    color: 'white'
                  }}
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                >
                  Current Stock {sortOrder === 'asc' ? '↑' : '↓'}
                </TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedInventory
                .filter((item) => {
                  const searchTerm = filters.search.toLowerCase();
                  const matchesSearch = 
                    item.product?.artisCode?.toLowerCase().includes(searchTerm) ||
                    item.product?.name?.toLowerCase().includes(searchTerm) ||
                    item.product?.supplierCode?.toLowerCase().includes(searchTerm);

                  const matchesSupplier = !filters.supplier || item.product?.supplier === filters.supplier;
                  const matchesCategory = !filters.category || item.product?.category === filters.category;

                  return matchesSearch && matchesSupplier && matchesCategory;
                })
                .map((item, index) => (
                  <TableRow 
                    key={item.id}
                    sx={{ '&:hover': { backgroundColor: 'action.hover' } }}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{item.product.artisCode}</TableCell>
                    <TableCell>{item.product.supplierCode || '-'}</TableCell>
                    <TableCell>{item.product.supplier || '-'}</TableCell>
                    <TableCell>{item.product.category || '-'}</TableCell>
                    <TableCell 
                      align="right"
                      sx={{
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        '& .unit': {
                          fontSize: '0.8rem',
                          marginLeft: '4px'
                        }
                      }}
                    >
                      <Box component="span" sx={{ color: isDarkMode ? '#90CAF9' : '#1A237E' }}>
                        {item.currentStock}
                      </Box>
                      <span className="unit">kgs</span>
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="small" 
                        variant="outlined" 
                        onClick={async () => {
                          console.log('Opening details for:', {
                            item: {
                              id: item.id,
                              productId: item.productId,
                              currentStock: item.currentStock,
                              product: {
                                artisCode: item.product.artisCode,
                                supplierCode: item.product.supplierCode,
                                supplier: item.product.supplier
                              }
                            }
                          });
                          
                          const artisCodesArray = item.product.artisCode.split('/').map(code => code.trim());
                          let selectedId = item.productId;

                          if (artisCodesArray.length > 1) {
                            try {
                              const firstArtisCode = artisCodesArray[0];
                              const response = await api.get(`/products/by-artis-code/${firstArtisCode}`);
                              if (response.data) {
                                selectedId = response.data.id;
                              }
                            } catch (error) {
                              console.error('Error finding product:', error);
                            }
                          }
                          
                          console.log('Selected Product ID:', selectedId);
                          setSelectedProduct(selectedId);
                          setDetailsOpen(true);
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
      ) : (
        renderGridView()
      )}

      <TransactionDialog
        open={transactionOpen}
        onClose={() => setTransactionOpen(false)}
        productId={selectedProduct}
        onSuccess={fetchInventory}
      />

      <ProductDetailsDialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        productId={selectedProduct!}
      />

      <BulkUploadDialog
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
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