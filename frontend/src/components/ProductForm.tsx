import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box
} from '@mui/material';
import { Product, InventoryType, MeasurementUnit } from '../types';
import api from '../services/api';
import { SelectChangeEvent } from '@mui/material';

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  product?: Product;
  onSubmit: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ open, onClose, product, onSubmit }) => {
  const [designPapers, setDesignPapers] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    artisCode: '',
    name: '',
    category: '',
    inventoryType: InventoryType.DESIGN_PAPER_SHEET,
    supplierCode: '',
    supplier: '',
    measurementUnit: MeasurementUnit.WEIGHT,
    texture: '',
    thickness: '',
    designPaperId: ''
  });

  useEffect(() => {
    // Fetch design papers for the dropdown
    const fetchDesignPapers = async () => {
      try {
        const response = await api.get('/products');
        setDesignPapers(response.data.filter(
          (p: Product) => p.inventoryType === InventoryType.DESIGN_PAPER_SHEET
        ));
      } catch (error) {
        console.error('Error fetching design papers:', error);
      }
    };
    fetchDesignPapers();
  }, []);

  useEffect(() => {
    if (product) {
      setFormData({
        artisCode: product.artisCode || '',
        name: product.name || '',
        category: product.category || '',
        inventoryType: product.inventoryType || InventoryType.DESIGN_PAPER_SHEET,
        supplierCode: product.supplierCode || '',
        supplier: product.supplier || '',
        measurementUnit: product.measurementUnit || MeasurementUnit.WEIGHT,
        texture: product.texture || '',
        thickness: product.thickness || '',
        designPaperId: product.designPaperId || ''
      });
    } else {
      setFormData({
        artisCode: '',
        name: '',
        category: '',
        inventoryType: InventoryType.DESIGN_PAPER_SHEET,
        supplierCode: '',
        supplier: '',
        measurementUnit: MeasurementUnit.WEIGHT,
        texture: '',
        thickness: '',
        designPaperId: ''
      });
    }
  }, [product]);

  const handleSubmit = async () => {
    try {
      console.log('Submitting product data:', formData);
      
      const productData = {
        ...formData,
        supplierCode: formData.supplierCode || null,
        supplier: formData.supplier || null,
        texture: formData.texture || null,
        thickness: formData.thickness || null,
        designPaperId: formData.designPaperId || null,
        category: formData.inventoryType === InventoryType.DESIGN_PAPER_SHEET 
          ? formData.category 
          : null,
        measurementUnit: formData.inventoryType === InventoryType.DESIGN_PAPER_SHEET 
          ? MeasurementUnit.WEIGHT 
          : MeasurementUnit.UNITS
      };

      console.log('Processed product data:', productData);

      if (product) {
        await api.put(`/products/${product.id}`, productData);
      } else {
        // Use the new endpoints based on product type
        if (formData.inventoryType === InventoryType.DESIGN_PAPER_SHEET) {
          await api.post('/products/design-paper', productData);
        } else {
          await api.post('/products/laminate', productData);
        }
      }
      onSubmit();
      onClose();
    } catch (error: any) {
      console.error('Full error:', error);
      console.error('Error response:', error.response?.data);
      alert(error.response?.data?.details || error.response?.data?.error || 'Error saving product');
    }
  };

  const handleChange = (field: keyof typeof formData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSelectChange = (field: keyof typeof formData) => (
    event: SelectChangeEvent<InventoryType>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value as InventoryType
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{product ? 'Edit Product' : 'New Product'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select
              value={formData.inventoryType}
              onChange={handleSelectChange('inventoryType')}
              label="Type"
              required
            >
              <MenuItem value={InventoryType.DESIGN_PAPER_SHEET}>Design Paper</MenuItem>
              <MenuItem value={InventoryType.LAMINATE_SHEET}>Laminate Sheet</MenuItem>
            </Select>
          </FormControl>

          {formData.inventoryType === InventoryType.LAMINATE_SHEET && (
            <FormControl fullWidth required>
              <InputLabel>Design Paper</InputLabel>
              <Select
                value={formData.designPaperId as InventoryType}
                onChange={handleSelectChange('designPaperId')}
                label="Design Paper"
              >
                {designPapers.map((paper) => (
                  <MenuItem key={paper.id} value={paper.id}>
                    {paper.artisCode} - {paper.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField
            label="Artis Code"
            value={formData.artisCode}
            onChange={handleChange('artisCode')}
            fullWidth
            required
          />

          <TextField
            label="Name"
            value={formData.name}
            onChange={handleChange('name')}
            fullWidth
            required
          />

          {formData.inventoryType === InventoryType.LAMINATE_SHEET ? (
            <>
              <TextField
                label="Texture"
                value={formData.texture}
                onChange={handleChange('texture')}
                fullWidth
                required
              />
              <TextField
                label="Thickness"
                value={formData.thickness}
                onChange={handleChange('thickness')}
                fullWidth
                required
              />
            </>
          ) : (
            <>
              <TextField
                label="Category"
                value={formData.category}
                onChange={handleChange('category')}
                fullWidth
                required
              />
              <TextField
                label="Supplier Code"
                value={formData.supplierCode}
                onChange={handleChange('supplierCode')}
                fullWidth
              />
              <TextField
                label="Supplier"
                value={formData.supplier}
                onChange={handleChange('supplier')}
                fullWidth
              />
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          {product ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductForm; 