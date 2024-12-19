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
import { MovementType, InventoryType } from '../types/index';
import api from '../services/api';

interface InventoryMovementFormProps {
  open: boolean;
  onClose: () => void;
  skuId: string;
  skuType: string;
  onSubmit: () => void;
}

const InventoryMovementForm: React.FC<InventoryMovementFormProps> = ({
  open,
  onClose,
  skuId,
  skuType,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    movementType: '',
    quantity: '',
    fromSkuId: '',
    notes: ''
  });
  const [availableRolls, setAvailableRolls] = useState<Array<{ id: string; code: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (skuType === InventoryType.DESIGN_PAPER_SHEET && formData.movementType === MovementType.CONVERSION) {
      const fetchRolls = async () => {
        try {
          const response = await api.get('/skus', {
            params: { type: InventoryType.DESIGN_PAPER_ROLL }
          });
          setAvailableRolls(response.data);
        } catch (error) {
          setError('Failed to fetch available rolls');
        }
      };
      fetchRolls();
    }
  }, [skuType, formData.movementType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await api.post('/inventory-movements', {
        skuId,
        ...formData,
        quantity: Number(formData.quantity),
        movementType: formData.movementType as MovementType,
        date: new Date()
      });
      onSubmit();
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to record movement');
    }
  };

  const handleChange = (field: string) => (event: any) => {
    setFormData({ ...formData, [field]: event.target.value });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Record Inventory Movement</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Movement Type</InputLabel>
              <Select
                value={formData.movementType}
                onChange={handleChange('movementType')}
                label="Movement Type"
              >
                <MenuItem value={MovementType.STOCK_IN}>Stock In</MenuItem>
                <MenuItem value={MovementType.STOCK_OUT}>Stock Out</MenuItem>
                {skuType === InventoryType.DESIGN_PAPER_SHEET && (
                  <MenuItem value={MovementType.CONVERSION}>Convert from Roll</MenuItem>
                )}
              </Select>
            </FormControl>

            {formData.movementType === MovementType.CONVERSION && (
              <FormControl fullWidth required>
                <InputLabel>Source Roll</InputLabel>
                <Select
                  value={formData.fromSkuId}
                  onChange={handleChange('fromSkuId')}
                  label="Source Roll"
                >
                  {availableRolls.map(roll => (
                    <MenuItem key={roll.id} value={roll.id}>
                      {roll.code}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              label="Quantity"
              type="number"
              value={formData.quantity}
              onChange={handleChange('quantity')}
              required
              fullWidth
              inputProps={{ min: 0, step: "0.01" }}
            />

            <TextField
              label="Notes"
              multiline
              rows={3}
              value={formData.notes}
              onChange={handleChange('notes')}
              fullWidth
            />

            {error && (
              <Box sx={{ color: 'error.main', mt: 1 }}>
                {error}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary">
            Submit
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default InventoryMovementForm; 