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
import { productApi } from '../services/api';
import FileDownload from '@mui/icons-material/FileDownload';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BulkImportDialog: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [updateMode, setUpdateMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      const response = await productApi.bulkCreate(file, updateMode);
      console.log('Import response:', response.data);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error importing products:', {
        response: error.response?.data,
        status: error.response?.status,
        error: error
      });
      setErrorMessage(error.response?.data?.error || 'Failed to import products');
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
      {errorMessage && (
        <Box sx={{ 
          color: 'error.main', 
          mt: 2, 
          px: 3,
          typography: 'body2' 
        }}>
          {errorMessage}
        </Box>
      )}
      <DialogActions>
        <Button
          variant="outlined"
          startIcon={<FileDownload />}
          onClick={(e) => setExportAnchorEl(e.currentTarget)}
        >
          Export Designs
        </Button>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!file}>
          Import
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkImportDialog; 