import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const OrderInfo: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ mb: 3 }}>
          Design Paper Order Information
        </Typography>
        
        <Typography variant="h6" sx={{ mb: 2 }}>
          How to Create an Order
        </Typography>
        <Typography paragraph>
          • Select a supplier from the dropdown menu
          • Choose one or more design papers from the product list
          • Enter the quantity (in kg) for each selected design
          • Click "Generate Order" to create a PDF order document
        </Typography>

        <Typography variant="h6" sx={{ mb: 2 }}>
          Order PDF Format
        </Typography>
        <Typography paragraph>
          • Company letterhead with Artis Laminates logo
          • Order date and supplier information
          • Table of selected designs with quantities
          • Professional closing remarks
        </Typography>
      </Paper>
    </Box>
  );
};

export default OrderInfo; 