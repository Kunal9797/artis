import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  ToggleButtonGroup,
  ToggleButton,
  Skeleton,
  Chip,
  Grid,
  Card,
  CardContent,
  TextField
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  CalendarMonth as CalendarIcon
} from '@mui/icons-material';
import { visuallyHidden } from '@mui/utils';
import distributorOrderService from '../services/distributorOrderService';
import dayjs from 'dayjs';

interface MonthlyVolumeData {
  month: string;
  volume: number;
  orders: number;
  thickness_72_92: number;
  thickness_08: number;
  thickness_1mm: number;
}

interface EntityData {
  name: string;
  location?: string;
  state?: string;
  totalVolume: number;
  totalOrders: number;
  avgMonthlyVolume: number;
  monthsActive: number;
  firstOrder: string;
  lastOrder: string;
}

type Order = 'asc' | 'desc';

interface HeadCell {
  id: keyof EntityData;
  label: string;
  numeric: boolean;
  align?: 'left' | 'right' | 'center';
}

const distributorHeadCells: HeadCell[] = [
  { id: 'name', label: 'Distributor', numeric: false, align: 'left' },
  { id: 'location', label: 'Location', numeric: false, align: 'left' },
  { id: 'state', label: 'State', numeric: false, align: 'left' },
  { id: 'totalVolume', label: 'Total Volume', numeric: true, align: 'right' },
  { id: 'avgMonthlyVolume', label: 'Avg Monthly Volume', numeric: true, align: 'right' },
  { id: 'totalOrders', label: 'Total Orders', numeric: true, align: 'right' },
  { id: 'monthsActive', label: 'Months Active', numeric: true, align: 'right' }
];

const locationHeadCells: HeadCell[] = [
  { id: 'name', label: 'Location', numeric: false, align: 'left' },
  { id: 'state', label: 'State', numeric: false, align: 'left' },
  { id: 'totalVolume', label: 'Total Volume', numeric: true, align: 'right' },
  { id: 'avgMonthlyVolume', label: 'Avg Monthly Volume', numeric: true, align: 'right' },
  { id: 'totalOrders', label: 'Total Orders', numeric: true, align: 'right' },
  { id: 'monthsActive', label: 'Months Active', numeric: true, align: 'right' }
];

function descendingComparator(a: EntityData, b: EntityData, orderBy: keyof EntityData) {
  const aValue = a[orderBy];
  const bValue = b[orderBy];

  if (aValue === undefined || aValue === null) return 1;
  if (bValue === undefined || bValue === null) return -1;

  if (bValue < aValue) {
    return -1;
  }
  if (bValue > aValue) {
    return 1;
  }
  return 0;
}

function getComparator(
  order: Order,
  orderBy: keyof EntityData,
): (
  a: EntityData,
  b: EntityData,
) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

