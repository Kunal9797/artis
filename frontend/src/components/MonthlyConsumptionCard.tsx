import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  SelectChangeEvent
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export interface ConsumptionData {
  month: string;
  total: number;
}

interface MonthlyConsumptionCardProps {
  data: ConsumptionData[];
  suppliers: string[];
  categories: string[];
}

const MonthlyConsumptionCard: React.FC<MonthlyConsumptionCardProps> = ({ 
  data, 
  suppliers, 
  categories 
}) => {
  const [supplier, setSupplier] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');

  return (
    <Card elevation={3}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" color="primary">Monthly Consumption</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Supplier</InputLabel>
              <Select 
                value={supplier} 
                onChange={(e: SelectChangeEvent<string>) => setSupplier(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                {suppliers.map((s: string) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Category</InputLabel>
              <Select 
                value={category} 
                onChange={(e: SelectChangeEvent<string>) => setCategory(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                {categories.map((c: string) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
        <Box sx={{ height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={data}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#1976d2" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default MonthlyConsumptionCard;
