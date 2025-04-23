import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Autocomplete,
  Typography,
  FormControlLabel,
  Switch
} from '@mui/material';
import { inventoryApi, productApi } from '../../services/api';
import { TransactionData } from '../../types/transaction';

interface Product {
  id: string;
  artisCodes: string[];
  name: string;
  supplierCode?: string;
  supplier?: string;
  displayName?: string;
}

interface TransactionDialogProps {
  open: boolean;
  onClose: () => void;
  productId: string | null;
  onSuccess: () => void;
}

const normalizeSupplierCode = (code: string | undefined): string => {
  if (!code) return '';
  return code.replace(/[\s\-\.]+/g, '').replace(/([A-Za-z])$/, '-$1').toUpperCase();
};

const TransactionDialog: React.FC<TransactionDialogProps> = ({
  open,
  onClose,
  productId,
  onSuccess
}) => {
  const [type, setType] = useState<'IN' | 'OUT' | 'CORRECTION'>('IN');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [includeInAvg, setIncludeInAvg] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await productApi.getAllProducts();
        setProducts(response.data);
        if (productId) {
          const product = response.data.find((p: Product) => p.id === productId);
          setSelectedProduct(product || null);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      }
    };
    fetchProducts();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setError('');
    setLoading(true);
    console.log('Starting transaction creation:', {
      type,
      quantity,
      productId: selectedProduct.id,
      date
    });

    try {
      const parsedQuantity = Number(quantity);
      if (isNaN(parsedQuantity)) {
        setError('Please enter a valid number');
        return;
      }
      
      if (parsedQuantity === 0) {
        setError('Quantity cannot be zero');
        return;
      }
      
      if (parsedQuantity < 0 && type !== 'CORRECTION') {
        setError(`${type === 'IN' ? 'Stock in' : 'Stock out'} quantity must be positive`);
        return;
      }

      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        setError('Invalid date');
        return;
      }

      console.log('Sending transaction request:', {
        productId: selectedProduct.id,
        type,
        quantity: parsedQuantity,
        notes,
        date: parsedDate,
        includeInAvg: type === 'OUT' ? includeInAvg : false
      });

      const response = await inventoryApi.createTransaction({
        productId: selectedProduct.id,
        type,
        quantity: parsedQuantity,
        notes,
        date: parsedDate,
        includeInAvg: type === 'OUT' ? includeInAvg : false
      });
      console.log('Transaction response:', response);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Detailed transaction error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError(error.response?.data?.details || 'Failed to create transaction');
    } finally {
      setLoading(false);
    }
  };

  const groupedProducts = useMemo(() => {
    const preGrouped = new Map();
    
    products.forEach(p => {
      const normalizedSupplierCode = p.supplierCode ? normalizeSupplierCode(p.supplierCode) : '';
      const groupKey = `${normalizedSupplierCode}_${p.supplier || ''}`;
      
      if (normalizedSupplierCode && p.supplier) {
        if (!preGrouped.has(groupKey)) {
          preGrouped.set(groupKey, {
            ...p,
            artisCodes: p.artisCodes,
            _artisCodeSet: new Set(p.artisCodes)
          });
        } else {
          const existing = preGrouped.get(groupKey);
          if (existing.supplier === p.supplier) {
            p.artisCodes.forEach(code => existing._artisCodeSet.add(code));
          }
        }
      } else {
        preGrouped.set(p.id, p);
      }
    });

    return Array.from(preGrouped.values()).map(product => {
      if (product._artisCodeSet) {
        const { _artisCodeSet, ...rest } = product;
        return {
          ...rest,
          artisCodes: Array.from(_artisCodeSet).sort()
        };
      }
      return product;
    });
  }, [products]);

  const fetchProducts = async (searchTerm: string) => {
    try {
      const response = await productApi.searchProducts(searchTerm);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  useEffect(() => {
    if (type !== 'OUT') {
      setIncludeInAvg(false);
    }
  }, [type]);

  const getQuantityLabel = () => {
    if (type === 'IN') return 'Quantity Received';
    if (type === 'OUT') return 'Quantity Consumed';
    if (type === 'CORRECTION') return 'Adjustment Amount';
    return 'Quantity';
  };

  const getQuantityHelperText = () => {
    if (type === 'CORRECTION') {
      return 'Enter a positive value to increase stock or negative value to decrease stock';
    }
    return '';
  };

  const isNegativeAllowed = type === 'CORRECTION';

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Add Inventory Transaction</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Autocomplete
              options={groupedProducts}
              getOptionLabel={(option) => `${option.supplierCode || ''} (${option.artisCodes.join('/')})`}
              value={selectedProduct}
              onChange={(_, newValue) => setSelectedProduct(newValue)}
              filterOptions={(options, { inputValue }) => {
                const searchTerm = inputValue.toLowerCase();
                return options.filter(option => 
                  option.artisCodes.some((code: string) => code.toLowerCase().includes(searchTerm)) ||
                  (option.supplierCode?.toLowerCase() || '').includes(searchTerm)
                );
              }}
              renderOption={(props, option) => (
                <Box component="li" {...props} sx={{ display: 'flex', gap: 1 }}>
                  <Box component="span" sx={{ fontWeight: 'bold', minWidth: '100px' }}>
                    {option.supplierCode || ''}
                  </Box>
                  <Box 
                    component="span" 
                    sx={{ color: 'text.secondary' }}
                  >
                    ({option.artisCodes.join('/')})
                  </Box>
                </Box>
              )}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Select Design" 
                  required
                  placeholder="Search by Design Code or Supplier ID"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <Box 
                          component="span" 
                          sx={{ 
                            color: 'text.secondary',
                            display: 'flex',
                            alignItems: 'center',
                            pl: 1
                          }}
                        >
                          🔍
                        </Box>
                        {params.InputProps.startAdornment}
                      </>
                    )
                  }}
                />
              )}
              isOptionEqualToValue={(option, value) => option.id === value?.id}
            />
            <TextField
              select
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value as 'IN' | 'OUT' | 'CORRECTION')}
              fullWidth
            >
              <MenuItem value="IN">Stock In</MenuItem>
              <MenuItem value="OUT">Stock Out</MenuItem>
              <MenuItem value="CORRECTION">Stock Correction</MenuItem>
            </TextField>
            <TextField
              label={getQuantityLabel()}
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              fullWidth
              required
              helperText={getQuantityHelperText()}
              InputProps={{
                inputProps: { 
                  min: isNegativeAllowed ? undefined : 0,
                  step: 0.01 
                },
                endAdornment: (
                  <Box component="span" sx={{ color: 'text.secondary' }}>
                    kgs
                  </Box>
                ),
              }}
            />
            <TextField
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Notes"
              multiline
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              required={type === 'CORRECTION'}
              helperText={type === 'CORRECTION' ? 'Please provide a reason for the correction' : ''}
            />
            {type === 'OUT' && (
              <FormControlLabel
                control={
                  <Switch
                    checked={includeInAvg}
                    onChange={(e) => setIncludeInAvg(e.target.checked)}
                  />
                }
                label="Include in Average Consumption Calculation"
              />
            )}
            {error && (
              <Typography color="error" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TransactionDialog; 