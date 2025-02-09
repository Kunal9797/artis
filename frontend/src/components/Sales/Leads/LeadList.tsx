import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const LeadList: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Lead Management
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography>Lead list content will go here</Typography>
      </Paper>
    </Box>
  );
};

export default LeadList; 