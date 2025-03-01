import React, { useEffect, useState, memo, useMemo, useCallback } from 'react';
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
  CircularProgress,
  Grid,
  Card,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Chip,
  useMediaQuery,
  useTheme as useMuiTheme,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import UploadIcon from '@mui/icons-material/Upload';
import GridViewIcon from '@mui/icons-material/GridView';
import ListIcon from '@mui/icons-material/List';
import InfoIcon from '@mui/icons-material/Info';
import { inventoryApi } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import TransactionDialog from './TransactionDialog';
import ProductDetailsDialog from './ProductDetailsDialog';
import BulkUploadDialog from './BulkUploadDialog';
import SearchIcon from '@mui/icons-material/Search';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { Transaction } from '../../types/transaction';
import MobileInventoryCard from './MobileInventoryCard';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import MenuIcon from '@mui/icons-material/Menu';
import TuneIcon from '@mui/icons-material/Tune';
import AppsIcon from '@mui/icons-material/Apps';
import SettingsIcon from '@mui/icons-material/Settings';
import debounce from 'lodash/debounce';
import DeleteIcon from '@mui/icons-material/Delete';

export interface InventoryItem {
  id: string;
  artisCodes: string[];
  name: string;
  supplier?: string;
  category?: string;
  catalogs?: string[];
  supplierCode?: string;
  currentStock: number;
  lastUpdated: Date;
  minStockLevel?: number;
  avgConsumption: number;
  transactions?: Transaction[];
}

interface FilterState {
  search: string;
  supplier: string;
  category: string;
}

interface TransactionData {
  id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  date: string;
  notes?: string;
  productId: string;
}

