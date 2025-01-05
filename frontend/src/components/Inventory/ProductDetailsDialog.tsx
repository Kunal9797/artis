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
import { productApi, inventoryApi } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Legend, ComposedChart, ReferenceLine 
} from 'recharts';
import { Transaction, ProductDetails } from '../../types/transaction';

interface Product {
  id: string;
  artisCodes: string[];
  name: string;
  supplierCode?: string;
  supplier?: string;
  avgConsumption: number;
  currentStock: number;
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

const aggregateMonthlyConsumption = (transactions: Transaction[]) => {
  const monthlyData = transactions.reduce((acc: Record<string, number>, t: Transaction) => {
    if (t.type === 'OUT') {
      const month = new Date(t.date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      acc[month] = (acc[month] || 0) + Number(t.quantity);
    }
    return acc;
  }, {});

  const sortedEntries = Object.entries(monthlyData)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
  
  const monthlyValues = Object.values(monthlyData);
  const averageConsumption = monthlyValues.length > 0 
    ? monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length 
    : 0;

  return sortedEntries.map(([month, amount], index, array) => {
    const prevAmount = index > 0 ? Number(array[index - 1][1]) : Number(amount);
    const percentChange = prevAmount !== 0 
      ? ((Number(amount) - prevAmount) / prevAmount * 100).toFixed(1)
      : '0';

    return {
      month,
      amount: Number(amount),
      average: Number(averageConsumption.toFixed(2)),
      percentChange: Number(percentChange)
    };
  });
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
    try {
      setLoading(true);
      const [productResponse, transactionsResponse] = await Promise.all([
        productApi.getProduct(productId),
        inventoryApi.getProductTransactions(productId)
      ]);
      
      setDetails({
        supplierCode: productResponse.data.supplierCode || '',
        supplier: productResponse.data.supplier || '',
        artisCodes: productResponse.data.artisCodes.join(' / '),
        currentStock: productResponse.data.currentStock,
        transactions: transactionsResponse.data.transactions || []
      });
    } catch (error) {
      console.error('Error fetching product details:', error);
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
                        <ComposedChart
                          data={aggregateMonthlyConsumption(details?.transactions || [])}
                          margin={{ top: 40, right: 120, left: 20, bottom: 5 }}
                          height={300}
                        >
                          <CartesianGrid 
                            strokeDasharray="3 3" 
                            stroke={isDarkMode ? '#444' : '#eee'} 
                            vertical={false}
                          />
                          <XAxis 
                            dataKey="month" 
                            tick={{ fill: isDarkMode ? '#fff' : '#666' }}
                            axisLine={{ stroke: isDarkMode ? '#666' : '#888' }}
                            tickLine={false}
                          />
                          <YAxis 
                            tick={{ fill: isDarkMode ? '#fff' : '#666' }}
                            axisLine={{ stroke: isDarkMode ? '#666' : '#888' }}
                            tickLine={false}
                          />
                          <Bar 
                            dataKey="amount" 
                            fill={isDarkMode ? '#B39DDB' : '#9575CD'} 
                            name="Monthly Consumption"
                            barSize={60}
                            radius={[4, 4, 0, 0]}
                            opacity={0.8}
                            label={{
                              position: 'top',
                              content: (props: any) => {
                                const { value, x, y } = props;
                                return (
                                  <g transform={`translate(${x},${y})`}>
                                    <text
                                      x={30}
                                      y={-10}
                                      fill={isDarkMode ? '#fff' : '#333'}
                                      textAnchor="middle"
                                      fontSize={14}
                                      fontWeight="600"
                                    >
                                      {`${value} kgs`}
                                    </text>
                                  </g>
                                );
                              }
                            }}
                          />
                          <ReferenceLine
                            y={aggregateMonthlyConsumption(details?.transactions || [])[0]?.average || 0}
                            stroke="#FF7043"
                            strokeDasharray="5 5"
                            label={{
                              value: `Avg: ${aggregateMonthlyConsumption(details?.transactions || [])[0]?.average || 0} kgs`,
                              position: 'right',
                              fill: '#FF7043',
                              fontSize: 14
                            }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            formatter={(value) => {
                              return <span style={{ color: isDarkMode ? '#fff' : '#666', fontSize: '14px' }}>{value}</span>;
                            }}
                          />
                        </ComposedChart>
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