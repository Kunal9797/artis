import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Button
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';

interface Props {
  catalogs: string[];
  suppliers: string[];
  categories: string[];
  selectedCatalogs: string[];
  selectedSuppliers: string[];
  selectedCategories: string[];
  onCatalogChange: (value: string[]) => void;
  onSupplierChange: (value: string[]) => void;
  onCategoryChange: (value: string[]) => void;
}

const ProductFilters: React.FC<Props> = ({
  catalogs,
  suppliers,
  categories,
  selectedCatalogs,
  selectedSuppliers,
  selectedCategories,
  onCatalogChange,
  onSupplierChange,
  onCategoryChange,
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
    <Stack direction="row" spacing={2} alignItems="center">
      <FormControl sx={{ minWidth: 200 }}>
        <InputLabel>Catalogs</InputLabel>
        <Select
          multiple
          value={selectedCatalogs}
          label="Catalogs"
          onChange={(e) => onCatalogChange(e.target.value as string[])}
        >
          {catalogs.map((catalog) => (
            <MenuItem key={catalog} value={catalog}>
              {catalog}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl sx={{ minWidth: 200 }}>
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

      <FormControl sx={{ minWidth: 200 }}>
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
          Clear Filters
        </Button>
      )}
    </Stack>
  );
};

export default ProductFilters; 