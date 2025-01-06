import React, { useState, useMemo } from 'react';
import { Box, Card, CardContent, Grid, Typography, FormControl, InputLabel, Select, MenuItem, Button, Stack } from '@mui/material';
import { InventoryItem } from '../Inventory/InventoryList';
import InventoryIcon from '@mui/icons-material/Inventory';
import BarChartIcon from '@mui/icons-material/BarChart';
import CategoryIcon from '@mui/icons-material/Category';
import BusinessIcon from '@mui/icons-material/Business';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Bar, ReferenceLine, Legend, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import { aggregateMonthlyConsumption } from '../../utils/consumption';
import { Transaction } from '../../types/transaction';

interface QuickStatsProps {
  inventory: InventoryItem[];
}

const QuickStats: React.FC<QuickStatsProps> = ({ inventory }) => {
  const { isDarkMode } = useTheme();
  const [filterType, setFilterType] = useState<'none' | 'supplier' | 'category' | 'catalog'>('none');
  const [filterValue, setFilterValue] = useState('');
  const [visibleGraphs, setVisibleGraphs] = useState({
    consumption: true,
    purchases: true
  });
  const [activeGraph, setActiveGraph] = useState<'combined' | 'consumption'>('combined');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [timeFrame, setTimeFrame] = useState('all');
  const [supplierData, setSupplierData] = useState<Record<string, number>>({});

  // Get unique suppliers and categories
  const suppliers = useMemo(() => 
    Array.from(new Set(inventory.map(item => item.supplier))).sort(),
    [inventory]
  );
  
  const categories = useMemo(() => 
    Array.from(new Set(inventory.map(item => item.category).filter(Boolean))).sort(),
    [inventory]
  );

  const totalDesigns = inventory.length;
  const totalStock = inventory.reduce((sum, item) => sum + (Number(item.currentStock) || 0), 0);
  const totalAvgConsumption = inventory.reduce((sum, item) => sum + (Number(item.avgConsumption) || 0), 0);

  console.log('Inventory with transactions:', inventory.map(item => ({
    artisCode: item.artisCodes[0],
    transactions: item.transactions?.length || 0
  })));

  const filteredInventory = useMemo(() => {
    let filtered = [...inventory];
    
    if (filterType === 'supplier' && filterValue) {
      filtered = filtered.filter(item => item.supplier === filterValue);
    } else if (filterType === 'category' && filterValue) {
      filtered = filtered.filter(item => item.category === filterValue);
    } else if (filterType === 'catalog' && filterValue) {
      filtered = filtered.filter(item => item.catalogs?.includes(filterValue));
    }
    
    return filtered;
  }, [inventory, filterType, filterValue]);

  const getMonthlyConsumption = () => {
    const allTransactions = filteredInventory.reduce((acc, item) => {
      if (item.transactions) {
        return [...acc, ...item.transactions];
      }
      return acc;
    }, [] as Transaction[]);

    return aggregateMonthlyConsumption(allTransactions);
  };

  const aggregateMonthlyPurchases = (transactions: Transaction[]) => {
    const monthlyData = transactions.reduce((acc: Record<string, number>, t: Transaction) => {
      if (t.type === 'IN') {
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
    const averagePurchase = monthlyValues.length > 0 
      ? monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length 
      : 0;

    return sortedEntries.map(([month, amount]) => ({
      month,
      amount: Number(amount),
      average: Number(averagePurchase.toFixed(2))
    }));
  };

  const getSupplierConsumption = () => {
    const allSupplierData: Record<string, number> = {};
    
    filteredInventory.forEach(item => {
      if (!item.supplier || !item.transactions) return;
      
      const consumption = item.transactions
        .filter(t => {
          if (t.type !== 'OUT') return false;
          if (timeFrame === 'all') return true;
          const transactionDate = new Date(t.date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short' 
          });
          return transactionDate === timeFrame;
        })
        .reduce((sum, t) => sum + Number(t.quantity), 0);
      
      if (consumption > 0) {
        const shortName = item.supplier.split(' ')[0];
        allSupplierData[shortName] = (allSupplierData[shortName] || 0) + consumption;
      }
    });

    const sortedData = Object.entries(allSupplierData)
      .map(([name, value]) => ({
        name,
        value: Number(value.toFixed(2))
      }))
      .sort((a, b) => b.value - a.value);

    const topSuppliers = sortedData.slice(0, 7);
    const othersSuppliers = sortedData.slice(7);
    const othersValue = othersSuppliers.reduce((sum, item) => sum + item.value, 0);
    
    if (othersValue > 0) {
      topSuppliers.push({
        name: 'Others',
        value: Number(othersValue.toFixed(2))
      });
      // Store only the others suppliers data
      setSupplierData(Object.fromEntries(
        othersSuppliers.map(({name, value}) => [name, value])
      ));
    }
    
    return topSuppliers;
  };

  const memoizedSupplierConsumption = useMemo(() => getSupplierConsumption(), [filteredInventory, timeFrame]);

  const StatBox = ({ icon, value, unit, label }: { icon: React.ReactNode, value: string | number, unit?: string, label: string }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {icon}
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 500, display: 'flex', alignItems: 'baseline', gap: 1 }}>
          {value}
          {unit && (
            <Typography component="span" sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>
              {unit}
            </Typography>
          )}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Box>
    </Box>
  );

  // Add uniqueCatalogs memo similar to InventoryList
  const uniqueCatalogs = useMemo(() => 
    Array.from(new Set(inventory.flatMap(item => item.catalogs || [])))
      .filter(Boolean)
      .sort()
  , [inventory]);

  const CustomLegend = () => (
    <Stack 
      direction="row" 
      spacing={3}
      alignItems="center"
      sx={{ 
        backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.9)',
        padding: '12px 24px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
    >
      <Box
        onClick={() => setVisibleGraphs(prev => ({ ...prev, consumption: !prev.consumption }))}
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5,
          cursor: 'pointer',
          opacity: visibleGraphs.consumption ? 1 : 0.5,
          transition: 'all 0.2s',
          padding: '8px 16px',
          borderRadius: '6px',
          '&:hover': {
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          }
        }}
      >
        <Box 
          sx={{ 
            width: 16, 
            height: 16, 
            borderRadius: '50%', 
            bgcolor: isDarkMode ? '#7E57C2' : '#5E35B1' 
          }} 
        />
        <Typography sx={{ fontSize: 16, fontWeight: 500, color: isDarkMode ? '#fff' : '#333' }}>
          Consumption {visibleGraphs.consumption ? '✓' : ''}
        </Typography>
      </Box>
      <Box
        onClick={() => setVisibleGraphs(prev => ({ ...prev, purchases: !prev.purchases }))}
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5,
          cursor: 'pointer',
          opacity: visibleGraphs.purchases ? 1 : 0.5,
          transition: 'all 0.2s',
          padding: '8px 16px',
          borderRadius: '6px',
          '&:hover': {
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          }
        }}
      >
        <Box 
          sx={{ 
            width: 16, 
            height: 16, 
            borderRadius: '50%', 
            bgcolor: isDarkMode ? '#4CAF50' : '#2E7D32' 
          }} 
        />
        <Typography sx={{ fontSize: 16, fontWeight: 500, color: isDarkMode ? '#fff' : '#333' }}>
          Purchases {visibleGraphs.purchases ? '✓' : ''}
        </Typography>
      </Box>
    </Stack>
  );

  const renderBarLabel = (props: any, type: 'consumption' | 'purchases') => {
    const { value, x, y, payload } = props;
    
    // Safety check for payload
    if (!payload || !payload.month) {
      return null;
    }

    // Get the data directly from the chart data
    const monthlyData = getMonthlyConsumption();
    const purchases = aggregateMonthlyPurchases(
      filteredInventory.flatMap(item => item.transactions || [])
    );

    // Get the current month's data
    const currentMonthData = monthlyData.find(d => d.month === payload.month);
    if (!currentMonthData) {
      return null;
    }

    const purchaseValue = purchases.find(p => p.month === payload.month)?.amount || 0;

    return (
      <g transform={`translate(${x},${y})`}>
        <rect
          x={-40}
          y={80}
          width={80}
          height={visibleGraphs.consumption && visibleGraphs.purchases ? 45 : 25}
          fill={isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.95)'}
          rx={4}
          stroke={isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
          strokeWidth={1}
        />
        {type === 'consumption' && visibleGraphs.consumption && (
          <text
            x={0}
            y={100}
            fill={isDarkMode ? '#9575CD' : '#5E35B1'}
            textAnchor="middle"
            fontSize={12}
            fontWeight="600"
          >
            {`C: ${value.toLocaleString()}`}
          </text>
        )}
        {type === 'purchases' && visibleGraphs.purchases && (
          <text
            x={0}
            y={117}
            fill={isDarkMode ? '#81C784' : '#2E7D32'}
            textAnchor="middle"
            fontSize={12}
            fontWeight="600"
          >
            {`P: ${purchaseValue.toLocaleString()}`}
          </text>
        )}
      </g>
    );
  };

  console.log('Chart Data:', {
    monthlyConsumption: getMonthlyConsumption(),
    monthlyPurchases: aggregateMonthlyPurchases(
      filteredInventory.flatMap(item => item.transactions || [])
    )
  });

  const timeFrameOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'All Time' }];
    const dates = new Set(
      filteredInventory
        .flatMap(item => item.transactions || [])
        .map(t => new Date(t.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }))
    );
    
    return [
      ...options,
      ...Array.from(dates)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        .map(date => ({ value: date, label: date }))
    ];
  }, [filteredInventory]);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card sx={{ p: 2, borderRadius: 2 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <StatBox
                icon={<CategoryIcon sx={{ fontSize: 40, color: theme => theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2' }} />}
                value={totalDesigns}
                label="Total Designs"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatBox
                icon={<InventoryIcon sx={{ fontSize: 40, color: theme => theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2' }} />}
                value={totalStock.toFixed(2)}
                unit="kgs"
                label="Total Stock"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <StatBox
                icon={<BarChartIcon sx={{ fontSize: 40, color: theme => theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2' }} />}
                value={totalAvgConsumption.toFixed(2)}
                unit="kgs"
                label="Avg. Consumption"
              />
            </Grid>
          </Grid>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card sx={{ 
          borderRadius: 2,
          boxShadow: isDarkMode 
            ? '0 4px 20px rgba(0,0,0,0.25)' 
            : '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <CardContent>
            <Stack 
              direction="row" 
              justifyContent="space-between" 
              alignItems="flex-start"
              mb={2}
              gap={2}
            >
              <CustomLegend />
              <Stack 
                direction="row" 
                spacing={2}
                sx={{ 
                  flexWrap: 'wrap',
                  gap: 2
                }}
              >
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Filter by Supplier</InputLabel>
                  <Select
                    value={filterType === 'supplier' ? filterValue : ''}
                    onChange={(e) => {
                      setFilterType('supplier');
                      setFilterValue(e.target.value);
                      if (!e.target.value) {
                        setFilterType('none');
                      }
                    }}
                    label="Filter by Supplier"
                  >
                    <MenuItem value="">All Suppliers</MenuItem>
                    {suppliers.map((supplier) => (
                      <MenuItem key={supplier} value={supplier}>{supplier}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Filter by Category</InputLabel>
                  <Select
                    value={filterType === 'category' ? filterValue : ''}
                    onChange={(e) => {
                      setFilterType('category');
                      setFilterValue(e.target.value);
                      if (!e.target.value) {
                        setFilterType('none');
                      }
                    }}
                    label="Filter by Category"
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>{category}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Filter by Catalog</InputLabel>
                  <Select
                    value={filterType === 'catalog' ? filterValue : ''}
                    onChange={(e) => {
                      setFilterType('catalog');
                      setFilterValue(e.target.value);
                      if (!e.target.value) {
                        setFilterType('none');
                      }
                    }}
                    label="Filter by Catalog"
                  >
                    <MenuItem value="">All Catalogs</MenuItem>
                    {uniqueCatalogs.map((catalog) => (
                      <MenuItem key={catalog} value={catalog}>{catalog}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Stack>
            <Box sx={{ 
              height: 400, 
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              '& .recharts-legend-wrapper': {
                width: '240px !important',
                right: '0 !important'
              }
            }}>
              <ResponsiveContainer>
                <ComposedChart
                  data={getMonthlyConsumption()}
                  margin={{ top: 40, right: 180, left: 20, bottom: 5 }}
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
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#333' : '#fff',
                      border: `1px solid ${isDarkMode ? '#444' : '#ddd'}`,
                      borderRadius: '4px'
                    }}
                    labelStyle={{ color: isDarkMode ? '#fff' : '#333' }}
                  />
                  {visibleGraphs.consumption && (
                    <Bar 
                      dataKey="amount" 
                      fill={isDarkMode ? '#7E57C2' : '#5E35B1'} 
                      name="Consumption"
                      barSize={30}
                      radius={[4, 4, 0, 0]}
                      opacity={0.9}
                      label={{
                        position: 'top',
                        content: (props) => renderBarLabel(props, 'consumption')
                      }}
                    />
                  )}
                  {visibleGraphs.purchases && (
                    <Bar 
                      dataKey={(data) => {
                        const purchases = aggregateMonthlyPurchases(
                          filteredInventory.flatMap(item => item.transactions || [])
                        );
                        return purchases.find(p => p.month === data.month)?.amount || 0;
                      }}
                      fill={isDarkMode ? '#4CAF50' : '#2E7D32'} 
                      name="Purchases"
                      barSize={30}
                      radius={[4, 4, 0, 0]}
                      opacity={0.9}
                      label={{
                        position: 'top',
                        content: (props) => renderBarLabel(props, 'purchases')
                      }}
                    />
                  )}
                  <ReferenceLine
                    y={getMonthlyConsumption()[0]?.average}
                    stroke={isDarkMode ? '#FFB74D' : '#F57C00'}
                    strokeDasharray="3 3"
                    strokeWidth={2}
                    label={{
                      value: `Avg Consumption: ${getMonthlyConsumption()[0]?.average?.toLocaleString()} kgs`,
                      fill: isDarkMode ? '#FFB74D' : '#F57C00',
                      fontSize: 12,
                      fontWeight: '500',
                      position: 'right'
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card sx={{ 
          borderRadius: 2,
          boxShadow: isDarkMode 
            ? '0 4px 20px rgba(0,0,0,0.25)' 
            : '0 4px 20px rgba(0,0,0,0.1)',
          height: '100%'
        }}>
          <CardContent>
            <Stack 
              direction="row" 
              justifyContent="space-between" 
              alignItems="flex-start"
              mb={2}
              gap={2}
            >
              <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
                {`Top Suppliers in ${timeFrame === 'all' ? 'All Time' : timeFrame}`}
              </Typography>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Time Frame</InputLabel>
                <Select
                  value={timeFrame}
                  onChange={(e) => setTimeFrame(e.target.value)}
                  label="Time Frame"
                >
                  {timeFrameOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <Box sx={{ 
              height: 400, 
              width: '100%',
              position: 'relative'
            }}>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <defs>
                    {memoizedSupplierConsumption.map((_, index) => (
                      <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={`hsl(${200 + index * 25}, 70%, 55%)`} />
                        <stop offset="100%" stopColor={`hsl(${200 + index * 25}, 80%, 35%)`} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={memoizedSupplierConsumption}
                    dataKey="value"
                    nameKey="name"
                    cx={250}
                    cy={170}
                    innerRadius={80}
                    outerRadius={160}
                    paddingAngle={1}
                    strokeWidth={0}
                    label={({
                      cx,
                      cy,
                      midAngle,
                      innerRadius,
                      outerRadius,
                      percent,
                      name,
                      value,
                      index
                    }) => {
                      if (name === 'Others') {
                        const RADIAN = Math.PI / 180;
                        const radius = outerRadius * 1.2;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        const sin = Math.sin(-midAngle * RADIAN);
                        const cos = Math.cos(-midAngle * RADIAN);
                        const textAnchor = cos >= 0 ? 'start' : 'end';
                        const lineX2 = cx + (outerRadius + 10) * cos;
                        const lineY2 = cy + (outerRadius + 10) * sin;

                        return (
                          <g>
                            <line
                              x1={cx + outerRadius * cos}
                              y1={cy + outerRadius * sin}
                              x2={lineX2}
                              y2={lineY2}
                              stroke={isDarkMode ? '#666' : '#999'}
                              strokeWidth={1}
                            />
                            <line
                              x1={lineX2}
                              y1={lineY2}
                              x2={x}
                              y2={y}
                              stroke={isDarkMode ? '#666' : '#999'}
                              strokeWidth={1}
                            />
                            <text
                              x={x + (cos >= 0 ? 5 : -5)}
                              y={y}
                              textAnchor={textAnchor}
                              fill={`hsl(${200 + index * 25}, 70%, 55%)`}
                              fontSize="12"
                              fontWeight="600"
                            >
                              {`${name} (${(percent * 100).toFixed(1)}%)`}
                            </text>
                            <text
                              x={x + (cos >= 0 ? 5 : -5)}
                              y={y + 15}
                              textAnchor={textAnchor}
                              fill={`hsl(${200 + index * 25}, 70%, 55%)`}
                              fontSize="11"
                              fontWeight="500"
                            >
                              {`${value.toLocaleString()} kgs`}
                            </text>
                          </g>
                        );
                      }

                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius * 1.2;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      const sin = Math.sin(-midAngle * RADIAN);
                      const cos = Math.cos(-midAngle * RADIAN);
                      const textAnchor = cos >= 0 ? 'start' : 'end';
                      const lineX2 = cx + (outerRadius + 10) * cos;
                      const lineY2 = cy + (outerRadius + 10) * sin;

                      return (
                        <g className={`supplier-label-${index}`}>
                          <line
                            x1={cx + outerRadius * cos}
                            y1={cy + outerRadius * sin}
                            x2={lineX2}
                            y2={lineY2}
                            stroke={isDarkMode ? '#666' : '#999'}
                            strokeWidth={1}
                          />
                          <line
                            x1={lineX2}
                            y1={lineY2}
                            x2={x}
                            y2={y}
                            stroke={isDarkMode ? '#666' : '#999'}
                            strokeWidth={1}
                          />
                          <g
                            style={{
                              transition: 'transform 0.2s',
                              transformOrigin: `${x}px ${y}px`,
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => {
                              const group = e.currentTarget;
                              group.style.transform = 'scale(1.15)';
                            }}
                            onMouseLeave={(e) => {
                              const group = e.currentTarget;
                              group.style.transform = 'scale(1)';
                            }}
                          >
                            <text
                              x={x + (cos >= 0 ? 5 : -5)}
                              y={y}
                              textAnchor={textAnchor}
                              fill={`hsl(${200 + index * 25}, 70%, 55%)`}
                              fontSize="12"
                              fontWeight="600"
                            >
                              {`${name} (${(percent * 100).toFixed(1)}%)`}
                            </text>
                            <text
                              x={x + (cos >= 0 ? 5 : -5)}
                              y={y + 15}
                              textAnchor={textAnchor}
                              fill={`hsl(${200 + index * 25}, 70%, 55%)`}
                              fontSize="11"
                              fontWeight="500"
                            >
                              {`${value.toLocaleString()} kgs`}
                            </text>
                          </g>
                        </g>
                      );
                    }}
                  >
                    {memoizedSupplierConsumption.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={`url(#gradient-${index})`}
                        strokeWidth={0}
                        opacity={0.85}
                        onMouseEnter={(e) => {
                          const label = document.querySelector(`.supplier-label-${index} g`);
                          if (label) {
                            (label as HTMLElement).style.transform = 'scale(1.15)';
                          }
                          if (entry.name === 'Others') {
                            const othersBox = document.querySelector('.others-box');
                            if (othersBox) {
                              (othersBox as HTMLElement).style.opacity = '1';
                              (othersBox as HTMLElement).style.pointerEvents = 'auto';
                            }
                          }
                        }}
                        onMouseLeave={(e) => {
                          const label = document.querySelector(`.supplier-label-${index} g`);
                          if (label) {
                            (label as HTMLElement).style.transform = 'scale(1)';
                          }
                          if (entry.name === 'Others') {
                            const othersBox = document.querySelector('.others-box');
                            if (othersBox) {
                              (othersBox as HTMLElement).style.opacity = '0';
                              (othersBox as HTMLElement).style.pointerEvents = 'none';
                            }
                          }
                        }}
                      />
                    ))}
                  </Pie>
                  <text
                    x={270}
                    y={195}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isDarkMode ? '#fff' : '#333'}
                    style={{
                      pointerEvents: 'none'
                    }}
                  >
                    <tspan
                      x={270}
                      dy="-12"
                      fontSize="16"
                      fontWeight="500"
                      textAnchor="middle"
                    >
                      Total Consumption
                    </tspan>
                    <tspan
                      x={270}
                      dy="24"
                      fontSize="15"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {`${memoizedSupplierConsumption.reduce((sum, item) => sum + item.value, 0).toLocaleString()} kgs`}
                    </tspan>
                  </text>
                  <Legend
                    content={() => {
                      const othersData = memoizedSupplierConsumption.find(item => item.name === 'Others');
                      if (!othersData) return null;
                      
                      const total = memoizedSupplierConsumption.reduce((sum, item) => sum + item.value, 0);
                      const othersSuppliers = Object.entries(supplierData)
                        .sort((a, b) => b[1] - a[1])
                        .map(([name, value]) => ({
                          name,
                          value,
                          percentage: (value / total * 100).toFixed(1)
                        }));

                      // Calculate Others segment position
                      const RADIAN = Math.PI / 180;
                      const othersIndex = memoizedSupplierConsumption.findIndex(item => item.name === 'Others');
                      const startAngle = othersIndex * (360 / memoizedSupplierConsumption.length) * RADIAN;
                      const x = 250 + 160 * Math.cos(-startAngle - (RADIAN * 15));
                      const y = 200 + 160 * Math.sin(-startAngle - (RADIAN * 15));

                      return (
                        <div 
                          className="others-box"
                          style={{
                            position: 'absolute',
                            right: 20,
                            bottom: 20,
                            backgroundColor: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.95)',
                            padding: '12px',
                            borderRadius: '8px',
                            border: `1px solid ${isDarkMode ? '#333' : '#ddd'}`,
                            maxWidth: '200px',
                            opacity: 0,
                            pointerEvents: 'none',
                            transition: 'opacity 0.2s'
                          }}
                        >
                          <svg
                            style={{
                              position: 'absolute',
                              left: -40,
                              top: '50%',
                              width: 40,
                              height: 2
                            }}
                          >
                            
                          </svg>
                          <div style={{ 
                            fontSize: '12px', 
                            fontWeight: 500,
                            color: isDarkMode ? '#fff' : '#333',
                            marginBottom: '8px'
                          }}>
                            Others ({(othersData.value / total * 100).toFixed(1)}%):
                          </div>
                          {othersSuppliers.map((supplier) => (
                            <div key={supplier.name} style={{
                              fontSize: '11px',
                              color: isDarkMode ? '#aaa' : '#666',
                              marginTop: '4px'
                            }}>
                              {`${supplier.name} (${supplier.percentage}%)`}
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default QuickStats; 