const DistributorVolumeAnalysis: React.FC = () => {
  const [monthlyData, setMonthlyData] = useState<MonthlyVolumeData[]>([]);
  const [entityData, setEntityData] = useState<EntityData[]>([]);
  const [viewMode, setViewMode] = useState<'distributor' | 'location'>('distributor');
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<keyof EntityData>('totalVolume');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Statistics
  const [stats, setStats] = useState({
    totalVolume: 0,
    avgMonthlyVolume: 0,
    peakMonth: '',
    peakVolume: 0,
    growthRate: 0
  });

  useEffect(() => {
    // Set default date range to last 12 months
    const now = dayjs();
    setEndDate(now.format('YYYY-MM-DD'));
    setStartDate(now.subtract(12, 'month').format('YYYY-MM-DD'));
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadData();
    }
  }, [viewMode, startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load monthly trend data for all
      const trendsResponse = await distributorOrderService.getTrends('monthly', startDate, endDate);
      if (trendsResponse.success && trendsResponse.data) {
        const formattedMonthly = trendsResponse.data.map((item: any) => ({
          month: dayjs(item.period).format('MMM YYYY'),
          volume: parseInt(item.total_volume || 0),
          orders: parseInt(item.total_orders || 0),
          thickness_72_92: parseInt(item.thickness_72_92_total || 0),
          thickness_08: parseInt(item.thickness_08_total || 0),
          thickness_1mm: parseInt(item.thickness_1mm_total || 0)
        }));
        setMonthlyData(formattedMonthly);

        // Calculate statistics
        const totalVol = formattedMonthly.reduce((sum: number, m: MonthlyVolumeData) => sum + m.volume, 0);
        const avgMonthlyVol = formattedMonthly.length > 0 ? Math.round(totalVol / formattedMonthly.length) : 0;
        const peak = formattedMonthly.reduce((max: MonthlyVolumeData, m: MonthlyVolumeData) => m.volume > max.volume ? m : max, formattedMonthly[0] || { month: '', volume: 0, orders: 0, thickness_72_92: 0, thickness_08: 0, thickness_1mm: 0 });

        // Calculate growth rate (first month vs last month)
        let growth = 0;
        if (formattedMonthly.length > 1) {
          const firstMonth = formattedMonthly[0].volume;
          const lastMonth = formattedMonthly[formattedMonthly.length - 1].volume;
          if (firstMonth > 0) {
            growth = ((lastMonth - firstMonth) / firstMonth) * 100;
          }
        }

        setStats({
          totalVolume: totalVol,
          avgMonthlyVolume: avgMonthlyVol,
          peakMonth: peak.month,
          peakVolume: peak.volume,
          growthRate: growth
        });
      }

      // Load entity data (distributors or locations)
      if (viewMode === 'distributor') {
        const ordersResponse = await distributorOrderService.getOrders({
          start_date: startDate,
          end_date: endDate,
          limit: 10000
        });

        if (ordersResponse.success && ordersResponse.data) {
          const distributorMap = new Map<string, any>();

          ordersResponse.data.forEach((order: any) => {
            const key = order.distributor_name;
            const orderDate = dayjs(order.order_date);
            const monthKey = orderDate.format('YYYY-MM');

            if (!distributorMap.has(key)) {
              distributorMap.set(key, {
                name: order.distributor_name,
                location: order.location,
                state: order.state,
                totalVolume: 0,
                totalOrders: 0,
                monthsSet: new Set(),
                firstOrder: order.order_date,
                lastOrder: order.order_date
              });
            }

            const dist = distributorMap.get(key);
            dist.totalVolume += parseInt(order.total_pieces || 0);
            dist.totalOrders += 1;
            dist.monthsSet.add(monthKey);

            // Update first and last order dates
            if (dayjs(order.order_date).isBefore(dayjs(dist.firstOrder))) {
              dist.firstOrder = order.order_date;
            }
            if (dayjs(order.order_date).isAfter(dayjs(dist.lastOrder))) {
              dist.lastOrder = order.order_date;
            }
          });

          const formattedData: EntityData[] = Array.from(distributorMap.values()).map(dist => ({
            name: dist.name,
            location: dist.location,
            state: dist.state,
            totalVolume: dist.totalVolume,
            totalOrders: dist.totalOrders,
            monthsActive: dist.monthsSet.size,
            avgMonthlyVolume: Math.round(dist.totalVolume / dist.monthsSet.size),
            firstOrder: dayjs(dist.firstOrder).format('DD.MM.YYYY'),
            lastOrder: dayjs(dist.lastOrder).format('DD.MM.YYYY')
          }));

          setEntityData(formattedData);
        }
      } else {
        // Location mode
        const locationResponse = await distributorOrderService.getLocationAnalysis({
          start_date: startDate,
          end_date: endDate,
          group_by: 'location'
        });

        if (locationResponse.success && locationResponse.data) {
          // Need to get monthly active count for locations
          const ordersResponse = await distributorOrderService.getOrders({
            start_date: startDate,
            end_date: endDate,
            limit: 10000
          });

          const locationMonthMap = new Map<string, Set<string>>();
          const locationDataMap = new Map<string, any>();

          if (ordersResponse.success && ordersResponse.data) {
            ordersResponse.data.forEach((order: any) => {
              const key = `${order.location}, ${order.state}`;
              const monthKey = dayjs(order.order_date).format('YYYY-MM');

              if (!locationMonthMap.has(key)) {
                locationMonthMap.set(key, new Set());
                locationDataMap.set(key, {
                  location: order.location,
                  state: order.state,
                  firstOrder: order.order_date,
                  lastOrder: order.order_date
                });
              }

              locationMonthMap.get(key)!.add(monthKey);

              const locData = locationDataMap.get(key);
              if (dayjs(order.order_date).isBefore(dayjs(locData.firstOrder))) {
                locData.firstOrder = order.order_date;
              }
              if (dayjs(order.order_date).isAfter(dayjs(locData.lastOrder))) {
                locData.lastOrder = order.order_date;
              }
            });
          }

          const formattedData: EntityData[] = locationResponse.data.map((loc: any) => {
            const key = `${loc.location}, ${loc.state || 'N/A'}`;
            const monthsActive = locationMonthMap.get(key)?.size || 1;
            const locData = locationDataMap.get(key) || { firstOrder: '', lastOrder: '' };

            return {
              name: loc.location,
              state: loc.state || 'N/A',
              totalVolume: parseInt(loc.total_volume || 0),
              totalOrders: parseInt(loc.total_orders || 0),
              monthsActive: monthsActive,
              avgMonthlyVolume: Math.round(parseInt(loc.total_volume || 0) / monthsActive),
              firstOrder: locData.firstOrder ? dayjs(locData.firstOrder).format('DD.MM.YYYY') : '',
              lastOrder: locData.lastOrder ? dayjs(locData.lastOrder).format('DD.MM.YYYY') : ''
            };
          });

          setEntityData(formattedData);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSort = (property: keyof EntityData) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleViewModeChange = (event: React.MouseEvent<HTMLElement>, newMode: 'distributor' | 'location' | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const filteredData = entityData.filter(entity => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return entity.name.toLowerCase().includes(searchLower) ||
           entity.location?.toLowerCase().includes(searchLower) ||
           entity.state?.toLowerCase().includes(searchLower);
  });

  const sortedData = React.useMemo(
    () => filteredData.sort(getComparator(order, orderBy)),
    [order, orderBy, filteredData]
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" fontWeight="bold">{label}</Typography>
          <Typography variant="body2">Volume: {payload[0].value.toLocaleString()}</Typography>
          {payload[1] && (
            <Typography variant="body2">Orders: {payload[1].value}</Typography>
          )}
        </Paper>
      );
    }
    return null;
  };

  return (
    <Box>
      {/* Header with Date Range */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CalendarIcon color="primary" />
              Monthly Order Volume Analysis
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Summary Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Total Volume (Period)
              </Typography>
              <Typography variant="h5">
                {stats.totalVolume.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Avg Monthly Volume
              </Typography>
              <Typography variant="h5">
                {stats.avgMonthlyVolume.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Peak Month
              </Typography>
              <Typography variant="h6">
                {stats.peakMonth}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {stats.peakVolume.toLocaleString()} units
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Growth Rate
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  color: stats.growthRate > 0 ? 'success.main' : stats.growthRate < 0 ? 'error.main' : 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                <TrendingUpIcon />
                {stats.growthRate > 0 ? '+' : ''}{stats.growthRate.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Monthly Volume Chart */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Overall Monthly Order Volumes
        </Typography>
        {loading ? (
          <Skeleton variant="rectangular" height={400} />
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="volume"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.6}
                name="Total Volume"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="orders"
                stroke="#82ca9d"
                strokeWidth={2}
                dot={{ fill: '#82ca9d' }}
                name="Order Count"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Paper>

      {/* Entity Table */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h6">
            {viewMode === 'distributor' ? 'Distributor' : 'Location'} Performance Table
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder={`Search ${viewMode}s...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              size="small"
            >
              <ToggleButton value="distributor">
                <PersonIcon sx={{ mr: 0.5, fontSize: 18 }} />
                Distributors
              </ToggleButton>
              <ToggleButton value="location">
                <LocationIcon sx={{ mr: 0.5, fontSize: 18 }} />
                Locations
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {loading ? (
          <Skeleton variant="rectangular" height={400} />
        ) : (
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {(viewMode === 'distributor' ? distributorHeadCells : locationHeadCells).map((headCell) => (
                    <TableCell
                      key={headCell.id}
                      align={headCell.align}
                      sortDirection={orderBy === headCell.id ? order : false}
                    >
                      {headCell.numeric ? (
                        <TableSortLabel
                          active={orderBy === headCell.id}
                          direction={orderBy === headCell.id ? order : 'asc'}
                          onClick={() => handleRequestSort(headCell.id)}
                        >
                          {headCell.label}
                          {orderBy === headCell.id ? (
                            <Box component="span" sx={visuallyHidden}>
                              {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                            </Box>
                          ) : null}
                        </TableSortLabel>
                      ) : (
                        headCell.label
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedData.map((row, index) => (
                  <TableRow
                    hover
                    key={`${row.name}-${index}`}
                    sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}
                  >
                    <TableCell>{row.name}</TableCell>
                    {viewMode === 'distributor' && (
                      <>
                        <TableCell>{row.location}</TableCell>
                        <TableCell>
                          <Chip label={row.state || 'N/A'} size="small" variant="outlined" />
                        </TableCell>
                      </>
                    )}
                    {viewMode === 'location' && (
                      <TableCell>
                        <Chip label={row.state || 'N/A'} size="small" variant="outlined" />
                      </TableCell>
                    )}
                    <TableCell align="right">
                      <Typography variant="body1" fontWeight="medium">
                        {row.totalVolume.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body1"
                        fontWeight="medium"
                        color="primary"
                      >
                        {row.avgMonthlyVolume.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {row.totalOrders.toLocaleString()}
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${row.monthsActive} months`}
                        size="small"
                        color={row.monthsActive >= 6 ? 'success' : row.monthsActive >= 3 ? 'warning' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {sortedData.length === 0 && !loading && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="textSecondary">
              No data found for the selected period
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default DistributorVolumeAnalysis;