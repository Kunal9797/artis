import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Stack,
  Pagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useMediaQuery,
  useTheme,
  Fab,
  Zoom,
  Menu,
  Tooltip,
  Badge,
  Chip,
  Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import FilterListIcon from '@mui/icons-material/FilterList';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Product } from '../types/product';
import { productApi } from '../services/api';
import ProductCardView from './ProductCardView';
import ProductTableView from './ProductTableView';
import ProductFiltersV2 from './ProductFiltersV2';
import ProductForm from './ProductForm';
import BulkImportDialog from './BulkImportDialog';
import ProductQuickView from './ProductQuickView';
import * as XLSX from 'xlsx';
import { useSnackbar } from 'notistack';

type ViewMode = 'card' | 'table';

const ProductCatalogV2: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const { enqueueSnackbar } = useSnackbar();

  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(isMobile ? 'card' : 'table');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(isMobile ? 50 : 100);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatalogs, setSelectedCatalogs] = useState<string[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [catalogFilterMode, setCatalogFilterMode] = useState<'AND' | 'OR'>('OR');
  const [filtersOpen, setFiltersOpen] = useState(!isMobile);
  
  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);

  // Supplier normalization
  const supplierNormalization = useMemo<{ [key: string]: string }>(() => ({
    'MATCH ': 'MATCH GRAPHICS',
    'MATCH GRAPHICS': 'MATCH GRAPHICS',
    'INFINIAA': 'INFINIAA DÉCOR',
    'INFINIAA DÉCOR': 'INFINIAA DÉCOR',
    'UNIK DÉCOR': 'UNIQUE DÉCOR',
    'UNIQUE DÉCOR': 'UNIQUE DÉCOR',
    'SURFACE': 'SURFACE DÉCOR',
    'SURFACE DÉCOR': 'SURFACE DÉCOR',
  }), []);

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productApi.getAllProducts();
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      enqueueSnackbar('Failed to load products', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Auto-switch to card view on mobile
  useEffect(() => {
    if (isMobile && viewMode === 'table') {
      setViewMode('card');
    }
  }, [isMobile]);

  // Filter logic
  const filteredProducts = useMemo(() => {
    let filtered = [...products];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.artisCodes.some(code => code.toLowerCase().includes(query)) ||
        (p.name?.toLowerCase() || '').includes(query) ||
        (p.supplierCode?.toLowerCase() || '').includes(query) ||
        (p.supplier?.toLowerCase() || '').includes(query)
      );
    }

    // Catalog filter
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

    // Supplier filter
    if (selectedSuppliers.length > 0) {
      filtered = filtered.filter(p => {
        if (!p.supplier) return false;
        const normalizedSupplier = supplierNormalization[p.supplier] || p.supplier;
        return selectedSuppliers.includes(normalizedSupplier);
      });
    }
    
    // Category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(p => 
        p.category ? selectedCategories.includes(p.category) : false
      );
    }

    return filtered;
  }, [products, searchQuery, selectedCatalogs, selectedSuppliers, selectedCategories, catalogFilterMode]);

  // Pagination
  const paginatedProducts = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, page, itemsPerPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // Unique values for filters
  const uniqueCatalogs = useMemo(() => 
    Array.from(new Set(products.flatMap(p => p.catalogs || []))).filter(Boolean) as string[],
    [products]
  );

  const uniqueSuppliers = useMemo(() => 
    Array.from(
      new Set(
        products
          .map(p => p.supplier)
          .filter(Boolean)
          .map(supplier => supplierNormalization[supplier || ''] || supplier)
      )
    ).sort() as string[],
    [products, supplierNormalization]
  );

  const uniqueCategories = useMemo(() => 
    Array.from(new Set(products.map(p => p.category))).filter(Boolean) as string[],
    [products]
  );

  // Handlers
  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productApi.deleteProduct(id, { force: false });
        fetchProducts();
        enqueueSnackbar('Product deleted successfully', { variant: 'success' });
      } catch (error: any) {
        const message = error.response?.data?.message || 'Failed to delete product';
        enqueueSnackbar(message, { variant: 'error' });
      }
    }
  };

  const handleQuickView = (product: Product) => {
    setQuickViewProduct(product);
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    
    if (window.confirm(`Delete ${selectedProducts.length} selected products?`)) {
      try {
        await Promise.all(selectedProducts.map(id => productApi.deleteProduct(id, { force: false })));
        setSelectedProducts([]);
        fetchProducts();
        enqueueSnackbar(`${selectedProducts.length} products deleted`, { variant: 'success' });
      } catch (error) {
        enqueueSnackbar('Failed to delete some products', { variant: 'error' });
      }
    }
  };

  const handleExport = (type: 'all' | 'filtered' | 'selected') => {
    let dataToExport: Product[] = [];

    switch (type) {
      case 'all':
        dataToExport = products;
        break;
      case 'filtered':
        dataToExport = filteredProducts;
        break;
      case 'selected':
        dataToExport = products.filter(p => selectedProducts.includes(p.id));
        break;
    }

    const excelData = dataToExport.map((product, index) => ({
      'S.No': index + 1,
      'Artis Codes': product.artisCodes.join(', '),
      'Product Name': product.name || '',
      'Category': product.category || '',
      'Supplier Code': product.supplierCode || '',
      'Supplier': product.supplier || '',
      'Catalogs': (product.catalogs || []).join(', ')
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    ws['!cols'] = [
      { width: 5 },   // S.No
      { width: 20 },  // Artis Codes
      { width: 30 },  // Product Name
      { width: 15 },  // Category
      { width: 15 },  // Supplier Code
      { width: 20 },  // Supplier
      { width: 20 },  // Catalogs
    ];

    const fileName = `products-${type}-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, fileName);
    setExportAnchorEl(null);
  };

  const activeFilterCount = 
    selectedCatalogs.length + 
    selectedSuppliers.length + 
    selectedCategories.length + 
    (searchQuery ? 1 : 0);

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold">
            Product Catalog
            <Chip 
              label={`${filteredProducts.length} products`}
              size="small"
              sx={{ ml: 2 }}
            />
          </Typography>
          
          <Stack direction="row" spacing={1}>
            {/* Filter toggle for mobile */}
            {isMobile && (
              <Tooltip title="Toggle filters">
                <IconButton onClick={() => setFiltersOpen(!filtersOpen)}>
                  <Badge badgeContent={activeFilterCount} color="primary">
                    <FilterListIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
            )}
            
            {/* Export button */}
            <Tooltip title="Export">
              <IconButton onClick={(e) => setExportAnchorEl(e.currentTarget)}>
                <FileDownloadIcon />
              </IconButton>
            </Tooltip>
            
            {/* Refresh button */}
            <Tooltip title="Refresh">
              <IconButton onClick={fetchProducts}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            
            {/* View mode toggle */}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              size="small"
            >
              <ToggleButton value="card">
                <ViewModuleIcon />
              </ToggleButton>
              <ToggleButton value="table">
                <ViewListIcon />
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>

        {/* Filters */}
        {(filtersOpen || !isMobile) && (
          <ProductFiltersV2
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
            isMobile={isMobile}
          />
        )}
      </Box>

      {/* Bulk actions toolbar */}
      {selectedProducts.length > 0 && (
        <Box sx={{ 
          p: 2, 
          bgcolor: 'primary.main',
          color: 'primary.contrastText'
        }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography>
              {selectedProducts.length} selected
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button 
                size="small" 
                color="inherit"
                onClick={() => handleExport('selected')}
              >
                Export
              </Button>
              <Button 
                size="small" 
                color="inherit"
                onClick={handleBulkDelete}
              >
                Delete
              </Button>
              <Button 
                size="small" 
                color="inherit"
                onClick={() => setSelectedProducts([])}
              >
                Clear
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}

      {/* Main content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 1, sm: 2 } }}>
        {viewMode === 'card' ? (
          <ProductCardView
            products={paginatedProducts}
            selectedProducts={selectedProducts}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onQuickView={handleQuickView}
            onSelectionChange={setSelectedProducts}
            loading={loading}
          />
        ) : (
          <ProductTableView
            products={paginatedProducts}
            selectedProducts={selectedProducts}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onQuickView={handleQuickView}
            onSelectionChange={setSelectedProducts}
            loading={loading}
            isMobile={isMobile}
          />
        )}
      </Box>

      {/* Pagination */}
      <Box sx={{ 
        p: 2, 
        borderTop: 1, 
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          justifyContent="space-between" 
          alignItems="center"
          spacing={2}
        >
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Items per page</InputLabel>
            <Select
              value={itemsPerPage}
              label="Items per page"
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
              <MenuItem value={200}>200</MenuItem>
            </Select>
          </FormControl>
          
          <Pagination 
            count={totalPages} 
            page={page} 
            onChange={(_, value) => setPage(value)}
            color="primary"
            size={isMobile ? 'small' : 'medium'}
          />
        </Stack>
      </Box>

      {/* FAB for mobile */}
      {isMobile && (
        <Zoom in={true}>
          <Fab
            color="primary"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            onClick={() => setFormOpen(true)}
          >
            <AddIcon />
          </Fab>
        </Zoom>
      )}

      {/* Desktop add/import buttons */}
      {!isMobile && (
        <Box sx={{ position: 'fixed', bottom: 16, right: 16 }}>
          <Stack direction="column" spacing={1}>
            <Fab
              color="primary"
              onClick={() => setFormOpen(true)}
              size="medium"
            >
              <AddIcon />
            </Fab>
            <Tooltip title="Bulk Import" placement="left">
              <Fab
                color="secondary"
                onClick={() => setImportOpen(true)}
                size="small"
              >
                <FileDownloadIcon sx={{ transform: 'rotate(180deg)' }} />
              </Fab>
            </Tooltip>
          </Stack>
        </Box>
      )}

      {/* Export menu */}
      <Menu
        anchorEl={exportAnchorEl}
        open={Boolean(exportAnchorEl)}
        onClose={() => setExportAnchorEl(null)}
      >
        <MenuItem onClick={() => handleExport('all')}>
          Export All Products ({products.length})
        </MenuItem>
        <MenuItem onClick={() => handleExport('filtered')}>
          Export Filtered ({filteredProducts.length})
        </MenuItem>
        {selectedProducts.length > 0 && (
          <MenuItem onClick={() => handleExport('selected')}>
            Export Selected ({selectedProducts.length})
          </MenuItem>
        )}
      </Menu>

      {/* Dialogs */}
      <ProductForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        onSubmit={() => {
          fetchProducts();
          setFormOpen(false);
          setEditingProduct(null);
        }}
      />

      <BulkImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          fetchProducts();
          setImportOpen(false);
        }}
      />

      {quickViewProduct && (
        <ProductQuickView
          product={quickViewProduct}
          open={Boolean(quickViewProduct)}
          onClose={() => setQuickViewProduct(null)}
          onEdit={() => {
            handleEdit(quickViewProduct);
            setQuickViewProduct(null);
          }}
        />
      )}
    </Box>
  );
};

export default ProductCatalogV2;