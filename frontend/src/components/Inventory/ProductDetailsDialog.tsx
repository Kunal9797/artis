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
  useMediaQuery,
  useTheme as useMuiTheme,
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
  const monthOrder: { [key: string]: number } = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };

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

  // Convert to array and sort using month order
  const sortedEntries = Object.entries(monthlyData)
    .map(([month, amount]) => ({
      month,
      amount,
      date: new Date(month)
    }))
    .sort((a, b) => {
      const [monthA, yearA] = a.month.split(' ');
      const [monthB, yearB] = b.month.split(' ');
      
      if (yearA !== yearB) {
        return Number(yearA) - Number(yearB);
      }
      
      return monthOrder[monthA as keyof typeof monthOrder] - monthOrder[monthB as keyof typeof monthOrder];
    })
    .map(({ month, amount }) => [month, amount]);

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

const MobileConsumptionChart: React.FC<{ data: any[] }> = ({ data }) => {
  const { isDarkMode } = useTheme();
  
  return (
    <Box sx={{ width: '100%', height: 300, mt: 2 }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          margin={{ top: 40, right: 10, left: -20, bottom: 20 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false}
            stroke={isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 
          />
          <XAxis 
            dataKey="month" 
            tick={(props) => {
              const { x, y, payload } = props;
              return (
                <g transform={`translate(${x},${y})`}>
                  <text
                    x={0}
                    y={0}
                    dy={16}
                    dx={-10}
                    textAnchor="end"
                    fill={isDarkMode ? '#fff' : '#666'}
                    fontSize={11}
                    transform="rotate(-45)"
                  >
                    {payload.value}
                  </text>
                </g>
              );
            }}
            tickLine={false}
            axisLine={{ stroke: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }}
            interval={0}
            height={60}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }}
            tickFormatter={(value) => `${value}kg`}
          />
          <Bar 
            dataKey="amount"
            fill={isDarkMode ? '#7E57C2' : '#5E35B1'}
            radius={[4, 4, 0, 0]}
            label={{
              position: 'top',
              content: (props: any) => {
                const { value, x, y } = props;
                return (
                  <text
                    x={x + props.width / 2}
                    y={y - 10}
                    fill={isDarkMode ? '#fff' : '#666'}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight="600"
                  >
                    {value}
                  </text>
                );
              }
            }}
          />
          <ReferenceLine
            y={data[0]?.average || 0}
            stroke="#FF7043"
            strokeDasharray="3 3"
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

const ProductDetailsDialog: React.FC<Props> = ({ open, onClose, productId }) => {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<ProductDetails | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const { isDarkMode } = useTheme();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

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
      
      // Store the full product data
      setProduct(productResponse.data);
      
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
      setProduct(null);
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
            {/* Stats Section */}
            {isMobile ? (
              <>
                {/* Stat Bubbles */}
                <Card elevation={3} sx={{ mb: 4 }}>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Card 
                          elevation={3}
                          sx={{ 
                            borderRadius: 2,
                            bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                          }}
                        >
                          <CardContent sx={{ p: 2, textAlign: 'center' }}>
                            <Typography 
                              variant="body2" 
                              color="textSecondary"
                              sx={{ mb: 1 }}
                            >
                              Current Stock
                            </Typography>
                            <Typography 
                              variant="h5" 
                              sx={{ fontWeight: 600 }}
                            >
                              {Math.floor(details?.currentStock || 0)}
                              <Typography 
                                component="span" 
                                variant="caption"
                                color="textSecondary"
                                sx={{ ml: 0.5 }}
                              >
                                kgs
                              </Typography>
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={6}>
                        <Card 
                          elevation={3}
                          sx={{ 
                            borderRadius: 2,
                            bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                          }}
                        >
                          <CardContent sx={{ p: 2, textAlign: 'center' }}>
                            <Typography 
                              variant="body2" 
                              color="textSecondary"
                              sx={{ mb: 1 }}
                            >
                              Avg Consumption
                            </Typography>
                            <Typography 
                              variant="h5"
                              sx={{ fontWeight: 600 }}
                            >
                              {product ? Number(product.avgConsumption).toFixed(2) : '0.00'}
                              <Typography 
                                component="span" 
                                variant="caption"
                                color="textSecondary"
                                sx={{ ml: 0.5 }}
                              >
                                kgs
                              </Typography>
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Monthly Consumption Chart */}
                <Card elevation={3} sx={{ mb: 4 }}>
                  <CardContent>
                    <Typography variant="h6" color="primary" gutterBottom>
                      Monthly Consumption
                    </Typography>
                    <MobileConsumptionChart data={aggregateMonthlyConsumption(details?.transactions || [])} />
                  </CardContent>
                </Card>
              </>
            ) : (
              <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* Current Stock */}
                <Grid item xs={12} md={4}>
                  <Card elevation={3}>
                    <CardContent>
                      <Typography variant="h6" color={isDarkMode ? '#90CAF9' : 'primary'} gutterBottom>
                        Current Stock
                      </Typography>
                      <Typography variant="h3" color={isDarkMode ? '#fff' : 'inherit'}>
                        {Math.floor(details?.currentStock || 0)}
                        <Typography 
                          component="span" 
                          variant="h5" 
                          color={isDarkMode ? 'grey.400' : 'text.secondary'}
                          sx={{ ml: 1 }}
                        >
                          kgs
                        </Typography>
                      </Typography>
                      <Typography 
                        variant="h6" 
                        color={isDarkMode ? 'grey.400' : 'text.secondary'}
                        sx={{ mt: 2 }}
                      >
                        Avg Consumption: {product ? Number(product.avgConsumption).toFixed(2) : '0.00'} kgs/month
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
                      {isMobile ? (
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                          <Grid item xs={6}>
                            <Card 
                              elevation={3}
                              sx={{ 
                                borderRadius: 2,
                                bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'background.paper'
                              }}
                            >
                              <CardContent sx={{ p: 2 }}>
                                <Typography 
                                  variant="subtitle2" 
                                  color="textSecondary"
                                  sx={{ mb: 1 }}
                                >
                                  Current Stock
                                </Typography>
                                <Typography 
                                  variant="h6" 
                                  color={isDarkMode ? '#fff' : 'inherit'}
                                  sx={{ fontWeight: 600 }}
                                >
                                  {Math.floor(details?.currentStock || 0)}
                                  <Typography 
                                    component="span" 
                                    variant="caption"
                                    color="textSecondary"
                                    sx={{ ml: 0.5 }}
                                  >
                                    kgs
                                  </Typography>
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                          <Grid item xs={6}>
                            <Card 
                              elevation={3}
                              sx={{ 
                                borderRadius: 2,
                                bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'background.paper'
                              }}
                            >
                              <CardContent sx={{ p: 2 }}>
                                <Typography 
                                  variant="subtitle2" 
                                  color="textSecondary"
                                  sx={{ mb: 1 }}
                                >
                                  Avg Consumption
                                </Typography>
                                <Typography 
                                  variant="h6" 
                                  color={isDarkMode ? '#fff' : 'inherit'}
                                  sx={{ fontWeight: 600 }}
                                >
                                  {product ? Number(product.avgConsumption).toFixed(2) : '0.00'}
                                  <Typography 
                                    component="span" 
                                    variant="caption"
                                    color="textSecondary"
                                    sx={{ ml: 0.5 }}
                                  >
                                    kgs
                                  </Typography>
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        </Grid>
                      ) : (
                        <ResponsiveContainer width="100%" height={300}>
                          <ComposedChart
                            data={aggregateMonthlyConsumption(details?.transactions || [])}
                            margin={{ top: 40, right: 120, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid 
                              strokeDasharray="3 3" 
                              stroke={isDarkMode ? '#444' : '#eee'} 
                              vertical={false}
                            />
                            <XAxis 
                              dataKey="month" 
                              tick={{ 
                                fontSize: 12,
                                fill: isDarkMode ? '#fff' : '#666',
                                textAnchor: 'middle',
                              }}
                              tickLine={false}
                              axisLine={{ stroke: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }}
                              interval={0}
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
                              y={product ? Number(product.avgConsumption) : 0}
                              stroke="#FF7043"
                              strokeDasharray="5 5"
                              label={{
                                value: `Avg: ${product ? Number(product.avgConsumption).toFixed(2) : '0.00'} kgs`,
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
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

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