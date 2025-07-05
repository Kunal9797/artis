import React, { useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Button,
  FormControlLabel,
  Switch,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Collapse,
  Typography,
  Drawer,
  useTheme,
  alpha,
  SelectChangeEvent,
  Badge,
  Divider,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

interface Props {
  catalogs: string[];
  suppliers: string[];
  categories: string[];
  selectedCatalogs: string[];
  selectedSuppliers: string[];
  selectedCategories: string[];
  catalogFilterMode: 'AND' | 'OR';
  searchQuery: string;
  onCatalogChange: (value: string[]) => void;
  onSupplierChange: (value: string[]) => void;
  onCategoryChange: (value: string[]) => void;
  onCatalogFilterModeChange: (mode: 'AND' | 'OR') => void;
  onSearchQueryChange: (value: string) => void;
  isMobile?: boolean;
}

const ProductFiltersV2: React.FC<Props> = ({
  catalogs,
  suppliers,
  categories,
  selectedCatalogs,
  selectedSuppliers,
  selectedCategories,
  catalogFilterMode,
  searchQuery,
  onCatalogChange,
  onSupplierChange,
  onCategoryChange,
  onCatalogFilterModeChange,
  onSearchQueryChange,
  isMobile = false,
}) => {
  const theme = useTheme();
  const [expandedFilters, setExpandedFilters] = useState(!isMobile);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleClearFilters = () => {
    onCatalogChange([]);
    onSupplierChange([]);
    onCategoryChange([]);
    onSearchQueryChange('');
  };

  const activeFilterCount = 
    selectedCatalogs.length + 
    selectedSuppliers.length + 
    selectedCategories.length + 
    (searchQuery ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  // Filter chips component
  const FilterChips = () => (
    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
      {searchQuery && (
        <Chip
          label={`Search: "${searchQuery}"`}
          onDelete={() => onSearchQueryChange('')}
          size="small"
          color="primary"
          variant="filled"
        />
      )}
      
      {selectedCatalogs.map(catalog => (
        <Chip
          key={`catalog-${catalog}`}
          label={catalog}
          onDelete={() => onCatalogChange(selectedCatalogs.filter(c => c !== catalog))}
          size="small"
          sx={{ 
            bgcolor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText
          }}
        />
      ))}
      
      {selectedSuppliers.map(supplier => (
        <Chip
          key={`supplier-${supplier}`}
          label={supplier}
          onDelete={() => onSupplierChange(selectedSuppliers.filter(s => s !== supplier))}
          size="small"
          sx={{ 
            bgcolor: theme.palette.secondary.main,
            color: theme.palette.secondary.contrastText
          }}
        />
      ))}
      
      {selectedCategories.map(category => (
        <Chip
          key={`category-${category}`}
          label={category}
          onDelete={() => onCategoryChange(selectedCategories.filter(c => c !== category))}
          size="small"
          sx={{ 
            bgcolor: theme.palette.info.main,
            color: theme.palette.info.contrastText
          }}
        />
      ))}
      
      {hasActiveFilters && (
        <Chip
          label="Clear All"
          onClick={handleClearFilters}
          size="small"
          variant="outlined"
          icon={<ClearIcon />}
        />
      )}
    </Stack>
  );

  // Filter controls component
  const FilterControls = () => (
    <Stack spacing={2}>
      {/* Search field - always visible */}
      <TextField
        size="small"
        fullWidth
        variant="outlined"
        placeholder="Search by code, name, or supplier..."
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: searchQuery && (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={() => onSearchQueryChange('')}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      {/* Collapsible filters */}
      <Collapse in={expandedFilters || isMobile}>
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          spacing={2}
          alignItems="stretch"
        >
          {/* Catalogs */}
          <FormControl size="small" fullWidth>
            <InputLabel>
              Catalogs {selectedCatalogs.length > 0 && `(${selectedCatalogs.length})`}
            </InputLabel>
            <Select
              multiple
              value={selectedCatalogs}
              label={`Catalogs ${selectedCatalogs.length > 0 ? `(${selectedCatalogs.length})` : ''}`}
              onChange={(e: SelectChangeEvent<string[]>) => 
                onCatalogChange(e.target.value as string[])
              }
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              <MenuItem sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={catalogFilterMode === 'AND'}
                      onChange={(e) => onCatalogFilterModeChange(e.target.checked ? 'AND' : 'OR')}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="caption">
                      Match {catalogFilterMode === 'AND' ? 'ALL' : 'ANY'} selected
                    </Typography>
                  }
                  sx={{ m: 0 }}
                />
              </MenuItem>
              {catalogs.map((catalog) => (
                <MenuItem key={catalog} value={catalog}>
                  {catalog}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Suppliers */}
          <FormControl size="small" fullWidth>
            <InputLabel>
              Suppliers {selectedSuppliers.length > 0 && `(${selectedSuppliers.length})`}
            </InputLabel>
            <Select
              multiple
              value={selectedSuppliers}
              label={`Suppliers ${selectedSuppliers.length > 0 ? `(${selectedSuppliers.length})` : ''}`}
              onChange={(e: SelectChangeEvent<string[]>) => 
                onSupplierChange(e.target.value as string[])
              }
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {suppliers.map((supplier) => (
                <MenuItem key={supplier} value={supplier}>
                  {supplier}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Categories */}
          <FormControl size="small" fullWidth>
            <InputLabel>
              Categories {selectedCategories.length > 0 && `(${selectedCategories.length})`}
            </InputLabel>
            <Select
              multiple
              value={selectedCategories}
              label={`Categories ${selectedCategories.length > 0 ? `(${selectedCategories.length})` : ''}`}
              onChange={(e: SelectChangeEvent<string[]>) => 
                onCategoryChange(e.target.value as string[])
              }
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
            >
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Clear button */}
          {hasActiveFilters && !isMobile && (
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={handleClearFilters}
              size="small"
              sx={{ minWidth: 100 }}
            >
              Clear
            </Button>
          )}
        </Stack>
      </Collapse>

      {/* Toggle filters button for desktop */}
      {!isMobile && (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            size="small"
            onClick={() => setExpandedFilters(!expandedFilters)}
            endIcon={expandedFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          >
            {expandedFilters ? 'Hide' : 'Show'} Filters
          </Button>
        </Box>
      )}
    </Stack>
  );

  // Mobile drawer
  if (isMobile) {
    return (
      <>
        {/* Mobile search bar */}
        <Stack spacing={1}>
          <TextField
            size="small"
            fullWidth
            variant="outlined"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setMobileDrawerOpen(true)}
                  >
                    <Badge badgeContent={activeFilterCount} color="primary">
                      <FilterListIcon />
                    </Badge>
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          {/* Active filter chips */}
          {hasActiveFilters && <FilterChips />}
        </Stack>

        {/* Mobile filter drawer */}
        <Drawer
          anchor="bottom"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          PaperProps={{
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: '80vh',
            }
          }}
        >
          <Box sx={{ p: 2 }}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Filters</Typography>
              <IconButton onClick={() => setMobileDrawerOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Stack>
            
            <Divider sx={{ mb: 2 }} />
            
            {/* Filters */}
            <FilterControls />
            
            {/* Action buttons */}
            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
              >
                Clear All
              </Button>
              <Button
                variant="contained"
                fullWidth
                onClick={() => setMobileDrawerOpen(false)}
              >
                Apply Filters
              </Button>
            </Stack>
          </Box>
        </Drawer>
      </>
    );
  }

  // Desktop layout
  return (
    <Box sx={{ 
      backgroundColor: alpha(theme.palette.background.paper, 0.6),
      borderRadius: 1,
      p: 2,
      border: '1px solid',
      borderColor: 'divider'
    }}>
      <Stack spacing={2}>
        {/* Active filter chips */}
        {hasActiveFilters && (
          <>
            <FilterChips />
            <Divider />
          </>
        )}
        
        {/* Filter controls */}
        <FilterControls />
      </Stack>
    </Box>
  );
};

export default ProductFiltersV2;