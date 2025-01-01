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
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import { api } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Legend 
} from 'recharts';

interface Transaction {
  id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  date: string;
  notes: string;
  balance: number;
}

interface ProductDetails {
  supplierCode: string;
  supplier: string;
  artisCodes: string;
  currentStock: number;
  transactions: Transaction[];
}

interface Product {
  id: string;
  artisCode: string;
  name: string;
  supplierCode?: string;
  supplier?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  productId: string;
}

interface ChartData {
  date: string;
  balance: number;
  type?: 'IN' | 'OUT';
  quantity?: number;
  notes?: string;
}

const aggregateMonthlyConsumption = (transactions: any[]) => {
  const monthlyData = transactions.reduce((acc: any, t: any) => {
    if (t.type === 'OUT') {
      const month = new Date(t.date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      acc[month] = (acc[month] || 0) + Number(t.quantity);
    }
    return acc;
  }, {});

  return Object.entries(monthlyData).map(([month, amount]) => ({
    month,
    amount
  }));
};

const ProductDetailsDialog: React.FC<Props> = ({ open, onClose, productId }) => {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<ProductDetails | null>(null);
  const { isDarkMode } = useTheme();

  useEffect(() => {
    if (open && productId) {
      fetchProductDetails();
    }
  }, [open, productId]);

  const calculateStockFromTransactions = (transactions: Transaction[]): number => {
    // Sort transactions by date (oldest first)
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate running total starting from 0
    return sortedTransactions.reduce((total, transaction) => {
      if (transaction.type === 'IN') {
        return total + Number(transaction.quantity);
      } else {
        return total - Number(transaction.quantity);
      }
    }, 0);
  };

  const fetchProductDetails = async () => {
    setLoading(true);
    try {
      // Get all products first
      const allProductsRes = await api.get('/products');
      const products: Product[] = allProductsRes.data;
      
      console.log('ProductDetails Debug:', {
        searchingForId: productId,
        totalProducts: products.length,
        firstFewProducts: products.slice(0, 3).map(p => ({
          id: p.id,
          artisCode: p.artisCode,
          supplierCode: p.supplierCode
        }))
      });
      
      // Find main product and related products
      const mainProduct = products.find((p: Product) => p.id === productId);
      
      if (!mainProduct) {
        console.error('Product not found:', {
          searchId: productId,
          availableIds: products.map(p => p.id).slice(0, 5)
        });
        throw new Error('Product not found');
      }

      const relatedProducts = products.filter((p: Product) => 
        p.supplierCode === mainProduct.supplierCode && 
        p.supplier === mainProduct.supplier
      );
      console.log('ProductDetails - Related Products:', relatedProducts);

      // Get transactions
      const transactionsRes = await api.get(`/inventory/transactions/${mainProduct.id}`);
      console.log('ProductDetails - Transaction Response:', transactionsRes.data);

      // Calculate current stock from transactions
      const calculatedStock = calculateStockFromTransactions(transactionsRes.data.transactions || []);
      console.log('ProductDetails - Calculated Stock:', calculatedStock);

      setDetails({
        supplierCode: mainProduct.supplierCode || '',
        supplier: mainProduct.supplier || '',
        artisCodes: relatedProducts.map(p => p.artisCode).sort().join(' / '),
        currentStock: calculatedStock,
        transactions: transactionsRes.data.transactions || []
      });
    } catch (error) {
      console.error('Error fetching product details:', {
        error,
        productId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      setDetails(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: isDarkMode ? 'background.paper' : '#fff',
          minHeight: '80vh'
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider',
          pb: 2
        }}
      >
        <Typography variant="h5" component="div">
          <Box component="span" sx={{ fontWeight: 'bold', color: isDarkMode ? '#90CAF9' : 'primary.main' }}>
            {details?.supplierCode}
          </Box>
          <Box component="span" sx={{ ml: 2, color: isDarkMode ? 'grey.400' : 'text.secondary' }}>
            {details?.artisCodes}
          </Box>
        </Typography>
        <Typography variant="subtitle1" color={isDarkMode ? 'grey.400' : 'text.secondary'} sx={{ mt: 1 }}>
          {details?.supplier}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            {/* Current Stock and Monthly Consumption Section */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {/* Current Stock */}
              <Grid item xs={12} md={4}>
                <Card elevation={3}>
                  <CardContent>
                    <Typography variant="h6" color={isDarkMode ? '#90CAF9' : 'primary'} gutterBottom>
                      Current Stock
                    </Typography>
                    <Typography variant="h3" color={isDarkMode ? '#fff' : 'inherit'}>
                      {details?.currentStock}
                      <Typography 
                        component="span" 
                        variant="h5" 
                        color={isDarkMode ? 'grey.400' : 'text.secondary'}
                        sx={{ ml: 1 }}
                      >
                        kgs
                      </Typography>
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Monthly Consumption Chart */}
              <Grid item xs={12} md={8}>
                <Card elevation={3}>
                  <CardContent>
                    <Typography variant="h6" color="primary" gutterBottom>
                      Monthly Consumption
                    </Typography>
                    <Box sx={{ height: 200, width: '100%' }}>
                      <ResponsiveContainer>
                        <BarChart
                          data={aggregateMonthlyConsumption(details?.transactions || [])}
                          margin={{ top: 30, right: 30, left: 20, bottom: 5 }}
                        >
                          <defs>
                            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={isDarkMode ? '#90CAF9' : '#1976d2'} stopOpacity={0.8} />
                              <stop offset="95%" stopColor={isDarkMode ? '#90CAF9' : '#1976d2'} stopOpacity={0.2} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                          <XAxis 
                            dataKey="month" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: isDarkMode ? '#fff' : '#666' }}
                          />
                          <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: isDarkMode ? '#fff' : '#666' }}
                          />
                          <Bar 
                            dataKey="amount" 
                            fill="url(#colorGradient)"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={50}
                            label={{
                              position: 'top',
                              fill: isDarkMode ? '#fff' : '#1976d2',
                              fontSize: 14,
                              fontWeight: 600,
                              dy: -6,
                              formatter: (value: number) => `${value.toFixed(1)} kgs`
                            }}
                            onMouseEnter={(data, index) => {
                              const bars = document.querySelectorAll('.recharts-bar-rectangle');
                              const labels = document.querySelectorAll('.recharts-bar-label');
                              if (bars[index] && labels[index]) {
                                bars[index].setAttribute('fill-opacity', '0.8');
                                labels[index].setAttribute('font-size', '16');
                                labels[index].setAttribute('font-weight', 'bold');
                                labels[index].setAttribute('fill', isDarkMode ? '#90CAF9' : '#1976d2');
                              }
                            }}
                            onMouseLeave={(data, index) => {
                              const bars = document.querySelectorAll('.recharts-bar-rectangle');
                              const labels = document.querySelectorAll('.recharts-bar-label');
                              if (bars[index] && labels[index]) {
                                bars[index].setAttribute('fill-opacity', '1');
                                labels[index].setAttribute('font-size', '12');
                                labels[index].setAttribute('font-weight', '500');
                                labels[index].setAttribute('fill', isDarkMode ? '#fff' : '#666');
                              }
                            }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Stock Movement Chart */}
            <Card elevation={3} sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  Stock Movement
                </Typography>
                <Box sx={{ height: 300, width: '100%' }}>
                  <ResponsiveContainer>
                    <LineChart
                      data={details?.transactions
                        .slice() // Create a copy to avoid mutating original array
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map(t => ({
                          date: new Date(t.date).toLocaleDateString(),
                          balance: t.balance,
                          type: t.type,
                          quantity: t.quantity,
                          notes: t.notes
                        }))}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: isDarkMode ? '#333' : '#fff',
                          border: '1px solid #ccc'
                        }}
                        formatter={(value: any, name: string) => [
                          `${value} kgs`, 
                          name === 'balance' ? 'Balance' : name
                        ]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="balance" 
                        stroke={isDarkMode ? '#90CAF9' : '#1976d2'} 
                        strokeWidth={2}
                        dot={(props: any) => {
                          const { cx, cy, payload } = props;
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={6}
                              fill={payload.type === 'IN' ? '#4caf50' : '#f44336'}
                              stroke="none"
                            />
                          );
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>

            {/* Transaction History Table */}
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  Transaction History
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell width="50">#</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell align="right">Quantity</TableCell>
                        <TableCell>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {details?.transactions.map((transaction, index) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{index + 1}</TableCell>
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
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailsDialog; 