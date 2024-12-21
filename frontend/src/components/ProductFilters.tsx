import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack
} from '@mui/material';

interface Props {
  catalogs: string[];
  suppliers: string[];
  categories: string[];
  selectedCatalog: string;
  selectedSupplier: string;
  selectedCategory: string;
  onCatalogChange: (value: string) => void;
  onSupplierChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
}

const ProductFilters: React.FC<Props> = ({
  catalogs,
  suppliers,
  categories,
  selectedCatalog,
  selectedSupplier,
  selectedCategory,
  onCatalogChange,
  onSupplierChange,
  onCategoryChange,
}) => {
  return (
    <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
      <FormControl sx={{ minWidth: 200 }}>
        <InputLabel>Catalog</InputLabel>
        <Select
          value={selectedCatalog}
          label="Catalog"
          onChange={(e) => onCatalogChange(e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
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
          value={selectedSupplier}
          label="Supplier"
          onChange={(e) => onSupplierChange(e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
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
          value={selectedCategory}
          label="Category"
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <MenuItem value="">All</MenuItem>
          {categories.map((category) => (
            <MenuItem key={category} value={category}>
              {category}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
};

export default ProductFilters; 