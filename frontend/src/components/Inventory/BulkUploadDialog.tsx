import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  Stack,
  Divider,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InventoryIcon from '@mui/icons-material/Inventory';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useTheme } from '../../context/ThemeContext';
import * as XLSX from 'xlsx';
import { api } from '../../services/api';

interface BulkUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type TemplateType = 'inventory' | 'purchase';

interface TemplateInfo {
  type: TemplateType;
  title: string;
  description: string;
  icon: React.ReactNode;
  columns: string[];
  format: string;
  example: string;
}

const templates: TemplateInfo[] = [
  {
    type: 'inventory',
    title: 'Inventory Update',
    description: 'Update stock levels and consumption data for multiple products',
    icon: <InventoryIcon sx={{ fontSize: 40 }} />,
    columns: ['SNO', 'OUR CODE', 'OUT', 'OUT', 'OUT', 'IN'],
    format: 'Two header rows with dates',
    example: '901, OUT: 21, IN: 295'
  },
  {
    type: 'purchase',
    title: 'Purchase Order',
    description: 'Record multiple purchase transactions',
    icon: <ShoppingCartIcon sx={{ fontSize: 40 }} />,
    columns: ['Artis Code', 'Date', 'Amount (Kgs)', 'Notes'],
    format: 'Date format: MM/DD/YY',
    example: '901, 03/15/24, 500kg'
  }
];

const BulkUploadDialog: React.FC<BulkUploadDialogProps> = ({ open, onClose, onSuccess }) => {
  const { isDarkMode } = useTheme();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);

  const handleDownloadTemplate = (template: TemplateType) => {
    const templateUrl = template === 'inventory' 
      ? '/templates/inventory-template.xlsx'
      : '/templates/purchase-template.xlsx';
    
    const link = document.createElement('a');
    link.href = templateUrl;
    link.download = template === 'inventory' 
      ? 'inventory-template.xlsx'
      : 'purchase-template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, template: TemplateType) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = template === 'inventory' 
        ? '/inventory/bulk-upload'
        : '/inventory/purchase-order';

      console.log('Attempting upload to endpoint:', endpoint);
      console.log('Template type:', template);
      console.log('File:', file.name);

      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Upload response:', response.data);

      if (response.data.processed?.length > 0) {
        onSuccess();
        onClose();
      } else if (response.data.skipped?.length > 0) {
        const skippedDetails = response.data.skipped
          .map((skip: any) => `${skip.artisCode}: ${skip.reason}`)
          .join('\n');
        alert(`No records were processed.\nSkipped entries:\n${skippedDetails}`);
      } else {
        alert('No records were processed. Please check the file format and try again.');
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      alert(`Failed to process file: ${errorMessage}`);
    }
  };

  const handleDownloadInventoryReport = async () => {
    try {
      console.log('Starting inventory report download...');
      
      const response = await api.get('/inventory/report');
      const { artisCodes, supplierCodes, currentStocks } = response.data;
      
      // Create workbook with data arranged in rows instead of columns
      const wb = XLSX.utils.book_new();
      
      // Combine the data into rows
      const rows = artisCodes.map((artisCode: string, index: number) => [
        artisCode,
        supplierCodes[index] || '',
        currentStocks[index] || 0
      ]);

      // Add headers and data
      const wsData = [
        ['Artis Code', 'Supplier Code', 'Current Stock'],
        ...rows
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Set column widths
      ws['!cols'] = [
        { width: 15 },  // Artis Code
        { width: 15 },  // Supplier Code
        { width: 15 }   // Current Stock
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Inventory Report');
      XLSX.writeFile(wb, 'inventory-report.xlsx');
      console.log('Excel file created successfully');
    } catch (error: any) {
      console.error('Error downloading inventory report:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL
      });
      alert('Failed to download inventory report. Please check console for details.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Bulk Upload</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleDownloadInventoryReport}
            sx={{ mb: 2 }}
          >
            Download Current Inventory Report
          </Button>
        </Box>
        <Grid container spacing={2}>
          {templates.map((template) => (
            <Grid item xs={12} key={template.type}>
              <Card variant="outlined">
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    {template.icon}
                    <Box sx={{ ml: 2 }}>
                      <Typography variant="h6" gutterBottom>
                        {template.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {template.description}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Format: {template.format} • Example: {template.example}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<FileDownloadIcon />}
                      onClick={() => handleDownloadTemplate(template.type)}
                    >
                      Template
                    </Button>
                    <input
                      accept=".xlsx,.xls"
                      style={{ display: 'none' }}
                      id={`${template.type}-file`}
                      type="file"
                      onChange={(e) => handleFileUpload(e, template.type)}
                    />
                    <label htmlFor={`${template.type}-file`}>
                      <Button
                        size="small"
                        variant="contained"
                        component="span"
                        startIcon={<UploadFileIcon />}
                      >
                        Upload
                      </Button>
                    </label>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkUploadDialog; 