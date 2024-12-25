import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  LabelList
} from 'recharts';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

interface Transaction {
  id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  date: string;
  notes: string;
}

interface ProductDetails {
  artisCode: string;
  name: string;
  currentStock: number;
  transactions: Transaction[];
  monthlyConsumption: { month: string; consumption: number }[];
  stockMovements: { date: string; stock: number }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  productId: string;
}

const ProductDetailsDialog: React.FC<Props> = ({ open, onClose, productId }) => {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<ProductDetails | null>(null);
  const { isDarkMode } = useTheme();

  useEffect(() => {
    if (open && productId) {
      fetchProductDetails();
    }
  }, [open, productId]);

  const fetchProductDetails = async () => {
    setLoading(true);
    try {
      console.log('Fetching details for productId:', productId);
      
      const [transactionsRes, inventoryRes] = await Promise.all([
        api.get(`/inventory/transactions/${productId}`).catch(error => {
          console.error('Transactions API error:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
          });
          throw error;
        }),
        api.get(`/inventory/product/${productId}`).catch(error => {
          console.error('Inventory API error:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
          });
          throw error;
        })
      ]);

      console.log('API Responses:', {
        transactions: {
          status: transactionsRes.status,
          data: transactionsRes.data
        },
        inventory: {
          status: inventoryRes.status,
          data: inventoryRes.data
        }
      });

      // Process data for analytics
      const stockMovements = processStockMovements(transactionsRes.data);
      const monthlyConsumption = calculateMonthlyConsumption(transactionsRes.data);

      setDetails({
        artisCode: transactionsRes.data[0]?.product?.artisCode || '',
        name: transactionsRes.data[0]?.product?.name || '',
        currentStock: inventoryRes.data?.currentStock || 0,
        transactions: transactionsRes.data || [],
        monthlyConsumption,
        stockMovements
      });
    } catch (error) {
      console.error('Error fetching product details:', {
        error,
        productId,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
    setLoading(false);
  };

  const processStockMovements = (transactions: Transaction[]) => {
    // Sort transactions by date
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let currentStock = 0;
    return sortedTransactions.map(t => {
      currentStock += t.type === 'IN' ? Number(t.quantity) : -Number(t.quantity);
      return {
        date: t.date,
        stock: Number(currentStock)
      };
    });
  };

  const calculateMonthlyConsumption = (transactions: Transaction[]) => {
    const monthlyData: Record<string, number> = {};
    
    transactions.forEach(t => {
      if (t.type === 'OUT') {
        const month = new Date(t.date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long'
        });
        monthlyData[month] = (monthlyData[month] || 0) + t.quantity;
      }
    });

    // Sort by date
    return Object.entries(monthlyData)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([month, consumption]) => ({
        month,
        consumption
      }));
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: isDarkMode ? 'background.paper' : '#fff'
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider',
          color: isDarkMode ? '#fff' : 'inherit'
        }}
      >
        Product Details - {details?.artisCode} ({details?.name})
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Current Stock Card */}
            <Grid item xs={12} md={4}>
              <Card 
                elevation={3}
                sx={{ 
                  bgcolor: isDarkMode ? 'background.paper' : '#fff',
                  border: isDarkMode ? 1 : 0,
                  borderColor: 'divider'
                }}
              >
                <CardContent>
                  <Typography 
                    variant="h6" 
                    color={isDarkMode ? '#90CAF9' : 'primary'} 
                    gutterBottom
                  >
                    Current Stock
                  </Typography>
                  <Typography variant="h3" color={isDarkMode ? '#fff' : 'inherit'}>
                    {details?.currentStock}
                    <Typography 
                      component="span" 
                      variant="h5" 
                      color={isDarkMode ? 'grey.400' : 'text.secondary'}
                    >
                      kgs
                    </Typography>
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Monthly Consumption Graph */}
            <Grid item xs={12} md={8}>
              <Card 
                elevation={3}
                sx={{ 
                  bgcolor: isDarkMode ? 'background.paper' : '#fff',
                  border: isDarkMode ? 1 : 0,
                  borderColor: 'divider'
                }}
              >
                <CardContent>
                  <Typography 
                    variant="h6" 
                    color={isDarkMode ? '#90CAF9' : 'primary'} 
                    gutterBottom
                  >
                    Monthly Consumption Analysis
                  </Typography>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart 
                      data={details?.monthlyConsumption}
                      barSize={40}
                      margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                    >
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke={isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#ccc'}
                      />
                      <XAxis 
                        dataKey="month"
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        interval={0}
                        tick={{ fill: isDarkMode ? '#fff' : '#666' }}
                      />
                      <YAxis 
                        tick={{ fill: isDarkMode ? '#fff' : '#666' }}
                        domain={[0, (dataMax: number) => {
                          const actualMax = Math.max(...(details?.monthlyConsumption || []).map(item => item.consumption));
                          return Math.ceil(actualMax * 1.2 / 10) * 10;
                        }]}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: isDarkMode ? '#424242' : '#fff',
                          border: '1px solid #666',
                          color: isDarkMode ? '#fff' : '#000'
                        }}
                        formatter={(value: number) => `${value} kgs`}
                      />
                      <Bar 
                        dataKey="consumption" 
                        fill={isDarkMode ? '#90CAF9' : '#8884d8'} 
                        name="Consumption (kgs)"
                      >
                        <LabelList 
                          dataKey="consumption" 
                          position="top" 
                          fill={isDarkMode ? '#fff' : '#000'}
                          formatter={(value: number) => `${value} kgs`}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Stock Movement Graph */}
            <Grid item xs={12}>
              <Card 
                elevation={3}
                sx={{ 
                  bgcolor: isDarkMode ? 'background.paper' : '#fff',
                  border: isDarkMode ? 1 : 0,
                  borderColor: 'divider'
                }}
              >
                <CardContent>
                  <Typography 
                    variant="h6" 
                    color={isDarkMode ? '#90CAF9' : 'primary'} 
                    gutterBottom
                  >
                    Stock Movement History
                  </Typography>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart 
                      data={details?.stockMovements}
                      margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                    >
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke={isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#ccc'}
                      />
                      <XAxis 
                        dataKey="date"
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        interval={0}
                        tick={{ fill: isDarkMode ? '#fff' : '#666' }}
                        tickFormatter={(value: string) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis 
                        tick={{ fill: isDarkMode ? '#fff' : '#666' }}
                        domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.2)]}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: isDarkMode ? '#424242' : '#fff',
                          border: '1px solid #666',
                          color: isDarkMode ? '#fff' : '#000'
                        }}
                        labelFormatter={(value: string) => new Date(value).toLocaleDateString()}
                        formatter={(value: number) => [`${value} kgs`, 'Stock']}
                      />
                      <Legend 
                        wrapperStyle={{
                          color: isDarkMode ? '#fff' : '#000'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="stock" 
                        stroke={isDarkMode ? '#90CAF9' : '#82ca9d'} 
                        name="Stock Level (kgs)"
                        dot={{ r: 3, fill: isDarkMode ? '#90CAF9' : '#82ca9d' }}
                        activeDot={{ r: 6, fill: isDarkMode ? '#90CAF9' : '#82ca9d' }}
                      >
                        <LabelList 
                          dataKey="stock" 
                          position="top"
                          fill={isDarkMode ? '#fff' : '#000'}
                          formatter={(value: number) => `${value} kgs`}
                        />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Transaction History Table */}
            <Grid item xs={12}>
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h6" color="primary" gutterBottom>
                    Transaction History
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell align="right">Quantity</TableCell>
                          <TableCell>Notes</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {details?.transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              {new Date(transaction.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Typography 
                                color={transaction.type === 'IN' ? 'success.main' : 'error.main'}
                                fontWeight="medium"
                              >
                                {transaction.type}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{transaction.quantity} kgs</TableCell>
                            <TableCell>{transaction.notes}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailsDialog; 