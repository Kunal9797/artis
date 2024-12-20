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
  Tabs,
  Tab,
  Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Product, InventoryType } from '../types';
import api from '../services/api';
import ProductForm from './ProductForm';

const ProductCatalog: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();

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

  const renderProductTable = (inventoryType: InventoryType) => {
    const filteredProducts = products.filter(product => product.inventoryType === inventoryType);
    
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Artis Code</TableCell>
              <TableCell>Name</TableCell>
              {inventoryType === InventoryType.DESIGN_PAPER_SHEET ? (
                <>
                  <TableCell>Category</TableCell>
                  <TableCell>Supplier Code</TableCell>
                  <TableCell>Supplier</TableCell>
                </>
              ) : (
                <>
                  <TableCell>Category</TableCell>
                  <TableCell>Texture</TableCell>
                  <TableCell>Thickness</TableCell>
                  <TableCell>Design Paper</TableCell>
                </>
              )}
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell>{product.artisCode}</TableCell>
                <TableCell>{product.name}</TableCell>
                {inventoryType === InventoryType.DESIGN_PAPER_SHEET ? (
                  <>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{product.supplierCode}</TableCell>
                    <TableCell>{product.supplier}</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{product.texture}</TableCell>
                    <TableCell>{product.thickness}</TableCell>
                    <TableCell>{product.designPaper?.artisCode}</TableCell>
                  </>
                )}
                <TableCell>
                  <IconButton onClick={() => handleEdit(product)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(product.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Product Catalog
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingProduct(undefined);
            setFormOpen(true);
          }}
        >
          Add Product
        </Button>
      </Box>
      
      <Tabs 
        value={selectedTab}
        onChange={(_, newValue) => setSelectedTab(newValue)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Design Papers" />
        <Tab label="Laminate Sheets" />
      </Tabs>

      {selectedTab === 0 && renderProductTable(InventoryType.DESIGN_PAPER_SHEET)}
      {selectedTab === 1 && renderProductTable(InventoryType.LAMINATE_SHEET)}

      <ProductForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        product={editingProduct}
        onSubmit={fetchProducts}
      />
    </Box>
  );
};

export default ProductCatalog; 