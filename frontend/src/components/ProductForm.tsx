import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
} from '@mui/material';
import { Product } from '../types/product';
import api from '../services/api';

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  onSubmit: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ open, onClose, product, onSubmit }) => {
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const productData = {
      artisCode: formData.get('artisCode'),
      name: formData.get('name'),
      category: formData.get('category'),
      supplierCode: formData.get('supplierCode'),
      supplier: formData.get('supplier'),
      gsm: formData.get('gsm'),
      catalogs: formData.get('catalogs')?.toString().split(',').map(s => s.trim()),
    };

    try {
      if (product) {
        await api.put(`/products/${product.id}`, productData);
      } else {
        await api.post('/products', productData);
      }
      onSubmit();
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{product ? 'Edit Product' : 'Add Product'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              required
              name="artisCode"
              label="Artis Code"
              defaultValue={product?.artisCode}
            />
            <TextField
              required
              name="name"
              label="Name"
              defaultValue={product?.name}
            />
            <TextField
              required
              name="category"
              label="Category"
              defaultValue={product?.category}
            />
            <TextField
              name="supplierCode"
              label="Supplier Code"
              defaultValue={product?.supplierCode}
            />
            <TextField
              name="supplier"
              label="Supplier"
              defaultValue={product?.supplier}
            />
            <TextField
              name="gsm"
              label="GSM"
              defaultValue={product?.gsm}
            />
            <TextField
              name="catalogs"
              label="Catalogs (comma-separated)"
              defaultValue={product?.catalogs?.join(', ')}
              helperText="Enter catalogs separated by commas"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            {product ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ProductForm; 