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
  Tooltip
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';

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
}

const ProductFilters: React.FC<Props> = ({
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
}) => {
  const handleClearFilters = () => {
    onCatalogChange([]);
    onSupplierChange([]);
    onCategoryChange([]);
  };

  const hasActiveFilters = selectedCatalogs.length > 0 || 
    selectedSuppliers.length > 0 || 
    selectedCategories.length > 0;

  return (
    <Box sx={{ mb: 2 }}>
      <Stack spacing={2}>
        <Stack 
          direction={{ xs: 'column', md: 'row' }} 
          spacing={2} 
          alignItems={{ xs: 'stretch', md: 'center' }}
          sx={{
            backgroundColor: 'background.paper',
            p: { xs: 2, md: 1 },
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <TextField
            size="small"
            sx={{ width: 300 }}
            variant="outlined"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ width: 200 }}>
            <InputLabel>
              Catalogs {selectedCatalogs.length > 0 && `(${selectedCatalogs.length})`}
            </InputLabel>
            <Select
              multiple
              value={selectedCatalogs}
              label="Catalogs"
              onChange={(e) => onCatalogChange(e.target.value as string[])}
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
                  label={catalogFilterMode === 'AND' ? 'AND' : 'OR'}
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

          <FormControl size="small" sx={{ width: 200 }}>
            <InputLabel>Supplier</InputLabel>
            <Select
              multiple
              value={selectedSuppliers}
              label="Supplier"
              onChange={(e) => onSupplierChange(e.target.value as string[])}
            >
              {suppliers.map((supplier) => (
                <MenuItem key={supplier} value={supplier}>
                  {supplier}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ width: 200 }}>
            <InputLabel>Category</InputLabel>
            <Select
              multiple
              value={selectedCategories}
              label="Category"
              onChange={(e) => onCategoryChange(e.target.value as string[])}
            >
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {hasActiveFilters && (
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={handleClearFilters}
              size="small"
            >
              Clear
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
};

export default ProductFilters; 