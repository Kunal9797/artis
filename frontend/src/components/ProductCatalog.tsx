import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  Stack,
  FormControlLabel,
  Switch,
  TextField,
  InputAdornment,
  useMediaQuery,
  useTheme,
  Menu,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadIcon from '@mui/icons-material/Upload';
import { Product } from '../types/product';
import api from '../services/api';
import ProductForm from './ProductForm';
import BulkImportDialog from './BulkImportDialog';
import CatalogTags from './CatalogTags';
import ProductFilters from './ProductFilters';
import SearchIcon from '@mui/icons-material/Search';
import * as XLSX from 'xlsx';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { productApi } from '../services/api';
import { useSnackbar } from 'notistack';

const supplierNormalization: { [key: string]: string } = {
  'MATCH ': 'MATCH GRAPHICS',
  'MATCH GRAPHICS': 'MATCH GRAPHICS',
  'INFINIAA': 'INFINIAA DÉCOR',
  'INFINIAA DÉCOR': 'INFINIAA DÉCOR',
  'UNIK DÉCOR': 'UNIQUE DÉCOR',
  'UNIQUE DÉCOR': 'UNIQUE DÉCOR',
  'SURFACE': 'SURFACE DÉCOR',
  'SURFACE DÉCOR': 'SURFACE DÉCOR',
};

const normalizeSupplierCode = (code: string | undefined): string => {
  if (!code) return '';
  // Remove all spaces, dashes, dots and standardize
  return code.replace(/[\s\-\.]+/g, '').replace(/([A-Za-z])$/, '-$1').toUpperCase();
};

