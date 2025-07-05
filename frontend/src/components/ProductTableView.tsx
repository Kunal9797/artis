import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Checkbox,
  Typography,
  Box,
  Skeleton,
  Collapse,
  Stack,
  Chip,
  useTheme,
  alpha,
  TableSortLabel,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Product } from '../types/product';
import CatalogTags from './CatalogTags';

interface Props {
  products: Product[];
  selectedProducts: string[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onQuickView: (product: Product) => void;
  onSelectionChange: (ids: string[]) => void;
  loading?: boolean;
  isMobile?: boolean;
}

type SortField = 'artisCode' | 'name' | 'category' | 'supplier';
type SortOrder = 'asc' | 'desc';

const ProductTableView: React.FC<Props> = ({
  products,
  selectedProducts,
  onEdit,
  onDelete,
  onQuickView,
  onSelectionChange,
  loading = false,
  isMobile = false,
}) => {
  const theme = useTheme();
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('artisCode');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleSelectProduct = (productId: string) => {
    if (selectedProducts.includes(productId)) {
      onSelectionChange(selectedProducts.filter(id => id !== productId));
    } else {
      onSelectionChange([...selectedProducts, productId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(products.map(p => p.id));
    }
  };

  const handleExpandRow = (productId: string) => {
    if (expandedRows.includes(productId)) {
      setExpandedRows(expandedRows.filter(id => id !== productId));
    } else {
      setExpandedRows([...expandedRows, productId]);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'artisCode':
        aValue = parseInt(a.artisCodes[0]?.replace(/\D/g, '') || '0');
        bValue = parseInt(b.artisCodes[0]?.replace(/\D/g, '') || '0');
        break;
      case 'name':
        aValue = a.name || '';
        bValue = b.name || '';
        break;
      case 'category':
        aValue = a.category || '';
        bValue = b.category || '';
        break;
      case 'supplier':
        aValue = a.supplier || '';
        bValue = b.supplier || '';
        break;
      default:
        return 0;
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  if (loading) {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Skeleton variant="rectangular" width={20} height={20} />
              </TableCell>
              <TableCell><Skeleton /></TableCell>
              <TableCell><Skeleton /></TableCell>
              <TableCell><Skeleton /></TableCell>
              <TableCell><Skeleton /></TableCell>
              <TableCell><Skeleton /></TableCell>
              <TableCell><Skeleton /></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(5)].map((_, index) => (
              <TableRow key={index}>
                <TableCell padding="checkbox">
                  <Skeleton variant="rectangular" width={20} height={20} />
                </TableCell>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton /></TableCell>
                <TableCell><Skeleton /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  return (
    <TableContainer 
      component={Paper}
      sx={{ 
        maxHeight: 'calc(100vh - 300px)',
        '& .MuiTableCell-root': {
          borderRight: '1px solid',
          borderColor: 'divider',
          '&:last-child': {
            borderRight: 'none'
          }
        }
      }}
    >
      <Table stickyHeader size={isMobile ? 'small' : 'medium'}>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox" sx={{ backgroundColor: 'background.paper' }}>
              <Checkbox
                checked={selectedProducts.length === products.length && products.length > 0}
                indeterminate={selectedProducts.length > 0 && selectedProducts.length < products.length}
                onChange={handleSelectAll}
              />
            </TableCell>
            
            {isMobile && (
              <TableCell sx={{ backgroundColor: 'background.paper' }} />
            )}
            
            <TableCell sx={{ backgroundColor: 'background.paper' }}>
              <TableSortLabel
                active={sortField === 'artisCode'}
                direction={sortField === 'artisCode' ? sortOrder : 'asc'}
                onClick={() => handleSort('artisCode')}
              >
                Artis Code
              </TableSortLabel>
            </TableCell>
            
            <TableCell sx={{ backgroundColor: 'background.paper' }}>
              <TableSortLabel
                active={sortField === 'name'}
                direction={sortField === 'name' ? sortOrder : 'asc'}
                onClick={() => handleSort('name')}
              >
                Name
              </TableSortLabel>
            </TableCell>
            
            {!isMobile && (
              <>
                <TableCell sx={{ backgroundColor: 'background.paper' }}>
                  <TableSortLabel
                    active={sortField === 'category'}
                    direction={sortField === 'category' ? sortOrder : 'asc'}
                    onClick={() => handleSort('category')}
                  >
                    Category
                  </TableSortLabel>
                </TableCell>
                
                <TableCell sx={{ backgroundColor: 'background.paper' }}>
                  <TableSortLabel
                    active={sortField === 'supplier'}
                    direction={sortField === 'supplier' ? sortOrder : 'asc'}
                    onClick={() => handleSort('supplier')}
                  >
                    Supplier Info
                  </TableSortLabel>
                </TableCell>
                
                <TableCell sx={{ backgroundColor: 'background.paper' }}>
                  Catalogs
                </TableCell>
              </>
            )}
            
            <TableCell sx={{ backgroundColor: 'background.paper', minWidth: 120 }}>
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        
        <TableBody>
          {sortedProducts.map((product, index) => {
            const isSelected = selectedProducts.includes(product.id);
            const isExpanded = expandedRows.includes(product.id);
            
            return (
              <React.Fragment key={product.id}>
                <TableRow
                  hover
                  selected={isSelected}
                  sx={{
                    backgroundColor: isSelected 
                      ? alpha(theme.palette.primary.main, 0.08)
                      : 'background.paper',
                    '&.MuiTableRow-hover:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                    },
                    '& .MuiTableCell-root': {
                      py: 1,
                      fontSize: '0.875rem'
                    }
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleSelectProduct(product.id)}
                    />
                  </TableCell>
                  
                  {isMobile && (
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleExpandRow(product.id)}
                      >
                        {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                      </IconButton>
                    </TableCell>
                  )}
                  
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 500,
                        color: theme.palette.primary.main,
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        '&:hover': {
                          textDecoration: 'underline'
                        }
                      }}
                      onClick={() => onQuickView(product)}
                    >
                      {product.artisCodes.join(' / ')}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                      {product.name || '-'}
                    </Typography>
                  </TableCell>
                  
                  {!isMobile && (
                    <>
                      <TableCell>
                        {product.category && (
                          <Chip 
                            label={product.category} 
                            size="small" 
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {product.supplierCode}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {product.supplier}
                          </Typography>
                        </Stack>
                      </TableCell>
                      
                      <TableCell>
                        <CatalogTags catalogs={product.catalogs} size="small" />
                      </TableCell>
                    </>
                  )}
                  
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => onQuickView(product)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => onEdit(product)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onDelete(product.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
                
                {/* Mobile expanded row */}
                {isMobile && (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ py: 0 }}>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ py: 2 }}>
                          <Stack spacing={2}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Category
                              </Typography>
                              <Typography variant="body2">
                                {product.category || '-'}
                              </Typography>
                            </Box>
                            
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Supplier Info
                              </Typography>
                              <Typography variant="body2">
                                {product.supplierCode} - {product.supplier}
                              </Typography>
                            </Box>
                            
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Catalogs
                              </Typography>
                              <Box sx={{ mt: 0.5 }}>
                                <CatalogTags catalogs={product.catalogs} size="small" />
                              </Box>
                            </Box>
                            
                            {product.currentStock !== undefined && (
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  Stock Info
                                </Typography>
                                <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                  <Chip
                                    label={`Stock: ${product.currentStock}`}
                                    size="small"
                                    color={product.currentStock > 0 ? 'success' : 'error'}
                                    variant="outlined"
                                  />
                                  {product.avgConsumption !== undefined && (
                                    <Chip
                                      label={`Avg: ${product.avgConsumption}`}
                                      size="small"
                                      variant="outlined"
                                    />
                                  )}
                                </Stack>
                              </Box>
                            )}
                          </Stack>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
      
      {products.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No products found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Try adjusting your filters or add a new product
          </Typography>
        </Box>
      )}
    </TableContainer>
  );
};

export default ProductTableView;