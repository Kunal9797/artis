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
  'MATCH ': 'MATCH',
  'MATCH GRAPHICS': 'MATCH',
  'INFINIAA': 'INFINIAA',
  'INFINIAA DÉCOR': 'INFINIAA',
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

  useEffect(() => {
    console.log('Effect triggered with:', {
      groupByAltCode,
      totalProducts: products.length,
      selectedCatalogs,
      searchQuery
    });

    let filtered = [...products];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        (p.artisCode?.toLowerCase() || '').includes(query) ||
        (p.name?.toLowerCase() || '').includes(query) ||
        (p.supplierCode?.toLowerCase() || '').includes(query) ||
        (p.supplier?.toLowerCase() || '').includes(query) ||
        (p.category?.toLowerCase() || '').includes(query)
      );
      console.log('After search filter:', filtered.length, 'products');
    }

    // Apply catalog filter
    if (selectedCatalogs.length > 0) {
      filtered = filtered.filter(p => 
        p.catalogs?.some(catalog => selectedCatalogs.includes(catalog)) ?? false
      );
    }
    
    // Apply grouping if enabled (moved outside catalog filter)
    if (groupByAltCode) {
      console.log('Starting grouping process...');
      const groupedProducts = new Map();
      filtered.forEach(p => {
        const groupKey = p.supplierCode ? normalizeSupplierCode(p.supplierCode) : p.altCode;
        console.log('Processing:', {
          artisCode: p.artisCode,
          supplierCode: p.supplierCode,
          normalizedKey: groupKey
        });
        
        if (!groupedProducts.has(groupKey)) {
          groupedProducts.set(groupKey, {
            ...p,
            artisCode: p.artisCode,
            supplierCode: p.supplierCode
          });
          console.log('Created new group for:', groupKey);
        } else {
          const existing = groupedProducts.get(groupKey);
          existing.artisCode = `${existing.artisCode} / ${p.artisCode}`;
          if (existing.supplierCode !== p.supplierCode) {
            existing.supplierCode = `${existing.supplierCode} / ${p.supplierCode}`;
          }
          console.log('Added to existing group:', {
            groupKey,
            combinedArtisCodes: existing.artisCode
          });
        }
      });
      
      filtered = Array.from(groupedProducts.values());
      console.log('Grouping complete:', {
        totalGroups: filtered.length,
        groupKeys: Array.from(groupedProducts.keys())
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
  }, [products, selectedCatalogs, selectedSuppliers, selectedCategories, sortDirection, groupByAltCode, searchQuery]);

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
    <Box sx={{ height: '100%', p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" sx={{ color: 'text.primary' }}>
          All Products
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => setImportOpen(true)}
          >
            Bulk Import
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingProduct(null);
              setFormOpen(true);
            }}
          >
            Add Product
          </Button>
        </Stack>
      </Box>

      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by artis code, name, supplier code, supplier, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          size="small"
        />
      </Box>

      <ProductFilters
        catalogs={uniqueCatalogs}
        suppliers={uniqueSuppliers}
        categories={uniqueCategories}
        selectedCatalogs={selectedCatalogs}
        selectedSuppliers={selectedSuppliers}
        selectedCategories={selectedCategories}
        onCatalogChange={setSelectedCatalogs}
        onSupplierChange={setSelectedSuppliers}
        onCategoryChange={setSelectedCategories}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={groupByAltCode}
              onChange={(e) => setGroupByAltCode(e.target.checked)}
            />
          }
          label="Group same designs"
        />
      </Box>

      <TableContainer 
        component={Paper} 
        sx={{ 
          flexGrow: 1,
          height: 'calc(100vh - 280px)',
          overflow: 'auto',
          boxShadow: 3,
          "& .MuiTableCell-root": {
            borderColor: 'divider',
            fontSize: '0.95rem',
            padding: '16px',
            borderRight: '1px solid rgba(224, 224, 224, 1)',
            '&:last-child': {
              borderRight: 'none'
            }
          }
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ 
              backgroundColor: '#f5f5f5',
              '& .MuiTableCell-root': {
                borderBottom: '2px solid rgba(224, 224, 224, 1)'
              }
            }}>
              <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
              <TableCell 
                sx={{ 
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
                onClick={handleSortToggle}
              >
                Artis Code
                <Box component="span" sx={{ opacity: 0.5, fontSize: '0.8rem' }}>
                  ({sortDirection === 'asc' ? '↑' : '↓'})
                </Box>
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Supplier Code</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Supplier</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>GSM</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Catalogs</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
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
  );
};

export default ProductCatalog; 