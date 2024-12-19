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
import { SKU, InventoryType, MeasurementUnit } from '../types';
import api from '../services/api';
import * as XLSX from 'xlsx';

interface SKUFormProps {
  open: boolean;
  onClose: () => void;
  sku?: SKU;
  onSubmit: () => void;
}

const SKUForm: React.FC<SKUFormProps> = ({ open, onClose, sku, onSubmit }) => {
  const [formData, setFormData] = useState<Partial<SKU>>({
    code: '',
    name: '',
    description: '',
    category: '',
    inventoryType: InventoryType.DESIGN_PAPER_ROLL,
    measurementUnit: MeasurementUnit.WEIGHT,
    quantity: 0,
    minimumStock: 0,
    reorderPoint: 0
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sku) {
      setFormData(sku);
    }
  }, [sku]);

  const handleChange = (field: keyof SKU) => (event: any) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (sku) {
        await api.put(`/skus/${sku.id}`, formData);
      } else {
        await api.post('/skus', formData);
      }
      onSubmit();
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Error saving SKU');
      console.error('Error saving SKU:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        try {
          await api.post('/skus/bulk', { skus: jsonData });
          onSubmit();
          onClose();
        } catch (error) {
          console.error('Error uploading SKUs:', error);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{sku ? 'Edit SKU' : 'Create SKU'}</DialogTitle>
        <DialogContent>
        {error && (
            <Box sx={{ color: 'error.main', mb: 2 }}>
              {error}
            </Box>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {!sku && (
              <Button
                variant="contained"
                component="label"
                sx={{ mb: 2 }}
              >
                Upload Excel File
                <input
                  type="file"
                  hidden
                  onChange={handleFileUpload}
                  accept=".xlsx,.xls"
                />
              </Button>
            )}
            
            {/* Form fields */}
            <TextField
              label="Code"
              value={formData.code}
              onChange={handleChange('code')}
              required
              fullWidth
            />
            <TextField
              label="Name"
              value={formData.name}
              onChange={handleChange('name')}
              required
              fullWidth
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={handleChange('description')}
              multiline
              rows={3}
              fullWidth
            />
            <TextField
              label="Category"
              value={formData.category}
              onChange={handleChange('category')}
              required
              fullWidth
            />
            <FormControl fullWidth required>
              <InputLabel>Inventory Type</InputLabel>
              <Select
                value={formData.inventoryType}
                onChange={handleChange('inventoryType')}
                label="Inventory Type"
              >
                {Object.values(InventoryType).map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Measurement Unit</InputLabel>
              <Select
                value={formData.measurementUnit}
                onChange={handleChange('measurementUnit')}
                label="Measurement Unit"
              >
                {Object.values(MeasurementUnit).map((unit) => (
                  <MenuItem key={unit} value={unit}>
                    {unit}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Minimum Stock"
              type="number"
              value={formData.minimumStock}
              onChange={handleChange('minimumStock')}
              fullWidth
              inputProps={{ min: 0, step: "0.01" }}
            />
            <TextField
              label="Reorder Point"
              type="number"
              value={formData.reorderPoint}
              onChange={handleChange('reorderPoint')}
              fullWidth
              inputProps={{ min: 0, step: "0.01" }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary">
            {sku ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default SKUForm; 