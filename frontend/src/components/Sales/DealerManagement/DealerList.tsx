import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const DealerList: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Dealer Management
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography>Dealer list content will go here</Typography>
      </Paper>
    </Box>
  );
};

export default DealerList; 