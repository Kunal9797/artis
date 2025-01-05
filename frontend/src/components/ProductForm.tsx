import React, { useState } from 'react';
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
import { productApi } from '../services/api';

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  onSubmit: () => void;
}

interface FormData {
  artisCode: string;
  name?: string;
  category?: string;
  supplierCode: string;
  supplier: string;
  gsm?: string;
  catalogs?: string[];
}

const ProductForm: React.FC<ProductFormProps> = ({ open, onClose, product, onSubmit }) => {
  const [formData, setFormData] = useState<FormData>({
    artisCode: product?.artisCodes?.[0] || '',
    name: product?.name || '',
    category: product?.category || '',
    supplierCode: product?.supplierCode || '',
    supplier: product?.supplier || '',
    gsm: product?.gsm || '',
    catalogs: product?.catalogs || []
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.artisCode || !formData.supplierCode || !formData.supplier) {
      alert('Please fill in all required fields: Artis Code, Supplier Code, and Supplier');
      return;
    }

    try {
      if (product) {
        await productApi.updateProduct(product.id, {
          ...formData,
          artisCodes: [...product.artisCodes, formData.artisCode]
        });
      } else {
        await productApi.createProduct({
          ...formData,
          artisCodes: [formData.artisCode]
        });
      }
      onSubmit();
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product');
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
              value={formData.artisCode}
              onChange={(e) => setFormData(prev => ({ ...prev, artisCode: e.target.value }))}
              helperText="Enter a single Artis Code"
            />
            <TextField
              name="name"
              label="Name"
              defaultValue={product?.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
            <TextField
              name="category"
              label="Category"
              defaultValue={product?.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            />
            <TextField
              required
              name="supplierCode"
              label="Supplier Code"
              defaultValue={product?.supplierCode}
              onChange={(e) => setFormData(prev => ({ ...prev, supplierCode: e.target.value }))}
            />
            <TextField
              required
              name="supplier"
              label="Supplier"
              defaultValue={product?.supplier}
              onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
            />
            <TextField
              name="gsm"
              label="GSM"
              defaultValue={product?.gsm}
              onChange={(e) => setFormData(prev => ({ ...prev, gsm: e.target.value }))}
            />
            <TextField
              name="catalogs"
              label="Catalogs (comma-separated)"
              defaultValue={product?.catalogs?.join(', ')}
              helperText="Enter catalogs separated by commas"
              onChange={(e) => {
                const catalogs = e.target.value.split(',').map(cat => cat.trim());
                setFormData(prev => ({ ...prev, catalogs }));
              }}
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