import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Box,
  IconButton
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';

export interface Product {
  id: string;
  artisCode: string;
  supplier: string;
}

export interface TopPerformerItem {
  id: string;
  product: Product;
  avgConsumption: number;
  currentStock: number;
}

interface TopPerformersCardProps {
  data: TopPerformerItem[];
}

const TopPerformersCard: React.FC<TopPerformersCardProps> = ({ data }) => {
  const navigate = useNavigate();
  
  return (
    <Card elevation={3}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" color="primary">Top Performers</Typography>
          <IconButton 
            onClick={() => navigate('/inventory?sort=avgConsumption&order=desc')}
            size="small"
          >
            <ArrowForwardIcon />
          </IconButton>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Artis Code</TableCell>
              <TableCell>Supplier</TableCell>
              <TableCell align="right">Avg. Consumption</TableCell>
              <TableCell align="right">Current Stock</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell>{item.product.artisCode}</TableCell>
                <TableCell>{item.product.supplier}</TableCell>
                <TableCell align="right">{item.avgConsumption?.toFixed(2)} kgs</TableCell>
                <TableCell align="right">{item.currentStock} kgs</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default TopPerformersCard;