const ProductCatalog: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter states
  const [selectedCatalogs, setSelectedCatalogs] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Unique values for filters
  const uniqueCatalogs = Array.from(
    new Set(products.flatMap(p => p.catalogs || []))
  ).filter(Boolean) as string[];

  const uniqueSuppliers = Array.from(
    new Set(
      products
        .map(p => p.supplier)
        .filter(Boolean)
        .map(supplier => supplierNormalization[supplier || ''] || supplier)
    )
  ).sort() as string[];

  const uniqueCategories = Array.from(
    new Set(products.map(p => p.category))
  ).filter(Boolean) as string[];

  // Add state for catalog filter mode
  const [catalogFilterMode, setCatalogFilterMode] = useState<'AND' | 'OR'>('OR');

  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    let filtered = [...products];
    
    // Apply search filter first
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.artisCodes.some(code => code.toLowerCase().includes(query)) ||
        (p.name?.toLowerCase() || '').includes(query) ||
        (p.supplierCode?.toLowerCase() || '').includes(query) ||
        (p.supplier?.toLowerCase() || '').includes(query)
      );
    }

    // Apply catalog filter AFTER grouping
    if (selectedCatalogs.length > 0) {
      filtered = filtered.filter(p => {
        if (!p.catalogs) return false;
        
        if (catalogFilterMode === 'AND') {
          return selectedCatalogs.every(selectedCatalog => 
            p.catalogs?.includes(selectedCatalog)
          );
        } else {
          return selectedCatalogs.some(catalog => 
            p.catalogs?.includes(catalog)
          );
        }
      });
    }

    // Apply supplier filter
    if (selectedSuppliers.length > 0) {
      filtered = filtered.filter(p => {
        if (!p.supplier) return false;
        const normalizedSupplier = supplierNormalization[p.supplier] || p.supplier;
        return selectedSuppliers.includes(normalizedSupplier);
      });
    }
    
    // Apply category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(p => 
        p.category ? selectedCategories.includes(p.category) : false
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aCode = parseInt(a.artisCodes[0]?.replace(/\D/g, '') || '0');
      const bCode = parseInt(b.artisCodes[0]?.replace(/\D/g, '') || '0');
      return sortDirection === 'asc' ? aCode - bCode : bCode - aCode;
    });
    
    setFilteredProducts(filtered);
  }, [products, selectedCatalogs, selectedSuppliers, selectedCategories, sortDirection, searchQuery, catalogFilterMode]);

  const fetchProducts = async () => {
    try {
      const response = await productApi.getAllProducts();
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productApi.deleteProduct(id);
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const handleSortToggle = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleExport = (type: 'all' | 'filtered' | 'match') => {
    let dataToExport = [...products];

    // Apply filters based on type
    if (type === 'match') {
      dataToExport = dataToExport.filter(p => 
        p.supplier === 'MATCH GRAPHICS' || p.supplier === 'MATCH '
      );
    } else if (type === 'filtered') {
      // Apply all current filters
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        dataToExport = dataToExport.filter(p => 
          p.artisCodes.some(code => code.toLowerCase().includes(query)) ||
          (p.name?.toLowerCase() || '').includes(query) ||
          (p.supplierCode?.toLowerCase() || '').includes(query) ||
          (p.supplier?.toLowerCase() || '').includes(query)
        );
      }

      if (selectedSuppliers.length > 0) {
        dataToExport = dataToExport.filter(p => {
          if (!p.supplier) return false;
          const normalizedSupplier = supplierNormalization[p.supplier] || p.supplier;
          return selectedSuppliers.includes(normalizedSupplier);
        });
      }

      if (selectedCategories.length > 0) {
        dataToExport = dataToExport.filter(p => 
          p.category ? selectedCategories.includes(p.category) : false
        );
      }

      if (selectedCatalogs.length > 0) {
        dataToExport = dataToExport.filter(p => {
          if (!p.catalogs) return false;
          if (catalogFilterMode === 'AND') {
            return selectedCatalogs.every(selectedCatalog => 
              p.catalogs?.includes(selectedCatalog)
            );
          } else {
            return selectedCatalogs.some(catalog => 
              p.catalogs?.includes(catalog)
            );
          }
        });
      }
    }

    // Format and export
    const excelData = dataToExport.map((product, index) => ({
      'SNO': index + 1,
      'OUR CODE': product.artisCodes.join(' / '),
      'NAME': product.name || '',
      'CATEGORY': product.category || '',
      'DESIGN CODE': product.supplierCode || '',
      'SUPPLIER': product.supplier || '',
      'GSM': product.gsm || '',
      'CATALOGS': (product.catalogs || []).join(', ')
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    ws['!cols'] = [
      { width: 5 },   // SNO
      { width: 15 },  // OUR CODE
      { width: 30 },  // NAME
      { width: 15 },  // CATEGORY
      { width: 15 },  // DESIGN CODE
      { width: 15 },  // SUPPLIER
      { width: 8 },   // GSM
      { width: 20 },  // CATALOGS
    ];

    const fileName = type === 'match' ? 'match-graphics-designs.xlsx' : 
                    type === 'filtered' ? 'filtered-designs.xlsx' : 
                    'all-designs.xlsx';

    XLSX.utils.book_append_sheet(wb, ws, 'Designs');
    XLSX.writeFile(wb, fileName);
    setExportAnchorEl(null);
  };

  const handleDeleteAll = async () => {
    try {
      setIsDeleting(true);
      await productApi.deleteAllProducts();
      fetchProducts();
      setDeleteDialogOpen(false);
      enqueueSnackbar('All products deleted successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error deleting products:', error);
      enqueueSnackbar('Failed to delete products', { variant: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      p: 2 
    }}>
      <Box>
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          spacing={2}
          mb={2}
          alignItems="center"
        >
          <ProductFilters
            catalogs={uniqueCatalogs}
            suppliers={uniqueSuppliers}
            categories={uniqueCategories}
            selectedCatalogs={selectedCatalogs}
            selectedSuppliers={selectedSuppliers}
            selectedCategories={selectedCategories}
            catalogFilterMode={catalogFilterMode}
            searchQuery={searchQuery}
            onCatalogChange={setSelectedCatalogs}
            onSupplierChange={setSelectedSuppliers}
            onCategoryChange={setSelectedCategories}
            onCatalogFilterModeChange={setCatalogFilterMode}
            onSearchQueryChange={setSearchQuery}
          />
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setFormOpen(true)}
              sx={{ minWidth: 'fit-content' }}
            >
              Add Product
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => setImportOpen(true)}
              sx={{ minWidth: 'fit-content' }}
            >
              Bulk Import
            </Button>
          </Stack>
        </Stack>

        <TableContainer 
          component={Paper} 
          sx={{ 
            maxHeight: { xs: 'calc(100vh - 400px)', md: 'calc(100vh - 250px)' },
            overflow: 'auto',
            '& .MuiTableCell-root': {
              borderRight: '1px solid rgba(0, 0, 0, 0.15)',
              padding: { xs: '12px 8px', md: '16px' },
              whiteSpace: 'nowrap',
              minWidth: {
                xs: '100px',
                md: 'auto'
              },
              '&:last-child': {
                borderRight: 'none'
              }
            },
            '& .MuiTable-root': {
              minWidth: '800px' // Ensures horizontal scroll on mobile
            }
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell onClick={handleSortToggle} sx={{ cursor: 'pointer' }}>
                  Artis Code
                  <Box component="span" sx={{ opacity: 0.5, fontSize: '0.8rem', ml: 1 }}>
                    ({sortDirection === 'asc' ? '↑' : '↓'})
                  </Box>
                </TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Supplier Info</TableCell>
                <TableCell>GSM</TableCell>
                <TableCell>Catalogs</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts.map((product, index) => (
                <TableRow key={product.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{product.artisCodes.join(' / ')}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>
                    <Typography variant="body1">{product.supplierCode}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {product.supplier}
                    </Typography>
                  </TableCell>
                  <TableCell>{product.gsm}</TableCell>
                  <TableCell>
                    <CatalogTags catalogs={product.catalogs} />
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      onClick={() => handleEdit(product)}
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      onClick={() => handleDelete(product.id)}
                      size="small"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <ProductForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          product={editingProduct}
          onSubmit={fetchProducts}
        />

        <BulkImportDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onSuccess={fetchProducts}
        />
      </Box>

      <Menu
        anchorEl={exportAnchorEl}
        open={Boolean(exportAnchorEl)}
        onClose={() => setExportAnchorEl(null)}
      >
        <MenuItem onClick={() => handleExport('all')}>
          Export All Designs
        </MenuItem>
        <MenuItem onClick={() => handleExport('filtered')}>
          Export with Current Filters
        </MenuItem>
        <MenuItem onClick={() => handleExport('match')}>
          Export Match Graphics Only
        </MenuItem>
      </Menu>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
        <Button 
          variant="contained" 
          color="error" 
          onClick={() => setDeleteDialogOpen(true)}
          sx={{ mb: 2 }}
        >
          Delete All Products
        </Button>

        <Dialog open={deleteDialogOpen} onClose={() => !isDeleting && setDeleteDialogOpen(false)}>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogContent>
            Are you sure you want to delete all products? This action cannot be undone.
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setDeleteDialogOpen(false)} 
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteAll} 
              color="error" 
              variant="contained"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete All'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default ProductCatalog; 