import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const TerritoryView: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Territory Overview
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography>Territory view content will go here</Typography>
      </Paper>
    </Box>
  );
};

export default TerritoryView; 