import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Stack,
  TextField,
  Checkbox,
  ListItemText,
  Chip,
  Divider,
  Grid,
  Card,
  CardContent,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { Product } from '../types/product';
import { generateOrderPDF } from '../utils/pdfGenerator';
import api from '../services/api';
import CatalogTags from './CatalogTags';
import { useTheme } from '../context/ThemeContext';

interface OrderItem {
  product: Product;
  quantity: number;
}

const normalizeSupplierCode = (code: string | undefined): string => {
  if (!code) return '';
  return code.replace(/[\s\-\.]+/g, '').replace(/([A-Za-z])$/, '-$1').toUpperCase();
};

const DesignPaperOrder: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryLevels, setInventoryLevels] = useState<Map<string, number>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const productsResponse = await api.get('/api/products');
        setProducts(productsResponse.data);
        
        // Create a map of productId to current stock directly from products
        const stockMap = new Map();
        productsResponse.data.forEach((product: any) => {
          stockMap.set(product.id, product.currentStock);
        });
        setInventoryLevels(stockMap);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  const uniqueSuppliers = useMemo(() => {
    return Array.from(new Set(
      products
        .map(p => p.supplier)
        .filter(Boolean)
    )).sort();
  }, [products]);

  // Filter products by selected supplier
  const supplierProducts = useMemo(() => {
    return products.filter(p => p.supplier === selectedSupplier);
  }, [products, selectedSupplier]);

  const handleSupplierChange = (event: any) => {
    setSelectedSupplier(event.target.value);
    setSelectedProducts([]);
    setOrderItems([]);
  };

  const handleProductSelection = (event: any) => {
    const selectedIds = event.target.value as string[];
    const newSelectedProducts = groupedProducts.filter(p => 
      selectedIds.includes(p.id.toString())
    );
    setSelectedProducts(newSelectedProducts);
    
    setOrderItems(newSelectedProducts.map(p => ({
      product: {
        ...p,
        artisCodes: p.artisCodes,
        catalogs: p.catalogs
      },
      quantity: 0
    })));
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setOrderItems(prev => 
      prev.map(item => 
        item.product.id.toString() === productId 
          ? { ...item, quantity } 
          : item
      )
    );
  };

  const handleGenerateOrder = async () => {
    const validOrderItems = orderItems.filter(item => item.quantity > 0);
    if (validOrderItems.length === 0) return;
    
    try {
      console.log('Starting order generation with items:', validOrderItems);
      console.log('Selected supplier:', selectedSupplier);
      
      await generateOrderPDF({
        supplier: selectedSupplier,
        items: validOrderItems,
        date: new Date()
      });
      
      console.log('PDF generation completed successfully');
    } catch (error) {
      if (error instanceof Error) {
        console.error('Failed to generate PDF:', {
          error,
          message: error.message,
          stack: error.stack
        });
        alert(`Failed to generate PDF: ${error.message}`);
      } else {
        console.error('Failed to generate PDF:', error);
        alert('Failed to generate PDF: Unknown error');
      }
    }
  };

  const groupedProducts = useMemo(() => {
    const preGrouped = new Map();
    
    supplierProducts.forEach(p => {
      const normalizedSupplierCode = p.supplierCode ? normalizeSupplierCode(p.supplierCode) : '';
      const groupKey = `${normalizedSupplierCode}_${p.supplier || ''}`;
      
      if (normalizedSupplierCode && p.supplier) {
        if (!preGrouped.has(groupKey)) {
          preGrouped.set(groupKey, {
            ...p,
            artisCodes: p.artisCodes,
            supplierCode: p.supplierCode,
            name: p.name || null,
            _catalogSet: new Set(p.catalogs || [])
          });
        } else {
          const existing = preGrouped.get(groupKey);
          if (existing.supplier === p.supplier) {
            existing.artisCodes = [...existing.artisCodes, ...p.artisCodes];
            existing.name = existing.name || p.name;
            
            if (p.catalogs) {
              p.catalogs.forEach(catalog => existing._catalogSet.add(catalog));
            }
          }
        }
      }
    });

    return Array.from(preGrouped.values()).map(product => {
      const { _catalogSet, ...rest } = product;
      return {
        ...rest,
        catalogs: Array.from(_catalogSet)
      };
    });
  }, [supplierProducts]);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ mb: 3, color: isDarkMode ? '#ffffff' : '#2b2a29' }}>
          Design Paper Order
        </Typography>

        <Stack spacing={3}>
          <FormControl fullWidth>
            <InputLabel>Select Supplier</InputLabel>
            <Select
              value={selectedSupplier}
              onChange={handleSupplierChange}
              label="Select Supplier"
              sx={{ '& .MuiSelect-select': { py: 1.5 } }}
            >
              {uniqueSuppliers.map((supplier) => (
                <MenuItem key={supplier} value={supplier}>
                  {supplier}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedSupplier && (
            <FormControl fullWidth>
              <InputLabel>Select Products</InputLabel>
              <Select
                multiple
                value={selectedProducts.map(p => p.id)}
                onChange={handleProductSelection}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    <Chip 
                      label={`${selected.length} products selected`}
                      sx={{ bgcolor: '#2b2a29', color: 'white' }}
                    />
                  </Box>
                )}
                label="Select Products"
                sx={{ '& .MuiSelect-select': { py: 1.5 } }}
              >
                <MenuItem 
                  sx={{ p: 0 }} 
                  disableRipple 
                  onClick={(e) => e.preventDefault()}
                >
                  <TextField
                    size="small"
                    placeholder="Search designs..."
                    value={searchQuery}
                    onChange={(e) => {
                      e.stopPropagation();
                      setSearchQuery(e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    fullWidth
                    sx={{ 
                      p: 1,
                      '& .MuiOutlinedInput-notchedOutline': {
                        border: 'none'
                      }
                    }}
                  />
                </MenuItem>
                {groupedProducts
                  .filter(product => {
                    const query = searchQuery.toLowerCase();
                    const supplierCode = (product.supplierCode || '').toString().toLowerCase();
                    const name = (product.name || '').toString().toLowerCase();
                    const artisCodes = product.artisCodes.join(' ').toLowerCase();
                    
                    return supplierCode.includes(query) || 
                           name.includes(query) || 
                           artisCodes.includes(query);
                  })
                  .map((product) => (
                    <MenuItem key={product.id} value={product.id}>
                      <Checkbox 
                        checked={selectedProducts.some(p => 
                          normalizeSupplierCode(p.supplierCode) === normalizeSupplierCode(product.supplierCode) && 
                          p.supplier === product.supplier
                        )} 
                      />
                      <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', width: '100%' }}>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle1">
                            {product.supplierCode} - {product.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Artis Codes: {product.artisCodes.join(' / ')}
                          </Typography>
                          <Box sx={{ mt: 0.5 }}>
                            <CatalogTags catalogs={product.catalogs ?? []} />
                          </Box>
                        </Box>
                        <Chip
                          label={`${inventoryLevels.get(product.id) || 0} kgs`}
                          color={inventoryLevels.get(product.id) ? 'primary' : 'default'}
                          size="small"
                          sx={{ ml: 2 }}
                        />
                      </Box>
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          )}

          {orderItems.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ color: '#2b2a29', mb: 2 }}>
                Order Quantities
              </Typography>
              
              <Grid container spacing={2}>
                {orderItems.map((item) => (
                  <Grid item xs={12} key={item.product.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} md={8}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                              {item.product.supplierCode} - {item.product.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" display="block">
                              Artis Codes: {item.product.artisCodes.join(' / ')}
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              <CatalogTags catalogs={item.product.catalogs ?? []} />
                            </Box>
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TextField
                                  type="number"
                                  label="Quantity (kg)"
                                  value={item.quantity || ''}
                                  onChange={(e) => handleQuantityChange(
                                    item.product.id.toString(),
                                    parseInt(e.target.value) || 0
                                  )}
                                  fullWidth
                                  size="small"
                                  InputProps={{
                                    endAdornment: <Typography variant="caption">kg</Typography>
                                  }}
                                />
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  onClick={() => {
                                    setSelectedProducts(prev => 
                                      prev.filter(p => p.id !== item.product.id)
                                    );
                                    setOrderItems(prev =>
                                      prev.filter(i => i.product.id !== item.product.id)
                                    );
                                  }}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  color: 'text.secondary'
                                }}
                              >
                                Current Stock: 
                                <Chip
                                  label={`${inventoryLevels.get(item.product.id) || 0} kgs`}
                                  color={inventoryLevels.get(item.product.id) ? 'primary' : 'default'}
                                  size="small"
                                  sx={{ ml: 1 }}
                                />
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              <Button
                variant="contained"
                onClick={handleGenerateOrder}
                disabled={!orderItems.some(item => item.quantity > 0)}
                sx={{ 
                  mt: 2,
                  bgcolor: '#2b2a29',
                  '&:hover': { bgcolor: '#404040' }
                }}
              >
                Generate Order
              </Button>
            </>
          )}
        </Stack>
      </Paper>
    </Box>
  );
};

export default DesignPaperOrder; 