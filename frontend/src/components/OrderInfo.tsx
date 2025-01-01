import React from 'react';
import { Box, Typography, Paper, Divider } from '@mui/material';

const OrderInfo: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" sx={{ mb: 4 }}>
          Features & Information
        </Typography>

        <Typography variant="h5" sx={{ mb: 2 }}>
          Design Paper Order System
        </Typography>
        <Typography paragraph>
          • Select a supplier from the dropdown menu
          • Choose one or more design papers from the product list
          • Filter products by tags or search by name/code
          • Enter the quantity (in kg) for each selected design
          • Click "Generate Order" to create a PDF order document
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" sx={{ mb: 2 }}>
          Custom Letter Generator
        </Typography>
        <Typography paragraph>
          • Create professional letters with company letterhead
          • Customize font type, size, and style
          • Add recipient, subject, and content
          • Include personalized closing remarks
          • Generate PDF with consistent formatting
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" sx={{ mb: 2 }}>
          Inventory Analytics
        </Typography>
        <Typography paragraph>
          • View real-time inventory statistics
          • Track stock levels and movements
          • Monitor low stock alerts
          • Analyze product performance
          • Export inventory reports
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" sx={{ mb: 2 }}>
          Document Format
        </Typography>
        <Typography paragraph>
          • Professional company letterhead with Artis Laminates logo
          • Consistent formatting and spacing
          • Clear section organization
          • High-quality PDF output
          • Automatic date formatting
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" sx={{ mb: 2 }}>
          System Features
        </Typography>
        <Typography paragraph>
          • Dark/Light mode support
          • Responsive design
          • Real-time updates
          • Error handling and validation
          • User-friendly interface
        </Typography>
      </Paper>
    </Box>
  );
};

export default OrderInfo; 