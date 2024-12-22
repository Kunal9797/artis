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

  const [groupByAltCode, setGroupByAltCode] = useState(false);

  // Add state for catalog filter mode
  const [catalogFilterMode, setCatalogFilterMode] = useState<'AND' | 'OR'>('OR');

  useEffect(() => {
    let filtered = [...products];
    
    // Apply search filter first
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        (p.artisCode?.toLowerCase() || '').includes(query) ||
        (p.name?.toLowerCase() || '').includes(query) ||
        (p.supplierCode?.toLowerCase() || '').includes(query) ||
        (p.supplier?.toLowerCase() || '').includes(query) ||
        (p.category?.toLowerCase() || '').includes(query)
      );
    }

    // Group by supplier code if enabled
    if (groupByAltCode) {
      const preGrouped = new Map();
      
      filtered.forEach(p => {
        const normalizedSupplierCode = p.supplierCode ? normalizeSupplierCode(p.supplierCode) : '';
        const groupKey = `${normalizedSupplierCode}_${p.supplier || ''}`;
        
        if (normalizedSupplierCode && p.supplier) {
          if (!preGrouped.has(groupKey)) {
            preGrouped.set(groupKey, {
              ...p,
              artisCode: p.artisCode,
              supplierCode: p.supplierCode,
              name: p.name || null,
              category: p.category || null,
              gsm: p.gsm || null,
              _catalogSet: new Set(p.catalogs || [])
            });
          } else {
            const existing = preGrouped.get(groupKey);
            if (existing.supplier === p.supplier) {
              existing.artisCode = `${existing.artisCode} / ${p.artisCode}`;
              existing.name = existing.name || p.name;
              existing.category = existing.category || p.category;
              existing.gsm = existing.gsm || p.gsm;
              
              if (p.catalogs) {
                p.catalogs.forEach(catalog => existing._catalogSet.add(catalog));
              }
            }
          }
        } else {
          preGrouped.set(p.artisCode, {
            ...p,
            _catalogSet: new Set(p.catalogs || [])
          });
        }
      });

      filtered = Array.from(preGrouped.values()).map(product => {
        const { _catalogSet, ...rest } = product;
        return {
          ...rest,
          catalogs: Array.from(_catalogSet)
        };
      });
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
      const aCode = parseInt(a.artisCode.replace(/\D/g, '')) || 0;
      const bCode = parseInt(b.artisCode.replace(/\D/g, '')) || 0;
      return sortDirection === 'asc' ? aCode - bCode : bCode - aCode;
    });
    
    setFilteredProducts(filtered);
  }, [products, selectedCatalogs, selectedSuppliers, selectedCategories, sortDirection, groupByAltCode, searchQuery, catalogFilterMode]);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
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
        await api.delete(`/products/${id}`);
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const handleSortToggle = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
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
          justifyContent="space-between" 
          alignItems={{ xs: 'stretch', sm: 'center' }} 
          mb={2}
          spacing={2}
        >
          <Typography variant="h5">All Products</Typography>
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2}
            width={{ xs: '100%', sm: 'auto' }}
          >
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => setImportOpen(true)}
              fullWidth={isMobile}
            >
              Bulk Import
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setFormOpen(true)}
              fullWidth={isMobile}
            >
              Add Product
            </Button>
          </Stack>
        </Stack>

        <ProductFilters
          catalogs={uniqueCatalogs}
          suppliers={uniqueSuppliers}
          categories={uniqueCategories}
          selectedCatalogs={selectedCatalogs}
          selectedSuppliers={selectedSuppliers}
          selectedCategories={selectedCategories}
          catalogFilterMode={catalogFilterMode}
          searchQuery={searchQuery}
          groupByAltCode={groupByAltCode}
          onCatalogChange={setSelectedCatalogs}
          onSupplierChange={setSelectedSuppliers}
          onCategoryChange={setSelectedCategories}
          onCatalogFilterModeChange={setCatalogFilterMode}
          onSearchQueryChange={setSearchQuery}
          onGroupByAltCodeChange={setGroupByAltCode}
        />

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
                <TableCell 
                  sx={{ 
                    backgroundColor: '#f5f5f5 !important',
                    fontWeight: 'bold',
                    position: 'sticky',
                    top: 0,
                    zIndex: 2
                  }}
                >
                  #
                </TableCell>
                <TableCell 
                  onClick={handleSortToggle}
                  sx={{ 
                    backgroundColor: '#f5f5f5 !important',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    '& .MuiBox-root': {
                      display: 'inline-flex',
                      alignItems: 'center',
                      marginLeft: 1
                    }
                  }}
                >
                  Artis Code
                  <Box component="span" sx={{ opacity: 0.5, fontSize: '0.8rem' }}>
                    ({sortDirection === 'asc' ? '↑' : '↓'})
                  </Box>
                </TableCell>
                <TableCell sx={{ backgroundColor: '#f5f5f5 !important', fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ backgroundColor: '#f5f5f5 !important', fontWeight: 'bold' }}>Category</TableCell>
                <TableCell sx={{ backgroundColor: '#f5f5f5 !important', fontWeight: 'bold' }}>Supplier Code</TableCell>
                <TableCell sx={{ backgroundColor: '#f5f5f5 !important', fontWeight: 'bold' }}>Supplier</TableCell>
                <TableCell sx={{ backgroundColor: '#f5f5f5 !important', fontWeight: 'bold' }}>GSM</TableCell>
                <TableCell sx={{ backgroundColor: '#f5f5f5 !important', fontWeight: 'bold' }}>Catalogs</TableCell>
                <TableCell sx={{ backgroundColor: '#f5f5f5 !important', fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts.map((product, index) => (
                <TableRow 
                  key={product.id}
                  sx={{ 
                    '&:nth-of-type(odd)': { backgroundColor: '#fafafa' },
                    '&:hover': { backgroundColor: '#f5f5f5' }
                  }}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{product.artisCode}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.supplierCode}</TableCell>
                  <TableCell>{product.supplier}</TableCell>
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
    </Box>
  );
};

export default ProductCatalog; 