import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Tabs,
  Tab,
  ButtonGroup,
  Tooltip,
  Stack,
} from '@mui/material';
import { getSKUs } from '../services/api';
import { SKU, InventoryType } from '../types/index';
import InventoryMovementForm from './InventoryMovementForm';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import * as XLSX from 'xlsx';
import SKUForm from './SKUForm';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const SKUManagement: React.FC = () => {
  const [skus, setSkus] = useState<SKU[]>([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedSKU, setSelectedSKU] = useState<{id: string, type: string} | null>(null);
  const [movementFormOpen, setMovementFormOpen] = useState(false);
  const [skuFormOpen, setSkuFormOpen] = useState(false);
  const [editingSKU, setEditingSKU] = useState<SKU | undefined>(undefined);

  const fetchSKUs = async () => {
    try {
      const data = await getSKUs();
      setSkus(data);
    } catch (error: any) {
      console.error('Error fetching SKUs:', error);
    }
  };

  useEffect(() => {
    fetchSKUs();
  }, []);

  const renderSKUTable = (inventoryType: InventoryType) => {
    const filteredSKUs = skus.filter(sku => sku.inventoryType === inventoryType);
    
    return (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Quantity ({inventoryType === InventoryType.DESIGN_PAPER_ROLL ? 'kg' : 'units'})</TableCell>
              <TableCell>Min. Stock</TableCell>
              <TableCell>Reorder Point</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSKUs.map((sku) => (
              <TableRow 
                key={sku.id}
                sx={{ 
                  backgroundColor: 
                    sku.quantity <= (sku.minimumStock || 0) ? '#ffebee' :
                    sku.quantity <= (sku.reorderPoint || 0) ? '#fff3e0' : 'inherit'
                }}
              >
                <TableCell>{sku.code}</TableCell>
                <TableCell>{sku.name}</TableCell>
                <TableCell>{sku.description}</TableCell>
                <TableCell>{sku.category}</TableCell>
                <TableCell>{sku.quantity}</TableCell>
                <TableCell>{sku.minimumStock || '-'}</TableCell>
                <TableCell>{sku.reorderPoint || '-'}</TableCell>
                <TableCell>
                  <Button 
                    color="primary" 
                    size="small"
                    onClick={() => {
                      setSelectedSKU({ id: sku.id, type: sku.inventoryType });
                      setMovementFormOpen(true);
                    }}
                  >
                    Record Movement
                  </Button>
                  <Button 
                    color="primary" 
                    size="small"
                    onClick={() => {
                      setEditingSKU(sku);
                      setSkuFormOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button color="error" size="small">Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const downloadTemplate = () => {
    const template = [
      {
        code: 'DPR001',
        name: 'Example Design Paper Roll',
        description: 'Template example',
        category: 'Standard',
        inventoryType: 'DESIGN_PAPER_ROLL',
        measurementUnit: 'WEIGHT',
        quantity: 0,
        minimumStock: 10,
        reorderPoint: 20
      }
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'sku_template.xlsx');
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Inventory Management
      </Typography>
      
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <ButtonGroup variant="contained">
          <Tooltip title="Add single SKU">
            <Button 
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingSKU(undefined);
                setSkuFormOpen(true);
              }}
            >
              Add SKU
            </Button>
          </Tooltip>
          <Tooltip title="Upload SKUs from Excel">
            <Button
              startIcon={<UploadFileIcon />}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.xlsx,.xls';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    // Handle file upload
                    const formData = new FormData();
                    formData.append('file', file);
                    api.post('/skus/bulk', formData, {
                      headers: {
                        'Content-Type': 'multipart/form-data',
                      }
                    }).then(() => {
                      // Refresh SKUs
                      fetchSKUs();
                    }).catch(error => {
                      console.error('Error uploading SKUs:', error);
                    });
                  }
                };
                input.click();
              }}
            >
              Bulk Upload
            </Button>
          </Tooltip>
          <Tooltip title="Download Excel template">
            <Button
              startIcon={<DownloadIcon />}
              onClick={downloadTemplate}
            >
              Template
            </Button>
          </Tooltip>
        </ButtonGroup>
      </Stack>
      
      <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
        <Tab label="Design Paper Rolls" />
        <Tab label="Design Paper Sheets" />
        <Tab label="Laminate Sheets" />
      </Tabs>

      <TabPanel value={selectedTab} index={0}>
        {renderSKUTable(InventoryType.DESIGN_PAPER_ROLL)}
      </TabPanel>
      <TabPanel value={selectedTab} index={1}>
        {renderSKUTable(InventoryType.DESIGN_PAPER_SHEET)}
      </TabPanel>
      <TabPanel value={selectedTab} index={2}>
        {renderSKUTable(InventoryType.LAMINATE_SHEET)}
      </TabPanel>

      {selectedSKU && (
        <InventoryMovementForm
          open={movementFormOpen}
          onClose={() => {
            setMovementFormOpen(false);
            setSelectedSKU(null);
          }}
          skuId={selectedSKU.id}
          skuType={selectedSKU.type}
          onSubmit={() => {
            const fetchSKUs = async () => {
              try {
                const data = await getSKUs();
                setSkus(data);
              } catch (error) {
                console.error('Error fetching SKUs:', error);
              }
            };
            fetchSKUs();
            setMovementFormOpen(false);
            setSelectedSKU(null);
          }}
        />
      )}

      <SKUForm
        open={skuFormOpen}
        onClose={() => setSkuFormOpen(false)}
        sku={editingSKU}
        onSubmit={() => {
          fetchSKUs();
          setSkuFormOpen(false);
          setEditingSKU(undefined);
        }}
      />
    </Box>
  );
};

export default SKUManagement; 