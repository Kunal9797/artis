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

const ProductCatalog: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Filter states
  const [selectedCatalog, setSelectedCatalog] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Unique values for filters
  const uniqueCatalogs = Array.from(
    new Set(products.flatMap(p => p.catalogs || []))
  ).filter(Boolean) as string[];

  const uniqueSuppliers = Array.from(
    new Set(products.map(p => p.supplier))
  ).filter(Boolean) as string[];

  const uniqueCategories = Array.from(
    new Set(products.map(p => p.category))
  ).filter(Boolean) as string[];

  useEffect(() => {
    let filtered = [...products];
    
    if (selectedCatalog) {
      filtered = filtered.filter(p => p.catalogs?.includes(selectedCatalog));
    }
    
    if (selectedSupplier) {
      filtered = filtered.filter(p => p.supplier === selectedSupplier);
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    setFilteredProducts(filtered);
  }, [products, selectedCatalog, selectedSupplier, selectedCategory]);

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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
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

      <ProductFilters
        catalogs={uniqueCatalogs}
        suppliers={uniqueSuppliers}
        categories={uniqueCategories}
        selectedCatalog={selectedCatalog}
        selectedSupplier={selectedSupplier}
        selectedCategory={selectedCategory}
        onCatalogChange={setSelectedCatalog}
        onSupplierChange={setSelectedSupplier}
        onCategoryChange={setSelectedCategory}
      />

      <TableContainer 
        component={Paper} 
        sx={{ 
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
              <TableCell sx={{ fontWeight: 'bold' }}>Artis Code</TableCell>
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