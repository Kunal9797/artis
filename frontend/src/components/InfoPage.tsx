import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const InfoPage: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ mb: 3 }}>
          How to Use the Product Catalog
        </Typography>
        
        <Typography variant="h6" sx={{ mb: 2 }}>
          Basic Features
        </Typography>
        <Typography paragraph>
          • Search: Use the search bar to find products by artis code, name, supplier code, supplier, or category
          • Filters: Use the dropdown menus to filter by catalog, supplier, and category
          • Grouping: Toggle "Group same designs" to combine products with the same supplier code
        </Typography>

        <Typography variant="h6" sx={{ mb: 2 }}>
          Managing Products
        </Typography>
        <Typography paragraph>
          • Add Product: Click the "Add Product" button to create a new product
          • Edit: Use the edit icon to modify existing products
          • Delete: Use the delete icon to remove products
          • Bulk Import: Use the "Bulk Import" button to import multiple products from an Excel file
        </Typography>

        <Typography variant="h6" sx={{ mb: 2 }}>
          Tips
        </Typography>
        <Typography paragraph>
          • Sort products by clicking on the Artis Code column header
          • Use the catalog tags to quickly identify which catalogs a product belongs to
          • When grouping designs, products with the same supplier code will be combined
        </Typography>
      </Paper>
    </Box>
  );
};

export default InfoPage; 