const InventoryList: React.FC = () => {
  const { isDarkMode } = useTheme();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortField, setSortField] = useState<keyof InventoryItem>('currentStock');
  const [dialogState, setDialogState] = useState({
    transaction: false,
    details: false,
    bulkUpload: false
  });
  const [catalogFilter, setCatalogFilter] = useState('');
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showBulkUploadDialog, setShowBulkUploadDialog] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showMobileSort, setShowMobileSort] = useState(false);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  
  // Move useCallback to top level, before any conditional returns
  const debouncedSetSearch = useCallback(
    debounce((value: string) => {
      setSearchQuery(value);
    }, 300),
    []
  );

  const uniqueCatalogs = useMemo(() => 
    Array.from(new Set(inventory.flatMap(item => item.catalogs || [])))
      .filter(Boolean)
      .sort()
  , [inventory]);

  const filteredItems = useMemo(() => {
    let filtered = [...inventory];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.artisCodes.some(code => code.toLowerCase().includes(query)) ||
        (item.supplierCode?.toLowerCase() || '').includes(query) ||
        (item.supplier?.toLowerCase() || '').includes(query)
      );
    }

    if (supplierFilter) {
      filtered = filtered.filter(item => item.supplier === supplierFilter);
    }

    if (categoryFilter) {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    if (catalogFilter) {
      filtered = filtered.filter(item => 
        item.catalogs?.includes(catalogFilter)
      );
    }

    return filtered.sort((a, b) => {
      if (sortField === 'currentStock' || sortField === 'avgConsumption') {
        const aValue = Number(a[sortField]) || 0;
        const bValue = Number(b[sortField]) || 0;
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      const aValue = String(a[sortField] || '');
      const bValue = String(b[sortField] || '');
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  }, [inventory, searchQuery, supplierFilter, categoryFilter, catalogFilter, sortField, sortOrder]);

  // Simplified fetch function for debugging
  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await inventoryApi.getAllInventory();
      console.log('Inventory response:', response.data);
      setInventory(response.data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setError('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Simple loading view for testing
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Simple error view for testing
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
        <Button onClick={fetchInventory} sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  const handleViewModeToggle = () => {
    console.log('Current view mode:', viewMode);
    setViewMode(prev => {
      const newMode = prev === 'list' ? 'grid' : 'list';
      console.log('Switching to:', newMode);
      return newMode;
    });
  };

  const handleAddTransaction = () => {
    setDialogState(prev => ({ ...prev, transaction: true }));
  };

  const handleBulkUpload = () => {
    setDialogState(prev => ({ ...prev, bulkUpload: true }));
  };

  const handleClearInventory = async () => {
    if (window.confirm('Are you sure you want to clear all inventory? This will delete ALL transactions and reset stock levels to zero.')) {
      try {
        setLoading(true);
        await inventoryApi.clearInventory();
        fetchInventory();
        // Optional: Show success message
      } catch (error) {
        console.error('Error clearing inventory:', error);
        setError('Failed to clear inventory');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleOpenDetails = (id: string) => {
    setSelectedProduct(id);
    setDialogState(prev => ({ ...prev, details: true }));
  };

  const renderProductCodes = (artisCodes: string[]) => (
    <Box>
      {artisCodes.map((code, index) => (
        <Chip
          key={code}
          label={code}
          size="small"
          sx={{ mr: 0.5, mb: 0.5 }}
        />
      ))}
    </Box>
  );

  // Add click handler for sorting
  const handleSort = (field: keyof InventoryItem) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Hide view mode toggle on mobile
  const showViewModeToggle = !isMobile;
  
  // Force grid view on mobile
  const effectiveViewMode = isMobile ? 'grid' : viewMode;

  const actions = [
    { 
      icon: <SearchIcon />, 
      name: 'Search',
      onClick: () => setShowMobileSearch(true)
    },
    { 
      icon: <SortIcon />,
      name: 'Sort', 
      onClick: () => setShowMobileSort(true)
    },
    { 
      icon: <FilterListIcon />,
      name: 'Filter',
      onClick: () => setShowMobileFilter(true)
    },
    { 
      icon: <DeleteIcon />, 
      name: 'Clear Inventory',
      onClick: handleClearInventory
    },
  ];

  // Mobile Sort Dialog
  const MobileSortDialog = () => (
    <Dialog
      open={showMobileSort}
      onClose={() => setShowMobileSort(false)}
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: theme => `${theme.palette.mode === 'dark' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)'}`,
          backdropFilter: 'blur(8px)',
          boxShadow: theme => theme.palette.mode === 'dark' 
            ? '0 4px 30px rgba(0, 0, 0, 0.3)'
            : '0 4px 30px rgba(0, 0, 0, 0.1)',
        }
      }}
      maxWidth="xs"
      fullWidth
    >
      <DialogContent sx={{ p: 2 }}>
        <List sx={{ py: 0 }}>
          {[
            { field: 'artisCodes', label: 'Artis Code' },
            { field: 'currentStock', label: 'Current Stock' },
            { field: 'avgConsumption', label: 'Consumption' }
          ].map(({ field, label }) => (
            <ListItem
              key={field}
              sx={{
                borderRadius: 2,
                mb: 1,
                bgcolor: sortField === field 
                  ? theme => theme.palette.mode === 'dark' 
                    ? 'rgba(25, 118, 210, 0.12)'
                    : 'rgba(25, 118, 210, 0.08)'
                  : 'transparent',
                '&:hover': {
                  bgcolor: theme => theme.palette.mode === 'dark' 
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(0,0,0,0.04)'
                }
              }}
              onClick={() => {
                setSortField(field as keyof InventoryItem);
                setShowMobileSort(false);
              }}
            >
              <ListItemText 
                primary={label}
                sx={{ 
                  '& .MuiTypography-root': { 
                    fontWeight: sortField === field ? 600 : 400,
                    fontSize: '0.9rem',
                    color: sortField === field ? '#1976d2' : 'inherit'
                  }
                }}
              />
              {sortField === field && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                  }}
                  sx={{ color: '#1976d2' }}
                >
                  {sortOrder === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
                </IconButton>
              )}
            </ListItem>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );

  // Enhanced Mobile Filter Dialog
  const MobileFilterDialog = () => (
    <Dialog
      open={showMobileFilter}
      onClose={() => setShowMobileFilter(false)}
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: theme => `${theme.palette.mode === 'dark' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)'}`,
          backdropFilter: 'blur(8px)',
          boxShadow: theme => theme.palette.mode === 'dark' 
            ? '0 4px 30px rgba(0, 0, 0, 0.3)'
            : '0 4px 30px rgba(0, 0, 0, 0.1)',
        }
      }}
      maxWidth="xs"
      fullWidth
    >
      <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {[
          { label: 'Supplier', value: supplierFilter, setter: setSupplierFilter, options: Array.from(new Set(inventory.map(item => item.supplier))).filter(Boolean).sort() },
          { label: 'Category', value: categoryFilter, setter: setCategoryFilter, options: Array.from(new Set(inventory.map(item => item.category))).filter(Boolean).sort() },
          { label: 'Catalog', value: catalogFilter, setter: setCatalogFilter, options: uniqueCatalogs }
        ].map(({ label, value, setter, options }) => (
          <FormControl key={label} variant="outlined" size="small">
            <InputLabel 
              sx={{ 
                color: value ? '#1976d2' : 'inherit',
                '&.Mui-focused': {
                  color: '#1976d2'
                }
              }}
            >
              {label}
            </InputLabel>
            <Select
              value={value}
              onChange={(e) => setter(e.target.value)}
              label={label}
              sx={{
                borderRadius: 2,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: value ? '#1976d2' : theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1976d2'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1976d2'
                },
                bgcolor: value ? theme => theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.08)' : 'rgba(25, 118, 210, 0.04)' : 'transparent'
              }}
            >
              <MenuItem value="">
                <Typography sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                  All {label}s
                </Typography>
              </MenuItem>
              {options.map(option => (
                <MenuItem 
                  key={option} 
                  value={option}
                  sx={{
                    borderRadius: 1,
                    mx: 0.5,
                    my: 0.25,
                    '&.Mui-selected': {
                      bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.15)' : 'rgba(25, 118, 210, 0.08)',
                      '&:hover': {
                        bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.25)' : 'rgba(25, 118, 210, 0.12)'
                      }
                    }
                  }}
                >
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ))}
      </DialogContent>
    </Dialog>
  );

  const ActiveFilters = () => {
    const hasActiveFilters = supplierFilter || categoryFilter || catalogFilter;

    if (!hasActiveFilters) return null;

    return (
      <Box 
        sx={{ 
          position: 'fixed',
          bottom: 80, // Position above SpeedDial
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          alignItems: 'flex-end'
        }}
      >
        {supplierFilter && (
          <Chip
            label={`Supplier: ${supplierFilter}`}
            onDelete={() => setSupplierFilter('')}
            size="small"
            sx={{ 
              bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              '& .MuiChip-label': { px: 1 }
            }}
          />
        )}
        {categoryFilter && (
          <Chip
            label={`Category: ${categoryFilter}`}
            onDelete={() => setCategoryFilter('')}
            size="small"
            sx={{ 
              bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              '& .MuiChip-label': { px: 1 }
            }}
          />
        )}
        {catalogFilter && (
          <Chip
            label={`Catalog: ${catalogFilter}`}
            onDelete={() => setCatalogFilter('')}
            size="small"
            sx={{ 
              bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              '& .MuiChip-label': { px: 1 }
            }}
          />
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ 
      bgcolor: theme => theme.palette.mode === 'dark' ? '#121212' : '#f8fafc',
      minHeight: '100vh',
      position: 'relative'
    }}>
      {/* Sticky Mobile Controls */}
      {isMobile && (
        <Box sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          background: theme => theme.palette.mode === 'dark' 
            ? 'rgba(18, 18, 18, 0.7)'  // Much more transparent dark
            : 'rgba(255, 255, 255, 0.7)', // Much more transparent light
          backdropFilter: 'blur(20px)', // Increased blur effect
          WebkitBackdropFilter: 'blur(20px)', // For Safari support
          borderBottom: '1px solid',
          borderColor: theme => theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.05)' 
            : 'rgba(0, 0, 0, 0.05)',
          px: 2,
          py: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          boxShadow: theme => theme.palette.mode === 'dark'
            ? '0 4px 30px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.05)'
            : '0 4px 30px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.5)',
        }}>
          <Box sx={{ 
            display: 'flex', 
            gap: 1,
            position: 'relative',
            height: 32
          }}>
            {isSearchExpanded ? (
              <TextField
                autoFocus
                fullWidth
                defaultValue={searchQuery}
                onChange={(e) => debouncedSetSearch(e.target.value)}
                onBlur={() => {
                  setTimeout(() => {
                    setIsSearchExpanded(false);
                  }, 100);
                }}
                placeholder="Search by Artis code, supplier code..."
                variant="outlined"
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: searchQuery ? '#1976d2' : 'inherit' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSearchExpanded(false);
                          setSearchQuery('');
                        }}
                        sx={{ color: 'text.secondary' }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: {
                    height: 32,
                    bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1976d2'
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1976d2'
                    }
                  }
                }}
              />
            ) : (
              <>
                <Button
                  startIcon={<SearchIcon />}
                  onClick={() => setIsSearchExpanded(true)}
                  variant="outlined"
                  size="small"
                  sx={{
                    flex: 1,
                    justifyContent: 'flex-start',
                    borderRadius: 2,
                    height: 32,
                    borderColor: theme => theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.3)' 
                      : 'rgba(0, 0, 0, 0.23)',
                    color: searchQuery ? '#1976d2' : theme => theme.palette.mode === 'dark' ? '#fff' : 'inherit',
                    bgcolor: searchQuery 
                      ? theme => theme.palette.mode === 'dark' 
                        ? 'rgba(25, 118, 210, 0.15)' 
                        : 'rgba(25, 118, 210, 0.12)'
                      : 'transparent',
                    '&:hover': {
                      borderColor: '#1976d2',
                      bgcolor: theme => theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.08)',
                      transform: 'translateY(-1px)',
                      transition: 'all 0.2s',
                    }
                  }}
                >
                  {searchQuery || 'Search'}
                </Button>
                <Button
                  startIcon={<FilterListIcon />}
                  onClick={() => setShowMobileFilter(true)}
                  variant="outlined"
                  size="small"
                  sx={{
                    minWidth: '90px',
                    height: 32,
                    borderRadius: 2,
                    borderColor: theme => theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.3)' 
                      : 'rgba(0, 0, 0, 0.23)',
                    color: (supplierFilter || categoryFilter || catalogFilter) ? '#1976d2' : theme => theme.palette.mode === 'dark' ? '#fff' : 'inherit',
                    bgcolor: (supplierFilter || categoryFilter || catalogFilter)
                      ? theme => theme.palette.mode === 'dark'
                        ? 'rgba(25, 118, 210, 0.15)'
                        : 'rgba(25, 118, 210, 0.12)'
                      : 'transparent',
                    '&:hover': {
                      borderColor: '#1976d2',
                      bgcolor: theme => theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.08)',
                      transform: 'translateY(-1px)',
                      transition: 'all 0.2s',
                    }
                  }}
                >
                  Filter {(supplierFilter || categoryFilter || catalogFilter) && '•'}
                </Button>
                <Button
                  startIcon={<SortIcon />}
                  onClick={() => setShowMobileSort(true)}
                  variant="outlined"
                  size="small"
                  sx={{
                    minWidth: '90px',
                    height: 32,
                    borderRadius: 2,
                    borderColor: theme => theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.3)' 
                      : 'rgba(0, 0, 0, 0.23)',
                    color: theme => theme.palette.mode === 'dark' ? '#fff' : 'inherit',
                    '&:hover': {
                      borderColor: '#1976d2',
                      bgcolor: theme => theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.08)',
                      transform: 'translateY(-1px)',
                      transition: 'all 0.2s',
                    }
                  }}
                >
                  {sortField === 'currentStock' ? 'Stock' : 
                   sortField === 'avgConsumption' ? 'Cons.' : 
                   'Code'} {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </>
            )}
          </Box>
          
          {(searchQuery || supplierFilter || categoryFilter || catalogFilter) && (
            <Box sx={{ 
              display: 'flex', 
              gap: 0.5,
              overflowX: 'auto',
              py: 0.25,
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': {
                display: 'none'
              }
            }}>
              {supplierFilter && (
                <Chip
                  label={`${supplierFilter}`}
                  onDelete={() => setSupplierFilter('')}
                  size="small"
                  sx={{ 
                    bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.12)' : 'rgba(25, 118, 210, 0.08)',
                    borderRadius: 1.5,
                    height: 24
                  }}
                />
              )}
              {categoryFilter && (
                <Chip
                  label={`${categoryFilter}`}
                  onDelete={() => setCategoryFilter('')}
                  size="small"
                  sx={{ 
                    bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.12)' : 'rgba(25, 118, 210, 0.08)',
                    borderRadius: 1.5,
                    height: 24
                  }}
                />
              )}
              {catalogFilter && (
                <Chip
                  label={`${catalogFilter}`}
                  onDelete={() => setCatalogFilter('')}
                  size="small"
                  sx={{ 
                    bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.12)' : 'rgba(25, 118, 210, 0.08)',
                    borderRadius: 1.5,
                    height: 24
                  }}
                />
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Main content with padding */}
      <Box sx={{ p: 3 }}>
        {/* Desktop Controls */}
        {!isMobile && (
          <>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setDialogState(prev => ({ ...prev, transaction: true }))}
              >
                Add Transaction
              </Button>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => setDialogState(prev => ({ ...prev, bulkUpload: true }))}
              >
                Bulk Upload
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={handleClearInventory}
                sx={{ ml: 'auto' }}
              >
                Clear All Inventory
              </Button>
            </Box>

            {/* Desktop Filter Controls */}
            <Box sx={{ 
              mb: 3, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2, 
              flexWrap: 'wrap',
              width: '100%',
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              borderRadius: 1,
              p: 2
            }}>
              <Box sx={{ 
                display: 'flex',
                gap: 2,
                flexGrow: 1,
                flexWrap: 'wrap'
              }}>
                <TextField
                  size="small"
                  placeholder="Search inventory..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    )
                  }}
                  sx={{ 
                    minWidth: { xs: '100%', sm: 250 },
                    flexGrow: { sm: 1 },
                    maxWidth: { sm: 400 }
                  }}
                />

                <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
                  <InputLabel>Supplier</InputLabel>
                  <Select
                    value={supplierFilter}
                    onChange={(e) => setSupplierFilter(e.target.value)}
                    label="Supplier"
                  >
                    <MenuItem value="">All</MenuItem>
                    {Array.from(new Set(inventory.map(item => item.supplier)))
                      .filter(Boolean)
                      .sort()
                      .map(supplier => (
                        <MenuItem key={supplier} value={supplier}>{supplier}</MenuItem>
                      ))
                    }
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    label="Category"
                  >
                    <MenuItem value="">All</MenuItem>
                    {Array.from(new Set(inventory.map(item => item.category)))
                      .filter(Boolean)
                      .sort()
                      .map(category => (
                        <MenuItem key={category} value={category}>{category}</MenuItem>
                      ))
                    }
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 150 } }}>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as keyof InventoryItem)}
                    label="Sort By"
                  >
                    <MenuItem value="artisCodes">Artis Codes</MenuItem>
                    <MenuItem value="currentStock">Current Stock</MenuItem>
                    <MenuItem value="avgConsumption">Avg. Consumption</MenuItem>
                  </Select>
                </FormControl>

                <IconButton onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
                  {sortOrder === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
                </IconButton>
              </Box>
            </Box>
          </>
        )}

        {/* Main inventory content */}
        {effectiveViewMode === 'list' ? (
          <TableContainer component={Paper} sx={{ 
            maxHeight: 'calc(100vh - 250px)', 
            overflow: 'auto',
            boxShadow: theme => theme.palette.mode === 'dark' 
              ? '0 4px 6px -1px rgba(0, 0, 0, 0.4)'
              : '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            borderRadius: '8px',
            bgcolor: theme => theme.palette.mode === 'dark' ? '#1e1e1e' : '#fff',
            border: theme => theme.palette.mode === 'dark' ? '1px solid #333' : 'none',
            
            // Mobile responsive styles
            '& .MuiTable-root': {
              minWidth: { xs: 650, sm: 750, md: 900 }, // Adjust minimum widths
            },
            '& .MuiTableCell-root': {
              px: { xs: 1, sm: 2 }, // Reduce padding on mobile
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: {
                xs: '100px',
                sm: '150px',
                md: '200px'
              }
            }
          }}>
            <Table 
              stickyHeader 
              size="small" 
              sx={{
                '& .MuiTableCell-root': {
                  py: 1  // Reduce vertical padding
                }
              }}
            >
              <TableHead>
                <TableRow sx={{ 
                  '& th': {
                    backgroundColor: theme => theme.palette.mode === 'dark' ? '#22272e' : '#f8fafc',
                    borderBottom: theme => `2px solid ${theme.palette.mode === 'dark' ? '#444d56' : '#e2e8f0'}`,
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: theme => theme.palette.mode === 'dark' ? '#e6edf3' : 'inherit'
                  }
                }}>
                  <TableCell align="center" sx={{ fontWeight: 'bold', width: '50px' }}>#</TableCell>
                  <TableCell 
                    align="center" 
                    sx={{ fontWeight: 'bold', minWidth: '200px', cursor: 'pointer' }}
                    onClick={() => handleSort('artisCodes')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      Artis Codes
                      {sortField === 'artisCodes' && (
                        <span style={{ 
                          fontSize: '1.6rem', 
                          color: '#1976d2',
                          fontWeight: 900,
                          lineHeight: 0.7,
                          WebkitTextStroke: '2px currentColor'
                        }}>
                          {sortOrder === 'desc' ? '↑' : '↓'}
                        </span>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: '200px' }}>Supplier Info</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: '120px' }}>Category</TableCell>
                  <TableCell 
                    align="right" 
                    sx={{ fontWeight: 'bold', minWidth: '150px', cursor: 'pointer' }}
                    onClick={() => handleSort('currentStock')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                      Current Stock
                      {sortField === 'currentStock' && (
                        <span style={{ 
                          fontSize: '1.6rem', 
                          color: '#1976d2',
                          fontWeight: 900,
                          lineHeight: 0.7,
                          WebkitTextStroke: '2px currentColor'
                        }}>
                          {sortOrder === 'desc' ? '↑' : '↓'}
                        </span>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell 
                    align="right" 
                    sx={{ fontWeight: 'bold', minWidth: '150px', cursor: 'pointer' }}
                    onClick={() => handleSort('avgConsumption')}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                      Avg. Consumption
                      {sortField === 'avgConsumption' && (
                        <span style={{ 
                          fontSize: '1.6rem', 
                          color: '#1976d2',
                          fontWeight: 900,
                          lineHeight: 0.7,
                          WebkitTextStroke: '2px currentColor'
                        }}>
                          {sortOrder === 'desc' ? '↑' : '↓'}
                        </span>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', width: '80px' }}>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody sx={{ 
                transition: 'opacity 0.2s ease-in-out',
                opacity: loading ? 0.5 : 1 
              }}>
                {filteredItems.map((item: InventoryItem, index: number) => (
                  <TableRow 
                    key={item.id} 
                    hover
                    sx={{
                      '&:nth-of-type(odd)': {
                        backgroundColor: theme => theme.palette.mode === 'dark' 
                          ? 'rgba(255, 255, 255, 0.03)'
                          : 'rgba(0, 0, 0, 0.03)'
                      },
                      '&:hover': {
                        backgroundColor: theme => theme.palette.mode === 'dark'
                          ? 'rgba(255, 255, 255, 0.05) !important'
                          : 'rgba(0, 0, 0, 0.05) !important'
                      },
                      '& td': {
                        color: theme => theme.palette.mode === 'dark' ? '#e6edf3' : 'inherit',
                        borderBottom: theme => `1px solid ${theme.palette.mode === 'dark' ? '#444d56' : '#e2e8f0'}`
                      }
                    }}
                  >
                    <TableCell align="center">{index + 1}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {item.artisCodes.map((code) => (
                            <Chip
                              key={code}
                              label={code}
                              size="small"
                              sx={{ 
                                height: '24px',
                                '& .MuiChip-label': {
                                  px: 1,
                                  fontSize: '0.85rem',
                                  fontWeight: 500
                                }
                              }}
                            />
                          ))}
                        </Box>
                        {item.name && (
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: theme => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b',
                              fontSize: '0.85rem',
                              fontStyle: 'italic'
                            }}
                          >
                            {item.name}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography sx={{ 
                          fontSize: '0.9rem', 
                          fontWeight: 500,
                          lineHeight: 1.2
                        }}>
                          {item.supplier}
                        </Typography>
                        {item.supplierCode && (
                          <Typography sx={{
                            fontSize: '0.85rem',
                            color: theme => theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2',
                            lineHeight: 1.2
                          }}>
                            {item.supplierCode}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <Typography sx={{
                          fontSize: '1.1rem',
                          fontWeight: 600,
                          color: theme => theme.palette.mode === 'dark' ? '#90caf9' : '#0d47a1'
                        }}>
                          {item.currentStock}
                        </Typography>
                        <Typography sx={{
                          fontSize: '0.75rem',
                          ml: 0.5,
                          color: theme => theme.palette.mode === 'dark' ? '#fff' : '#000',
                        }}>
                          kgs
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <Typography sx={{
                          fontSize: '1.1rem',
                          fontWeight: 600,
                          color: theme => theme.palette.mode === 'dark' ? '#90caf9' : '#0d47a1'
                        }}>
                          {Number(item.avgConsumption).toFixed(2)}
                        </Typography>
                        <Typography sx={{
                          fontSize: '0.75rem',
                          ml: 0.5,
                          color: theme => theme.palette.mode === 'dark' ? '#fff' : '#000',
                        }}>
                          kgs
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleOpenDetails(item.id)}>
                        <InfoIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Grid container spacing={2}>
            {filteredItems.map((item: InventoryItem, index: number) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                {isMobile ? (
                  <MobileInventoryCard
                    item={item}
                    onDetailsClick={handleOpenDetails}
                    index={index}
                  />
                ) : (
                  <Card sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: theme => theme.palette.mode === 'dark' ? '#1e1e1e' : '#fff',
                    borderRadius: '8px',
                    boxShadow: theme => theme.palette.mode === 'dark' 
                      ? '0 4px 6px -1px rgba(0, 0, 0, 0.4)'
                      : '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    transition: 'transform 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-2px)'
                    }
                  }}>
                    <Box sx={{ p: 2 }}>
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                          {item.artisCodes.map((code) => (
                            <Chip
                              key={code}
                              label={code}
                              size="small"
                              sx={{ 
                                height: '24px',
                                '& .MuiChip-label': {
                                  px: 1,
                                  fontSize: '0.85rem'
                                }
                              }}
                            />
                          ))}
                        </Box>
                        <Typography variant="body2" sx={{ 
                          color: theme => theme.palette.mode === 'dark' ? '#94a3b8' : '#64748b',
                          mt: 1
                        }}>
                          {item.name}
                        </Typography>
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography sx={{ fontWeight: 500 }}>
                          {item.supplier}
                        </Typography>
                        {item.supplierCode && (
                          <Typography variant="body2" sx={{
                            color: theme => theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2'
                          }}>
                            {item.supplierCode}
                          </Typography>
                        )}
                      </Box>

                      <Chip
                        label={item.category}
                        size="small"
                        sx={{
                          mb: 2,
                          bgcolor: theme => theme.palette.mode === 'dark' ? '#1f6feb20' : '#e3f2fd',
                          color: theme => theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2'
                        }}
                      />

                      <Grid container spacing={2} sx={{ mt: 'auto' }}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">
                            Current Stock
                          </Typography>
                          <Typography sx={{ 
                            fontSize: '1.2rem', 
                            fontWeight: 600,
                            color: theme => theme.palette.mode === 'dark' ? '#90caf9' : '#0d47a1'
                          }}>
                            {item.currentStock}
                            <Typography component="span" sx={{
                              fontSize: '0.75rem',
                              ml: 0.5,
                              color: 'text.secondary'
                            }}>
                              kgs
                            </Typography>
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary" align="right">
                            Avg. Consumption
                          </Typography>
                          <Typography sx={{ 
                            fontSize: '1.2rem', 
                            fontWeight: 600,
                            textAlign: 'right',
                            color: theme => theme.palette.mode === 'dark' ? '#90caf9' : '#0d47a1'
                          }}>
                            {Number(item.avgConsumption).toFixed(2)}
                            <Typography component="span" sx={{
                              fontSize: '0.75rem',
                              ml: 0.5,
                              color: 'text.secondary'
                            }}>
                              kgs
                            </Typography>
                          </Typography>
                        </Grid>
                      </Grid>

                      <Button
                        fullWidth
                        startIcon={<InfoIcon />}
                        onClick={() => handleOpenDetails(item.id)}
                        sx={{ mt: 2 }}
                      >
                        Details
                      </Button>
                    </Box>
                  </Card>
                )}
              </Grid>
            ))}
          </Grid>
        )}

        {/* Dialogs */}
        <TransactionDialog
          open={dialogState.transaction}
          onClose={() => setDialogState(prev => ({ ...prev, transaction: false }))}
          productId={selectedProduct || ''}
          onSuccess={fetchInventory}
        />

        <ProductDetailsDialog
          open={dialogState.details}
          onClose={() => setDialogState(prev => ({ ...prev, details: false }))}
          productId={selectedProduct || ''}
        />

        <BulkUploadDialog
          open={dialogState.bulkUpload}
          onClose={() => setDialogState(prev => ({ ...prev, bulkUpload: false }))}
          onSuccess={fetchInventory}
        />
        
        {/* Mobile dialogs */}
        <MobileSortDialog />
        <MobileFilterDialog />
      </Box>
    </Box>
  );
};

export default InventoryList; 