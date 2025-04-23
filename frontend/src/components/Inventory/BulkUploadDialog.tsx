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
  Alert,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InventoryIcon from '@mui/icons-material/Inventory';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import TimelineIcon from '@mui/icons-material/Timeline';
import { useTheme } from '../../context/ThemeContext';
import * as XLSX from 'xlsx';
import { inventoryApi } from '../../services/api';
import { useSnackbar } from 'notistack';

interface BulkUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type TemplateType = 'inventory' | 'purchase' | 'consumption' | 'correction';

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
  },
  {
    type: 'correction',
    title: 'Stock Corrections',
    description: 'Apply bulk corrections to inventory levels',
    icon: <InventoryIcon sx={{ fontSize: 40, color: 'warning.main' }} />,
    columns: ['Artis Code', 'Date', 'Correction Amount (+ or -)', 'Reason'],
    format: 'Date format: MM/DD/YY',
    example: '901, 03/31/24, -5.5, "March Closing Reconciliation"'
  }
];

const BulkUploadDialog: React.FC<BulkUploadDialogProps> = ({ open, onClose, onSuccess }) => {
  const { isDarkMode } = useTheme();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const handleDownloadTemplate = (template: TemplateType) => {
    const templateUrl = {
      inventory: '/templates/inventory-template.xlsx',
      consumption: '/templates/consumption-template.xlsx',
      purchase: '/templates/purchase-template.xlsx',
      correction: '/templates/correction-template.xlsx'
    }[template];
    
    const fileName = {
      inventory: 'inventory-template.xlsx',
      consumption: 'consumption-template.xlsx',
      purchase: 'purchase-template.xlsx',
      correction: 'correction-template.xlsx'
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

      let response;
      if (template === 'purchase') {
        response = await inventoryApi.uploadPurchaseOrder(file);
      } else if (template === 'correction') {
        response = await inventoryApi.uploadCorrections(file);
      } else {
        // Both inventory and consumption use same endpoint
        response = await inventoryApi.uploadInventory(file);
      }

      if (response.data.processed?.length > 0) {
        const processedCount = response.data.processed.length;
        const skippedCount = response.data.skipped?.length || 0;
        const totalCount = processedCount + skippedCount;
        
        let notificationMessage = `Upload complete: ${processedCount} of ${totalCount} products processed successfully`;
        
        // Create content for notification
        const content = (
          <Box>
            <Typography variant="body2">{notificationMessage}</Typography>
            {skippedCount > 0 && (
              <Box sx={{ mt: 1, maxHeight: '200px', overflowY: 'auto' }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {skippedCount} items failed:
                </Typography>
                {response.data.skipped.map((skip: any, index: number) => (
                  <Typography key={index} variant="caption" display="block">
                    • {skip.artisCode}: {skip.reason}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        );
        
        enqueueSnackbar(content, { 
          variant: skippedCount > 0 ? 'info' : 'success',
          autoHideDuration: skippedCount > 0 ? 10000 : 6000,
        });
        
        onSuccess();
        onClose();
      } else if (response.data.skipped?.length > 0) {
        const content = (
          <Box>
            <Typography variant="body2">No records were processed.</Typography>
            <Box sx={{ mt: 1, maxHeight: '200px', overflowY: 'auto' }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {response.data.skipped.length} items failed:
              </Typography>
              {response.data.skipped.map((skip: any, index: number) => (
                <Typography key={index} variant="caption" display="block">
                  • {skip.artisCode}: {skip.reason}
                </Typography>
              ))}
            </Box>
          </Box>
        );
        
        enqueueSnackbar(content, { 
          variant: 'error',
          autoHideDuration: 10000,
        });
      } else {
        enqueueSnackbar('No records were processed. Please check the file format and try again.', { 
          variant: 'error' 
        });
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      
      enqueueSnackbar(`Failed to process file: ${errorMessage}`, { 
        variant: 'error' 
      });
    }
  };

  const handleDownloadInventoryReport = async () => {
    try {
      console.log('Starting inventory report download...');
      
      const response = await inventoryApi.getAllInventory();
      const inventoryData = response.data;
      
      if (!Array.isArray(inventoryData)) {
        throw new Error('Invalid inventory data format received from server');
      }
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Prepare data for the report
      const rows = [
        // Header row
        ['Artis Code(s)', 'Supplier', 'Supplier Code', 'Category', 'Current Stock (kgs)', 'Min Stock Level', 'Avg. Consumption']
      ];
      
      // Add data rows
      inventoryData.forEach(item => {
        // Handle multiple Artis codes by joining them with commas
        const artisCodesStr = Array.isArray(item.artisCodes) ? item.artisCodes.join(', ') : item.artisCodes || '';
        
        rows.push([
          artisCodesStr,
          item.supplier || '',
          item.supplierCode || '',
          item.category || '',
          item.currentStock || 0,
          item.minStockLevel || 0,
          item.avgConsumption || 0
        ]);
      });
      
      // Create worksheet from the rows
      const ws = XLSX.utils.aoa_to_sheet(rows);
      
      // Set column widths for better readability
      const colWidths = [
        { wch: 20 }, // Artis Code(s)
        { wch: 20 }, // Supplier
        { wch: 15 }, // Supplier Code
        { wch: 15 }, // Category
        { wch: 15 }, // Current Stock
        { wch: 15 }, // Min Stock Level
        { wch: 15 }  // Avg. Consumption
      ];
      
      ws['!cols'] = colWidths;
      
      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Inventory Report');
      
      // Generate and download the file
      XLSX.writeFile(wb, 'Artis_Inventory_Report.xlsx');
      
      enqueueSnackbar('Inventory report downloaded successfully', { variant: 'success' });
    } catch (error: any) {
      console.error('Error downloading inventory report:', error);
      enqueueSnackbar(`Failed to download inventory report: ${error.message || 'Unknown error'}`, { 
        variant: 'error' 
      });
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