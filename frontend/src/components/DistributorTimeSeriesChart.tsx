import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  SelectChangeEvent,
  ToggleButtonGroup,
  ToggleButton,
  Skeleton,
  TextField,
  Button
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import distributorOrderService from '../services/distributorOrderService';
import dayjs from 'dayjs';

interface TimeSeriesData {
  month: string;
  thickness_72_92: number;
  thickness_08: number;
  thickness_1mm: number;
  total: number;
}

interface DistributorOption {
  name: string;
  location: string;
  state: string;
}

interface LocationOption {
  location: string;
  state: string;
  count: number;
}

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const DistributorTimeSeriesChart: React.FC = () => {
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [distributors, setDistributors] = useState<DistributorOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [selectedDistributors, setSelectedDistributors] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<'distributor' | 'location'>('distributor');
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadOptions();
    // Set default date range to last 6 months
    const now = dayjs();
    setEndDate(now.format('YYYY-MM-DD'));
    setStartDate(now.subtract(6, 'month').format('YYYY-MM-DD'));
  }, []);

  useEffect(() => {
    if ((selectedDistributors.length > 0 || selectedLocations.length > 0) && startDate && endDate) {
      loadTimeSeriesData();
    }
  }, [selectedDistributors, selectedLocations, selectionMode, startDate, endDate]);

  const loadOptions = async () => {
    try {
      // Get unique distributors
      const ordersResponse = await distributorOrderService.getOrders({ limit: 1000 });
      if (ordersResponse.success && ordersResponse.data) {
        const uniqueDistributors = Array.from(
          new Map(
            ordersResponse.data.map((order: any) => [
              order.distributor_name,
              {
                name: order.distributor_name,
                location: order.location,
                state: order.state
              }
            ])
          ).values()
        );
        setDistributors(uniqueDistributors as DistributorOption[]);

        // Get unique locations
        const locationMap = new Map<string, LocationOption>();
        ordersResponse.data.forEach((order: any) => {
          const key = `${order.location}, ${order.state}`;
          if (!locationMap.has(key)) {
            locationMap.set(key, {
              location: order.location,
              state: order.state,
              count: 1
            });
          } else {
            const existing = locationMap.get(key)!;
            existing.count++;
          }
        });
        setLocations(Array.from(locationMap.values()).sort((a, b) => b.count - a.count));
      }
    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  const loadTimeSeriesData = async () => {
    setLoading(true);
    try {
      // Build filters based on selection mode
      const filters: any = {
        start_date: startDate,
        end_date: endDate,
        limit: 10000 // Get all data for selected period
      };

      if (selectionMode === 'distributor' && selectedDistributors.length > 0) {
        // For distributors, we need to fetch data for each and aggregate
        const allData: any[] = [];

        for (const distributor of selectedDistributors) {
          const response = await distributorOrderService.getOrders({
            ...filters,
            distributor_name: distributor
          });
          if (response.success && response.data) {
            allData.push(...response.data);
          }
        }

        // Aggregate data by month
        const monthlyData = aggregateByMonth(allData);
        setTimeSeriesData(monthlyData);
      } else if (selectionMode === 'location' && selectedLocations.length > 0) {
        // For locations, fetch data for each selected location
        const allData: any[] = [];

        for (const location of selectedLocations) {
          const [city, state] = location.split(', ');
          const response = await distributorOrderService.getOrders({
            ...filters,
            location: city,
            state: state
          });
          if (response.success && response.data) {
            allData.push(...response.data);
          }
        }

        // Aggregate data by month
        const monthlyData = aggregateByMonth(allData);
        setTimeSeriesData(monthlyData);
      }
    } catch (error) {
      console.error('Error loading time series data:', error);
    } finally {
      setLoading(false);
    }
  };

  const aggregateByMonth = (orders: any[]): TimeSeriesData[] => {
    const monthMap = new Map<string, TimeSeriesData>();

    orders.forEach(order => {
      const month = dayjs(order.order_date).format('MMM YYYY');

      if (!monthMap.has(month)) {
        monthMap.set(month, {
          month,
          thickness_72_92: 0,
          thickness_08: 0,
          thickness_1mm: 0,
          total: 0
        });
      }

      const monthData = monthMap.get(month)!;
      monthData.thickness_72_92 += parseInt(order.thickness_72_92 || 0);
      monthData.thickness_08 += parseInt(order.thickness_08 || 0);
      monthData.thickness_1mm += parseInt(order.thickness_1mm || 0);
      monthData.total += parseInt(order.total_pieces || 0);
    });

    // Sort by date and return
    return Array.from(monthMap.values()).sort((a, b) => {
      return dayjs(a.month, 'MMM YYYY').valueOf() - dayjs(b.month, 'MMM YYYY').valueOf();
    });
  };

  const handleDistributorChange = (event: SelectChangeEvent<typeof selectedDistributors>) => {
    const value = event.target.value;
    setSelectedDistributors(typeof value === 'string' ? value.split(',') : value);
  };

  const handleLocationChange = (event: SelectChangeEvent<typeof selectedLocations>) => {
    const value = event.target.value;
    setSelectedLocations(typeof value === 'string' ? value.split(',') : value);
  };

  const handleModeChange = (event: React.MouseEvent<HTMLElement>, newMode: 'distributor' | 'location' | null) => {
    if (newMode !== null) {
      setSelectionMode(newMode);
      // Clear selections when switching modes
      setSelectedDistributors([]);
      setSelectedLocations([]);
      setTimeSeriesData([]);
    }
  };

  const handleRefresh = () => {
    loadTimeSeriesData();
  };

  const getSelectionLabel = () => {
    if (selectionMode === 'distributor') {
      if (selectedDistributors.length === 0) return 'Select Distributors';
      if (selectedDistributors.length === 1) return selectedDistributors[0];
      return `${selectedDistributors.length} distributors selected`;
    } else {
      if (selectedLocations.length === 0) return 'Select Locations';
      if (selectedLocations.length === 1) return selectedLocations[0];
      return `${selectedLocations.length} locations selected`;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      return (
        <Paper sx={{ p: 1.5 }}>
          <Typography variant="subtitle2" fontWeight="bold">{label}</Typography>
          {payload.map((entry: any, index: number) => (
            <Typography key={index} variant="body2" sx={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString()} ({((entry.value / total) * 100).toFixed(1)}%)
            </Typography>
          ))}
          <Typography variant="body2" fontWeight="bold" sx={{ mt: 0.5, pt: 0.5, borderTop: 1, borderColor: 'divider' }}>
            Total: {total.toLocaleString()}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  return (
    <Box>
      {/* Controls */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2}>
            <ToggleButtonGroup
              value={selectionMode}
              exclusive
              onChange={handleModeChange}
              size="small"
              fullWidth
            >
              <ToggleButton value="distributor">
                <PersonIcon sx={{ mr: 0.5, fontSize: 18 }} />
                Distributor
              </ToggleButton>
              <ToggleButton value="location">
                <LocationIcon sx={{ mr: 0.5, fontSize: 18 }} />
                Location
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>

          <Grid item xs={12} md={4}>
            {selectionMode === 'distributor' ? (
              <FormControl fullWidth size="small">
                <InputLabel>Select Distributors</InputLabel>
                <Select
                  multiple
                  value={selectedDistributors}
                  onChange={handleDistributorChange}
                  input={<OutlinedInput label="Select Distributors" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                  MenuProps={MenuProps}
                >
                  {distributors.map((dist) => (
                    <MenuItem key={dist.name} value={dist.name}>
                      {dist.name} ({dist.location}, {dist.state})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <FormControl fullWidth size="small">
                <InputLabel>Select Locations</InputLabel>
                <Select
                  multiple
                  value={selectedLocations}
                  onChange={handleLocationChange}
                  input={<OutlinedInput label="Select Locations" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                  MenuProps={MenuProps}
                >
                  {locations.map((loc) => (
                    <MenuItem key={`${loc.location}, ${loc.state}`} value={`${loc.location}, ${loc.state}`}>
                      {loc.location}, {loc.state} ({loc.count} orders)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
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

          <Grid item xs={12} sm={6} md={2}>
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

          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={handleRefresh}
              startIcon={<RefreshIcon />}
              disabled={selectedDistributors.length === 0 && selectedLocations.length === 0}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Chart */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Volume Timeline - {getSelectionLabel()}
        </Typography>

        {loading ? (
          <Skeleton variant="rectangular" height={400} />
        ) : timeSeriesData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="thickness_72_92" stackId="a" fill="#8884d8" name=".72/.82/.92mm" />
              <Bar dataKey="thickness_08" stackId="a" fill="#82ca9d" name="0.8mm" />
              <Bar dataKey="thickness_1mm" stackId="a" fill="#ffc658" name="1mm" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Box sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              {selectedDistributors.length === 0 && selectedLocations.length === 0
                ? `Select ${selectionMode === 'distributor' ? 'distributors' : 'locations'} to view timeline`
                : 'No data available for the selected period'}
            </Typography>
          </Box>
        )}

        {timeSeriesData.length > 0 && (
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Chip label=".72/.82/.92mm" sx={{ bgcolor: '#8884d8', color: 'white' }} size="small" />
            <Chip label="0.8mm" sx={{ bgcolor: '#82ca9d', color: 'white' }} size="small" />
            <Chip label="1mm" sx={{ bgcolor: '#ffc658', color: 'white' }} size="small" />
            <Chip
              label={`Total Volume: ${timeSeriesData.reduce((sum, d) => sum + d.total, 0).toLocaleString()}`}
              variant="outlined"
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default DistributorTimeSeriesChart;