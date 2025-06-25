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
  Chip,
  Stack,
  Divider,
  IconButton,
  Badge,
} from '@mui/material';
import { productApi, inventoryApi } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Legend, ComposedChart, ReferenceLine,
  AreaChart, Area 
} from 'recharts';
import { Transaction, ProductDetails } from '../../types/transaction';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import InventoryIcon from '@mui/icons-material/Inventory';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import HistoryIcon from '@mui/icons-material/History';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';

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

const aggregateMonthlyConsumption = (transactions: Transaction[], limitToSixMonths: boolean = false) => {
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
  let sortedEntries = Object.entries(monthlyData)
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
    });

  // Limit to last 6 months if requested
  if (limitToSixMonths && sortedEntries.length > 6) {
    sortedEntries = sortedEntries.slice(-6);
  }

  const mappedEntries = sortedEntries.map(({ month, amount }) => [month, amount]);

  const monthlyValues = Object.values(monthlyData);
  const averageConsumption = monthlyValues.length > 0 
    ? monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length 
    : 0;

  return mappedEntries.map(([month, amount], index, array) => {
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

// New function to calculate last 6 months average consumption
const calculateLast6MonthsAverage = (transactions: Transaction[]) => {
  const monthOrder: { [key: string]: number } = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };

  // Filter only OUT transactions and group by month
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

  // Convert to array and sort chronologically
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
    });

  // Take only last 6 months (or fewer if less data available)
  const last6Months = sortedEntries.slice(-6);
  
  if (last6Months.length === 0) {
    return { average: 0, monthsCount: 0, subtitle: 'No consumption data' };
  }

  const totalConsumption = last6Months.reduce((sum, entry) => sum + entry.amount, 0);
  const average = totalConsumption / last6Months.length;
  
  return {
    average: Number(average.toFixed(1)),
    monthsCount: last6Months.length,
    subtitle: `Last ${last6Months.length} month${last6Months.length !== 1 ? 's' : ''}`
  };
};

