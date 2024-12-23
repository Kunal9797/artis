import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import UploadIcon from '@mui/icons-material/Upload';
import { getAllInventory, api } from '../../services/api';
import TransactionDialog from './TransactionDialog';
import HistoryDialog from './HistoryDialog';
import BulkUploadDialog from './BulkUploadDialog';

interface InventoryItem {
  id: string;
  productId: string;
  currentStock: number;
  product: {
    artisCode: string;
    name: string;
    supplier?: string;
    category?: string;
    supplierCode?: string;
    relatedArtisCode?: string;
  };
}

interface ProductWithSet extends Omit<InventoryItem['product'], 'relatedArtisCode'> {
  _artisCodeSet?: Set<string>;
}

interface GroupedInventoryItem extends Omit<InventoryItem, 'product'> {
  product: ProductWithSet;
}

interface CatalogProduct {
  artisCode: string;
  supplierCode?: string;
  supplier?: string;
}

const normalizeSupplierCode = (supplierCode: string): string => {
  return supplierCode.replace(/\s+/g, '').toUpperCase();
};

const groupInventoryBySupplierCode = async (inventory: InventoryItem[]): Promise<InventoryItem[]> => {
  const preGrouped = new Map();
  
  try {
    const response = await api.get('/products');
    const catalogProducts: CatalogProduct[] = response.data;
    
    // Create a map of supplier codes to artis codes
    const supplierCodeMap = new Map<string, Set<string>>();
    catalogProducts.forEach((product: CatalogProduct) => {
      if (product.supplierCode && product.supplier) {
        const key = `${normalizeSupplierCode(product.supplierCode)}_${product.supplier}`;
        if (!supplierCodeMap.has(key)) {
          supplierCodeMap.set(key, new Set([product.artisCode]));
        } else {
          supplierCodeMap.get(key)?.add(product.artisCode);
        }
      }
    });

    // Now process inventory items
    inventory.forEach(item => {
      const normalizedSupplierCode = item.product.supplierCode ? normalizeSupplierCode(item.product.supplierCode) : '';
      const groupKey = `${normalizedSupplierCode}_${item.product.supplier || ''}`;
      
      if (normalizedSupplierCode && item.product.supplier && supplierCodeMap.has(groupKey)) {
        if (!preGrouped.has(groupKey)) {
          preGrouped.set(groupKey, {
            ...item,
            product: {
              ...item.product,
              artisCode: Array.from(supplierCodeMap.get(groupKey) || [])
                .sort((a, b) => Number(a) - Number(b))
                .join(' / ')
            }
          });
        } else {
          const existing = preGrouped.get(groupKey);
          existing.currentStock += Number(item.currentStock);
        }
      } else {
        preGrouped.set(item.id, item);
      }
    });

    return Array.from(preGrouped.values());
  } catch (error) {
    console.error('Error fetching products:', error);
    return inventory;
  }
};

const InventoryList: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getAllInventory();
      const inventoryData = Array.isArray(response?.data) ? response.data : [];
      const groupedData = await groupInventoryBySupplierCode(inventoryData);
      setInventory(groupedData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setError('Failed to fetch inventory');
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const sortedInventory = useMemo(() => {
    if (!Array.isArray(inventory)) return [];
    return [...inventory].sort((a, b) => {
      return sortOrder === 'asc' 
        ? a.currentStock - b.currentStock 
        : b.currentStock - a.currentStock;
    });
  }, [inventory, sortOrder]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Inventory Management
        </Typography>
        <Box>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchInventory} sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setBulkUploadOpen(true)}
            sx={{ mr: 1 }}
          >
            Bulk Upload
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setTransactionOpen(true)}
          >
            Add Transaction
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={async () => {
              if (window.confirm('Are you sure you want to clear all inventory?')) {
                try {
                  await api.delete('/inventory');
                  fetchInventory();
                } catch (error) {
                  setError('Failed to clear inventory');
                }
              }
            }}
            sx={{ mr: 1 }}
          >
            Clear All
          </Button>
        </Box>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Design Code</TableCell>
                <TableCell>Supplier Code</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell>Category</TableCell>
                <TableCell 
                  align="right" 
                  sx={{ 
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    backgroundColor: 'primary.main',
                    color: 'white'
                  }}
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                >
                  Current Stock {sortOrder === 'asc' ? '↑' : '↓'}
                </TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedInventory.map((item) => (
                <TableRow 
                  key={item.id}
                  sx={{ '&:hover': { backgroundColor: 'action.hover' } }}
                >
                  <TableCell>{item.product.artisCode}</TableCell>
                  <TableCell>{item.product.supplierCode || '-'}</TableCell>
                  <TableCell>{item.product.supplier || '-'}</TableCell>
                  <TableCell>{item.product.category || '-'}</TableCell>
                  <TableCell 
                    align="right"
                    sx={{
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      color: 'primary.main',
                      '& .unit': {
                        fontSize: '0.8rem',
                        color: 'text.secondary',
                        marginLeft: '4px'
                      }
                    }}
                  >
                    {item.currentStock}<span className="unit">kgs</span>
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      onClick={() => {
                        setSelectedProduct(item.productId);
                        setHistoryOpen(true);
                      }}
                    >
                      View History
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <TransactionDialog
        open={transactionOpen}
        onClose={() => setTransactionOpen(false)}
        productId={selectedProduct}
        onSuccess={fetchInventory}
      />

      <HistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        productId={selectedProduct!}
      />

      <BulkUploadDialog
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onSuccess={fetchInventory}
      />
    </Box>
  );
};

export default InventoryList; 