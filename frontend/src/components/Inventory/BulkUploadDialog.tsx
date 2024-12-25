import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Link
} from '@mui/material';
import { api } from '../../services/api';

interface BulkUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BulkUploadDialog: React.FC<BulkUploadDialogProps> = ({ open, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/inventory/bulk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Upload response:', response.data);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Upload error:', error.response?.data || error);
      setError(error.response?.data?.error || 'Failed to upload file');
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Bulk Upload Inventory</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" gutterBottom>
            Download the template file first:
          </Typography>
          <Link 
            href="/templates/inventory-template.xlsx" 
            download
            sx={{ textDecoration: 'none' }}
          >
            <Button variant="outlined" color="primary">
              Download Template
            </Button>
          </Link>
        </Box>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          style={{ marginBottom: '1rem' }}
        />
        {error && (
          <Typography color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleUpload} variant="contained" disabled={!file}>
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkUploadDialog; 