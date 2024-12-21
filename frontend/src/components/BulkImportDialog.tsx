import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Switch,
  Box,
  Link
} from '@mui/material';
import api from '../services/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BulkImportDialog: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [updateMode, setUpdateMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post(
        `/products/bulk?mode=${updateMode ? 'update' : 'create'}`, 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      console.log('Import response:', response.data);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error importing products:', {
        response: error.response?.data,
        status: error.response?.status,
        error: error
      });
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Bulk Import Products</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Link href="/templates/product-template.xlsx" download>
            Download Template
          </Link>
          <Box sx={{ my: 2 }}>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={updateMode}
                onChange={(e) => setUpdateMode(e.target.checked)}
              />
            }
            label="Update existing products"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!file}>
          Import
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkImportDialog; 