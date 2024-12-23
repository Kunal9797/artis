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
  Typography
} from '@mui/material';
import { createTransaction, getAllProducts, api } from '../../services/api';

interface Product {
  id: string;
  artisCode: string;
  name: string;
  supplierCode?: string;
  supplier?: string;
  displayName?: string;
}

interface TransactionData {
  productId: string;
  type: 'IN' | 'OUT';
  quantity: number;
  notes?: string;
  date?: string;
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
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getAllProducts();
        setProducts(data);
        if (productId) {
          const product = data.find((p: Product) => p.id === productId);
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
    try {
      setError('');
      setLoading(true);
      const response = await createTransaction({
        productId: selectedProduct?.id || '',
        type,
        quantity: Number(quantity),
        notes,
        date
      });
      
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Transaction error:', error);
      const errorMessage = error.response?.data?.message || 
                          'Failed to create transaction';
      setError(errorMessage);
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
            artisCode: p.artisCode,
            _artisCodeSet: new Set([p.artisCode])
          });
        } else {
          const existing = preGrouped.get(groupKey);
          if (existing.supplier === p.supplier) {
            existing._artisCodeSet.add(p.artisCode);
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
          artisCode: Array.from(_artisCodeSet).sort().join('/')
        };
      }
      return product;
    });
  }, [products]);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Add Inventory Transaction</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Autocomplete
              options={groupedProducts}
              getOptionLabel={(option) => `${option.supplierCode || ''} (${option.artisCode})`}
              value={selectedProduct}
              onChange={(_, newValue) => setSelectedProduct(newValue)}
              filterOptions={(options, { inputValue }) => {
                const searchTerm = inputValue.toLowerCase();
                return options.filter(option => 
                  option.artisCode.toLowerCase().includes(searchTerm) ||
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
                    ({option.artisCode})
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
              onChange={(e) => setType(e.target.value as 'IN' | 'OUT')}
              fullWidth
            >
              <MenuItem value="IN">Stock In</MenuItem>
              <MenuItem value="OUT">Stock Out</MenuItem>
            </TextField>
            <TextField
              label="Quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              fullWidth
              required
              InputProps={{
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
            />
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