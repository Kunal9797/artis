import React from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import DesignPaperOrder from './DesignPaperOrder';
import OrderInfo from './OrderInfo';

const OrdersPage: React.FC = () => {
  const [tabValue, setTabValue] = React.useState(0);

  return (
    <Box>
      <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
        <Tab label="Create Order" />
        <Tab label="Information" />
      </Tabs>
      
      {tabValue === 0 && <DesignPaperOrder />}
      {tabValue === 1 && <OrderInfo />}
    </Box>
  );
};

export default OrdersPage; 