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
import TimelineIcon from '@mui/icons-material/Timeline';
import { useTheme } from '../../context/ThemeContext';
import * as XLSX from 'xlsx';
import { inventoryApi } from '../../services/api';

interface BulkUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type TemplateType = 'inventory' | 'purchase' | 'consumption';

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
    title: 'Initial Inventory',
    description: 'Update initial stock levels and consumption data',
    icon: <InventoryIcon sx={{ fontSize: 40 }} />,
    columns: ['SNO', 'OUR CODE', 'OUT', 'OUT', 'OUT', 'IN'],
    format: 'Two header rows with dates',
    example: '901, OUT: 21, IN: 295'
  },
  {
    type: 'consumption',
    title: 'Monthly Consumption',
    description: 'Update consumption data for multiple products',
    icon: <TimelineIcon sx={{ fontSize: 40 }} />,
    columns: ['SNO', 'DESIGN CODE', 'JAN CONS.', 'FEB CONS.', 'MAR CONS.', 'APR CONS.'],
    format: 'Two header rows with dates',
    example: '901, JAN: 34, FEB: 21'
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
    const templateUrl = {
      inventory: '/templates/inventory-template.xlsx',
      consumption: '/templates/consumption-template.xlsx',
      purchase: '/templates/purchase-template.xlsx'
    }[template];
    
    const fileName = {
      inventory: 'inventory-template.xlsx',
      consumption: 'consumption-template.xlsx',
      purchase: 'purchase-template.xlsx'
    }[template];
    
    const link = document.createElement('a');
    link.href = templateUrl;
    link.download = fileName;
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

      const response = template === 'purchase' 
        ? await inventoryApi.uploadPurchaseOrder(file)
        : await inventoryApi.uploadInventory(file); // Both inventory and consumption use same endpoint

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
      
      const response = await inventoryApi.getAllInventory();
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