const CompactStatsCard: React.FC<{ 
  title: string; 
  value: string | number; 
  unit: string; 
  icon: React.ReactNode; 
  trend?: number;
  subtitle?: string;
  color?: string;
}> = ({ title, value, unit, icon, trend, subtitle, color = '#1976d2' }) => {
  const { isDarkMode } = useTheme();
  
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend > 5) return <TrendingUpIcon sx={{ color: '#4caf50', fontSize: 12 }} />;
    if (trend < -5) return <TrendingDownIcon sx={{ color: '#f44336', fontSize: 12 }} />;
    return <TrendingFlatIcon sx={{ color: '#ff9800', fontSize: 12 }} />;
  };

  return (
    <Card 
      elevation={0}
      sx={{ 
        borderRadius: 2,
        bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,1)',
        border: 1,
        borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
        position: 'relative',
        overflow: 'hidden',
        height: 'auto',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: color,
        },
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <Box sx={{ 
              p: 0.5, 
              borderRadius: 1, 
              bgcolor: `${color}12`,
              color: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {React.cloneElement(icon as React.ReactElement, { sx: { fontSize: 16 } })}
            </Box>
            <Typography 
              variant="caption" 
              color="textSecondary"
              sx={{ fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 0.3 }}
            >
              {title}
            </Typography>
          </Box>
          {getTrendIcon()}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.3, mb: 0.3 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 700,
              color: isDarkMode ? '#fff' : '#1a1a1a',
              lineHeight: 1,
              fontSize: '1.25rem'
            }}
          >
            {value}
          </Typography>
          <Typography 
            variant="caption"
            color="textSecondary"
            sx={{ fontWeight: 500, fontSize: '0.7rem' }}
          >
            {unit}
          </Typography>
        </Box>
        {subtitle && (
          <Typography 
            variant="caption" 
            color="textSecondary"
            sx={{ 
              opacity: 0.7, 
              fontSize: '0.6rem',
              fontWeight: 500,
              lineHeight: 1
            }}
          >
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

const ModernConsumptionChart: React.FC<{ 
  data: any[], 
  showAllTime: boolean,
  onToggleTimeRange: () => void 
}> = ({ data, showAllTime, onToggleTimeRange }) => {
  const { isDarkMode } = useTheme();
  
  // Filter data based on toggle
  const chartData = showAllTime ? data : data.slice(-6);
  
  return (
    <Box sx={{ width: '100%' }}>
      {/* Toggle Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            bgcolor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            borderRadius: 3,
            padding: '4px',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: '4px',
              left: showAllTime ? '50%' : '4px',
              width: 'calc(50% - 4px)',
              height: 'calc(100% - 8px)',
              bgcolor: isDarkMode ? '#1976d2' : '#1976d2',
              borderRadius: 2,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
            }}
          />
          <Typography
            variant="caption"
            onClick={onToggleTimeRange}
            sx={{
              px: 2,
              py: 1,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.7rem',
              color: !showAllTime 
                ? '#fff' 
                : isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
              zIndex: 1,
              position: 'relative',
              transition: 'color 0.3s ease',
              userSelect: 'none',
            }}
          >
            6 MONTHS
          </Typography>
          <Typography
            variant="caption"
            onClick={onToggleTimeRange}
            sx={{
              px: 2,
              py: 1,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.7rem',
              color: showAllTime 
                ? '#fff' 
                : isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
              zIndex: 1,
              position: 'relative',
              transition: 'color 0.3s ease',
              userSelect: 'none',
            }}
          >
            ALL TIME
          </Typography>
        </Box>
      </Box>

      {/* Enhanced Chart */}
      <Box sx={{ width: '100%', height: 280, position: 'relative' }}>
        <ResponsiveContainer>
          <BarChart
            data={chartData}
            margin={{ top: 30, right: 15, left: 5, bottom: 40 }}
            barCategoryGap="15%"
          >
            <defs>
              <linearGradient id="modernBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1976d2" stopOpacity={1} />
                <stop offset="100%" stopColor="#1565c0" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="2 2" 
              vertical={false}
              stroke={isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} 
            />
            <XAxis 
              dataKey="month" 
              tick={{ 
                fontSize: 9, 
                fill: isDarkMode ? '#a0a0a0' : '#666',
                fontWeight: 500
              }}
              tickLine={false}
              axisLine={false}
              interval={0}
              height={50}
              angle={-30}
              textAnchor="end"
            />
            <YAxis 
              tick={{ 
                fontSize: 9, 
                fill: isDarkMode ? '#a0a0a0' : '#666',
                fontWeight: 500
              }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}kg`}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                border: 'none',
                borderRadius: 8,
                boxShadow: isDarkMode 
                  ? '0 8px 24px rgba(0,0,0,0.4)' 
                  : '0 8px 24px rgba(0,0,0,0.12)',
                fontSize: 12,
                padding: '8px 12px',
              }}
              formatter={(value: any) => [
                <span style={{ fontWeight: 600, color: '#1976d2' }}>{value} kg</span>, 
                'Consumption'
              ]}
              labelStyle={{ 
                color: isDarkMode ? '#fff' : '#333',
                fontWeight: 600,
                fontSize: '11px'
              }}
              cursor={{
                fill: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                radius: 2
              }}
            />
            <Bar 
              dataKey="amount"
              fill="url(#modernBarGradient)"
              radius={[6, 6, 2, 2]}
              maxBarSize={45}
              label={{
                position: 'top',
                content: (props: any) => {
                  const { value, x, y, width } = props;
                  if (value === 0) return null;
                  return (
                    <text
                      x={x + width / 2}
                      y={y - 8}
                      fill={isDarkMode ? '#90caf9' : '#1976d2'}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight="600"
                    >
                      {value}
                    </text>
                  );
                }
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

const ModernStockMovementChart: React.FC<{ data: any[] }> = ({ data }) => {
  const { isDarkMode } = useTheme();
  
  // Prepare data with better formatting for mobile
  const chartData = data
    .slice() 
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-15) // Show last 15 transactions for better readability
    .map((t, index) => ({
      ...t,
      shortDate: new Date(t.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      index: index + 1
    }));
  
  return (
    <Box sx={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <AreaChart
          data={chartData}
          margin={{ top: 25, right: 20, left: 10, bottom: 45 }}
        >
          <defs>
            <linearGradient id="stockAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2E7D32" stopOpacity={0.4} />
              <stop offset="50%" stopColor="#388E3C" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#4CAF50" stopOpacity={0.05} />
            </linearGradient>
            <filter id="stockGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid 
            strokeDasharray="2 4" 
            stroke={isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} 
            vertical={false}
          />
          <XAxis 
            dataKey="shortDate"
            tick={{ 
              fontSize: 10, 
              fill: isDarkMode ? '#a0a0a0' : '#666',
              fontWeight: 500
            }}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            tick={{ 
              fontSize: 10, 
              fill: isDarkMode ? '#a0a0a0' : '#666',
              fontWeight: 500
            }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}kg`}
            width={50}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
              border: 'none',
              borderRadius: 12,
              boxShadow: isDarkMode 
                ? '0 10px 40px rgba(0,0,0,0.5)' 
                : '0 10px 40px rgba(0,0,0,0.15)',
              fontSize: 13,
              padding: '12px 16px',
            }}
            formatter={(value: any, name: string, props: any) => [
              <span style={{ fontWeight: 600, color: '#2E7D32' }}>{value} kg</span>, 
              'Stock Balance',
            ]}
            labelFormatter={(label: string, payload: any) => {
              if (payload && payload[0]) {
                const data = payload[0].payload;
                const typeColor = data.type === 'IN' ? '#4caf50' : '#f44336';
                const typeSymbol = data.type === 'IN' ? '↗' : '↘';
                return (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{label}</div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      fontSize: '12px'
                    }}>
                      <span style={{ color: typeColor, fontWeight: 600 }}>
                        {typeSymbol} {data.type}
                      </span>
                      <span style={{ color: typeColor, fontWeight: 600 }}>
                        {data.quantity}kg
                      </span>
                    </div>
                  </div>
                );
              }
              return label;
            }}
            labelStyle={{ color: isDarkMode ? '#fff' : '#333' }}
            cursor={{
              stroke: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              strokeWidth: 1,
              strokeDasharray: '4 4'
            }}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#2E7D32"
            strokeWidth={3}
            fill="url(#stockAreaGradient)"
            filter="url(#stockGlow)"
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={6}
                  fill={payload.type === 'IN' ? '#4caf50' : '#f44336'}
                  stroke="#fff"
                  strokeWidth={2}
                  style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                    cursor: 'pointer'
                  }}
                />
              );
            }}
            activeDot={{
              r: 8,
              fill: '#2E7D32',
              stroke: '#fff',
              strokeWidth: 3,
              style: {
                filter: 'drop-shadow(0 4px 8px rgba(46, 125, 50, 0.3))'
              }
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};

const ModernTransactionCard: React.FC<{ transaction: Transaction; index: number }> = ({ 
  transaction, 
  index 
}) => {
  const { isDarkMode } = useTheme();
  const isInTransaction = transaction.type === 'IN';
  const transactionColor = isInTransaction ? '#4caf50' : '#f44336';
  const transactionIcon = isInTransaction ? '↗' : '↘';
  
  return (
    <Card 
      elevation={0}
      sx={{ 
        mb: 1,
        borderRadius: 2,
        bgcolor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)',
        border: 1,
        borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          background: transactionColor,
        }
      }}
    >
      <CardContent sx={{ p: 1.5, pl: 2, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1.5,
                bgcolor: `${transactionColor}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: transactionColor,
                fontWeight: 'bold',
                fontSize: '14px',
              }}
            >
              {transactionIcon}
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.3, color: 'text.primary', fontSize: '0.8rem' }}>
                {new Date(transaction.date).toLocaleDateString('en', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Typography>
              <Typography 
                variant="caption" 
                color="textSecondary"
                sx={{ 
                  fontSize: '0.65rem',
                  fontWeight: 500,
                  opacity: 0.8
                }}
              >
                {transaction.notes || 'No additional notes'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
              <Chip
                label={`#${index + 1}`}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  '& .MuiChip-label': { px: 0.8 }
                }}
              />
              <Chip
                label={transaction.type}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  bgcolor: `${transactionColor}10`,
                  color: transactionColor,
                  '& .MuiChip-label': { px: 0.8 }
                }}
              />
            </Box>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 700,
                color: transactionColor,
                fontSize: '0.95rem',
                lineHeight: 1
              }}
            >
              {isInTransaction ? '+' : '-'}{transaction.quantity}
              <Typography 
                component="span" 
                variant="caption"
                sx={{ 
                  ml: 0.3, 
                  fontWeight: 500,
                  color: 'text.secondary',
                  fontSize: '0.65rem'
                }}
              >
                kg
              </Typography>
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const ProductDetailsDialog: React.FC<Props> = ({ open, onClose, productId }) => {
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<ProductDetails | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [showAllTimeChart, setShowAllTimeChart] = useState(false);
  const { isDarkMode } = useTheme();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  // Calculate average consumption from last 6 months of transactions
  const avgConsumptionData = details?.transactions 
    ? calculateLast6MonthsAverage(details.transactions)
    : { average: 0, monthsCount: 0, subtitle: 'No consumption data' };

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
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          bgcolor: isDarkMode ? 'background.paper' : '#fff',
          minHeight: isMobile ? '100vh' : '80vh',
          borderRadius: isMobile ? 0 : 2,
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          borderBottom: 1, 
          borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          pb: 3,
          pt: 3,
          position: 'relative',
          background: isDarkMode 
            ? 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(25, 118, 210, 0.02) 100%)'
            : 'linear-gradient(135deg, rgba(25, 118, 210, 0.02) 0%, rgba(25, 118, 210, 0.01) 100%)'
        }}
      >
        {isMobile && (
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 12,
              top: 12,
              color: 'text.secondary',
              bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              '&:hover': {
                bgcolor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                transform: 'scale(1.05)'
              },
              transition: 'all 0.2s ease',
              width: 36,
              height: 36
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
        
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: isDarkMode ? 'rgba(25, 118, 210, 0.1)' : 'rgba(25, 118, 210, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 2,
              borderColor: isDarkMode ? 'rgba(25, 118, 210, 0.3)' : 'rgba(25, 118, 210, 0.2)',
              flexShrink: 0
            }}
          >
            <InventoryIcon 
              sx={{ 
                fontSize: 24, 
                color: isDarkMode ? '#90CAF9' : 'primary.main'
              }} 
            />
          </Box>
          
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography 
              variant={isMobile ? "h6" : "h5"} 
              component="div"
              sx={{ 
                fontWeight: 700,
                mb: 0.5,
                color: isDarkMode ? '#fff' : '#1a1a1a',
                lineHeight: 1.2
              }}
            >
              <Box 
                component="span" 
                sx={{ 
                  color: isDarkMode ? '#90CAF9' : 'primary.main',
                  mr: 1.5
                }}
              >
                {details?.supplierCode}
              </Box>
              <Box 
                component="span" 
                sx={{ 
                  color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                  fontWeight: 500,
                  fontSize: isMobile ? '0.9rem' : '1rem'
                }}
              >
                {details?.artisCodes}
              </Box>
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={details?.supplier || 'Unknown Supplier'}
                size="small"
                sx={{
                  bgcolor: isDarkMode ? 'rgba(144, 202, 249, 0.1)' : 'rgba(25, 118, 210, 0.1)',
                  color: isDarkMode ? '#90caf9' : '#1976d2',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  height: 24,
                  '& .MuiChip-label': { px: 1 }
                }}
              />
              <Chip
                label={`${details?.transactions?.length || 0} transactions`}
                size="small"
                variant="outlined"
                sx={{
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                  color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                  fontWeight: 500,
                  fontSize: '0.7rem',
                  height: 24,
                  '& .MuiChip-label': { px: 1 }
                }}
              />
            </Box>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: isMobile ? 2 : 3 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ mt: isMobile ? 1 : 2 }}>
            {/* Stats Section */}
            {isMobile ? (
              <>
                {/* Enhanced Mobile Stats */}
                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <CompactStatsCard
                      title="Current Stock"
                      value={Math.floor(details?.currentStock || 0)}
                      unit="kg"
                      icon={<InventoryIcon />}
                      subtitle={`${Math.ceil((details?.currentStock || 0) / (avgConsumptionData.average || 1))} months supply`}
                      color="#2E7D32"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <CompactStatsCard
                      title="Avg Consumption"
                      value={avgConsumptionData.average}
                      unit="kg/mo"
                      icon={<ShowChartIcon />}
                      subtitle={avgConsumptionData.subtitle}
                      color="#1976d2"
                    />
                  </Grid>
                </Grid>

                {/* Monthly Consumption Chart */}
                <Card 
                  elevation={0} 
                  sx={{ 
                    mb: 2,
                    borderRadius: 2.5,
                    bgcolor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                    border: 1,
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                      <ShowChartIcon sx={{ mr: 1, color: 'primary.main', fontSize: 18 }} />
                      <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                        Monthly Consumption
                      </Typography>
                      <Chip 
                        label={showAllTimeChart ? "All Time" : "Last 6 months"} 
                        size="small" 
                        sx={{ 
                          ml: 'auto',
                          bgcolor: isDarkMode ? 'rgba(144, 202, 249, 0.1)' : 'rgba(25, 118, 210, 0.1)',
                          color: isDarkMode ? '#90caf9' : '#1976d2',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          height: 22
                        }} 
                      />
                    </Box>
                    <ModernConsumptionChart 
                      data={aggregateMonthlyConsumption(details?.transactions || [], false)} 
                      showAllTime={showAllTimeChart}
                      onToggleTimeRange={() => setShowAllTimeChart(!showAllTimeChart)}
                    />
                  </CardContent>
                </Card>

                {/* Stock Movement Chart */}
                <Card 
                  elevation={0} 
                  sx={{ 
                    mb: 2,
                    borderRadius: 2.5,
                    bgcolor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                    border: 1,
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                      <TrendingUpIcon sx={{ mr: 1, color: 'primary.main', fontSize: 18 }} />
                      <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                        Stock Movement
                      </Typography>
                      <Chip 
                        label="Recent activity" 
                        size="small" 
                        sx={{ 
                          ml: 'auto',
                          bgcolor: isDarkMode ? 'rgba(144, 202, 249, 0.1)' : 'rgba(25, 118, 210, 0.1)',
                          color: isDarkMode ? '#90caf9' : '#1976d2',
                          fontSize: '0.65rem',
                          height: 22
                        }} 
                      />
                    </Box>
                    <ModernStockMovementChart 
                      data={details?.transactions?.map(t => ({
                        date: t.date,
                        balance: t.balance,
                        type: t.type,
                        quantity: t.quantity,
                        notes: t.notes
                      })) || []} 
                    />
                  </CardContent>
                </Card>

                {/* Enhanced Transaction History */}
                <Card 
                  elevation={0} 
                  sx={{ 
                    mb: 2,
                    borderRadius: 2.5,
                    bgcolor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                    border: 1,
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <HistoryIcon sx={{ mr: 1, color: 'primary.main', fontSize: 18 }} />
                      <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                        Transaction History
                      </Typography>
                      <Badge 
                        badgeContent={details?.transactions?.length || 0} 
                        color="primary" 
                        sx={{ ml: 'auto', mr: 1 }}
                      >
                        <Box />
                      </Badge>
                      <IconButton
                        size="small"
                        onClick={() => {
                          if (open && productId) {
                            fetchProductDetails();
                          }
                        }}
                        sx={{
                          color: 'primary.main',
                          bgcolor: isDarkMode ? 'rgba(25, 118, 210, 0.1)' : 'rgba(25, 118, 210, 0.05)',
                          '&:hover': {
                            bgcolor: isDarkMode ? 'rgba(25, 118, 210, 0.2)' : 'rgba(25, 118, 210, 0.1)',
                            transform: 'rotate(180deg)'
                          },
                          transition: 'all 0.3s ease',
                          width: 32,
                          height: 32
                        }}
                      >
                        <RefreshIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                    <Box sx={{ maxHeight: 350, overflowY: 'auto' }}>
                      {details?.transactions
                        ?.slice()
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 10) // Show only last 10 transactions
                        .map((transaction, index) => (
                        <ModernTransactionCard
                          key={transaction.id}
                          transaction={transaction}
                          index={index}
                        />
                      ))}
                      {(details?.transactions?.length || 0) > 10 && (
                        <Typography 
                          variant="caption" 
                          color="textSecondary" 
                          sx={{ 
                            display: 'block', 
                            textAlign: 'center', 
                            mt: 1.5,
                            fontStyle: 'italic',
                            fontSize: '0.7rem'
                          }}
                        >
                          Showing last 10 transactions of {details?.transactions?.length || 0} total
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                {/* Enhanced Desktop Stats Section */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={3}>
                    <CompactStatsCard
                      title="Current Stock"
                      value={Math.floor(details?.currentStock || 0)}
                      unit="kg"
                      icon={<InventoryIcon />}
                      subtitle={`${Math.ceil((details?.currentStock || 0) / (avgConsumptionData.average || 1))} months supply`}
                      color="#2E7D32"
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <CompactStatsCard
                      title="Avg Consumption"
                      value={avgConsumptionData.average}
                      unit="kg/mo"
                      icon={<ShowChartIcon />}
                      subtitle={avgConsumptionData.subtitle}
                      color="#1976d2"
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <CompactStatsCard
                      title="Total Transactions"
                      value={details?.transactions?.length || 0}
                      unit="records"
                      icon={<HistoryIcon />}
                      subtitle="All time"
                      color="#FF7043"
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <CompactStatsCard
                      title="Stock Status"
                      value={
                        (details?.currentStock || 0) > (avgConsumptionData.average * 2) ? "Good" :
                        (details?.currentStock || 0) > avgConsumptionData.average ? "Low" : "Critical"
                      }
                      unit=""
                      icon={
                        (details?.currentStock || 0) > (avgConsumptionData.average * 2) ? 
                        <TrendingUpIcon /> : 
                        (details?.currentStock || 0) > avgConsumptionData.average ? 
                        <TrendingFlatIcon /> : 
                        <TrendingDownIcon />
                      }
                      subtitle="Based on consumption"
                      color={
                        (details?.currentStock || 0) > (avgConsumptionData.average * 2) ? "#4caf50" :
                        (details?.currentStock || 0) > avgConsumptionData.average ? "#ff9800" : "#f44336"
                      }
                    />
                  </Grid>
                </Grid>

                {/* Enhanced Desktop Charts Section */}
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={6}>
                    <Card 
                      elevation={0} 
                      sx={{ 
                        borderRadius: 2.5,
                        bgcolor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                        border: 1,
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                        height: '100%'
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <ShowChartIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                          <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                            Monthly Consumption
                          </Typography>
                          <Chip 
                            label={showAllTimeChart ? "All Time" : "Last 6 months"} 
                            size="small" 
                            sx={{ 
                              ml: 'auto',
                              bgcolor: isDarkMode ? 'rgba(144, 202, 249, 0.1)' : 'rgba(25, 118, 210, 0.1)',
                              color: isDarkMode ? '#90caf9' : '#1976d2',
                              fontSize: '0.7rem',
                              fontWeight: 600
                            }} 
                          />
                        </Box>
                        <ModernConsumptionChart 
                          data={aggregateMonthlyConsumption(details?.transactions || [], false)} 
                          showAllTime={showAllTimeChart}
                          onToggleTimeRange={() => setShowAllTimeChart(!showAllTimeChart)}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card 
                      elevation={0} 
                      sx={{ 
                        borderRadius: 2.5,
                        bgcolor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                        border: 1,
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                        height: '100%'
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <TrendingUpIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                          <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                            Stock Movement
                          </Typography>
                          <Chip 
                            label="Recent activity" 
                            size="small" 
                            sx={{ 
                              ml: 'auto',
                              bgcolor: isDarkMode ? 'rgba(144, 202, 249, 0.1)' : 'rgba(25, 118, 210, 0.1)',
                              color: isDarkMode ? '#90caf9' : '#1976d2',
                              fontSize: '0.7rem'
                            }} 
                          />
                        </Box>
                        <ModernStockMovementChart 
                          data={details?.transactions?.map(t => ({
                            date: t.date,
                            balance: t.balance,
                            type: t.type,
                            quantity: t.quantity,
                            notes: t.notes
                          })) || []} 
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </>
            )}

            {/* Enhanced Desktop Transaction History */}
            {!isMobile && (
              <Card 
                elevation={0} 
                sx={{ 
                  borderRadius: 2.5,
                  bgcolor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                  border: 1,
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <HistoryIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
                    <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                      Transaction History
                    </Typography>
                    <Badge 
                      badgeContent={details?.transactions?.length || 0} 
                      color="primary" 
                      sx={{ ml: 'auto', mr: 2 }}
                    >
                      <Box />
                    </Badge>
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (open && productId) {
                          fetchProductDetails();
                        }
                      }}
                      sx={{
                        color: 'primary.main',
                        bgcolor: isDarkMode ? 'rgba(25, 118, 210, 0.1)' : 'rgba(25, 118, 210, 0.05)',
                        '&:hover': {
                          bgcolor: isDarkMode ? 'rgba(25, 118, 210, 0.2)' : 'rgba(25, 118, 210, 0.1)',
                          transform: 'rotate(180deg)'
                        },
                        transition: 'all 0.3s ease',
                        width: 36,
                        height: 36
                      }}
                    >
                      <RefreshIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                  <Grid container spacing={2}>
                    {details?.transactions
                      ?.slice()
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 12) // Show last 12 transactions in desktop view
                      .map((transaction, index) => (
                      <Grid item xs={12} md={6} lg={4} key={transaction.id}>
                        <ModernTransactionCard
                          transaction={transaction}
                          index={index}
                        />
                      </Grid>
                    ))}
                  </Grid>
                  {(details?.transactions?.length || 0) > 12 && (
                    <Typography 
                      variant="body2" 
                      color="textSecondary" 
                      sx={{ 
                        textAlign: 'center', 
                        mt: 3,
                        fontStyle: 'italic'
                      }}
                    >
                      Showing last 12 transactions of {details?.transactions?.length || 0} total
                    </Typography>
                  )}
                </CardContent>
              </Card>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailsDialog; 