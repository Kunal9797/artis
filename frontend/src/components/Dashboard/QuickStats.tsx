import React, { useState, useMemo } from 'react';
import { Box, Card, CardContent, Grid, Typography, FormControl, InputLabel, Select, MenuItem, Button, Stack, IconButton } from '@mui/material';
import { InventoryItem } from '../Inventory/InventoryList';
import InventoryIcon from '@mui/icons-material/Inventory';
import BarChartIcon from '@mui/icons-material/BarChart';
import CategoryIcon from '@mui/icons-material/Category';
import BusinessIcon from '@mui/icons-material/Business';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Bar, ReferenceLine, Legend, Tooltip, PieChart, Pie, Cell, Sector } from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import { aggregateMonthlyConsumption } from '../../utils/consumption';
import { Transaction } from '../../types/transaction';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { Distributor } from '../../types/distributor';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

interface QuickStatsProps {
  inventory: InventoryItem[];
  distributors?: Distributor[];
}

const QuickStats: React.FC<QuickStatsProps> = ({ inventory, distributors = [] }) => {
  const { isDarkMode } = useTheme();
  const [filterType, setFilterType] = useState<'none' | 'supplier' | 'category' | 'catalog'>('none');
  const [filterValue, setFilterValue] = useState('');
  const [visibleGraphs, setVisibleGraphs] = useState({
    consumption: true,
    purchases: true
  });
  const [activeGraph, setActiveGraph] = useState<'combined' | 'consumption'>('combined');
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [timeFrame, setTimeFrame] = useState('all');
  const [supplierData, setSupplierData] = useState<Record<string, number>>({});
  const [supplierChartView, setSupplierChartView] = useState<'consumption' | 'purchases'>('consumption');
  const [catalogDesignFilter, setCatalogDesignFilter] = useState<'all' | 'Liner' | '0.8MM' | '1MM'>('all');

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
    
    if (catalogDesignFilter !== 'all') {
      if (catalogDesignFilter === 'Liner') {
        filtered = filtered.filter(item => 
          item.catalogs?.includes('Liner')
        );
      } else if (catalogDesignFilter === '0.8MM') {
        filtered = filtered.filter(item => 
          item.catalogs?.includes('Artvio') || item.catalogs?.includes('Woodrica')
        );
      } else if (catalogDesignFilter === '1MM') {
        filtered = filtered.filter(item => 
          item.catalogs?.some(catalog => catalog.includes('1MM'))
        );
      }
    }
    
    if (filterType === 'supplier' && filterValue) {
      filtered = filtered.filter(item => item.supplier === filterValue);
    } else if (filterType === 'category' && filterValue) {
      filtered = filtered.filter(item => item.category === filterValue);
    } else if (filterType === 'catalog' && filterValue) {
      filtered = filtered.filter(item => item.catalogs?.includes(filterValue));
    }
    
    return filtered;
  }, [inventory, filterType, filterValue, catalogDesignFilter]);

  const getMonthlyConsumption = () => {
    const monthOrder: { [key: string]: number } = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };

    const monthlyData = filteredInventory.reduce((acc: Record<string, number>, item) => {
      if (!item.transactions) return acc;
      
      item.transactions.forEach(t => {
        if (t.type === 'OUT') {
          const month = new Date(t.date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short' 
          });
          acc[month] = (acc[month] || 0) + Number(t.quantity);
        }
      });
      
      return acc;
    }, {} as Record<string, number>);

    const values = Object.values(monthlyData);
    const average = values.length > 0 
      ? values.reduce((sum, val) => sum + val, 0) / values.length 
      : 0;

    return Object.entries(monthlyData)
      .map(([month, amount]) => ({
        month,
        amount,
        average
      }))
      .sort((a, b) => {
        const [monthA, yearA] = a.month.split(' ');
        const [monthB, yearB] = b.month.split(' ');
        
        if (yearA !== yearB) {
          return Number(yearA) - Number(yearB);
        }
        
        return monthOrder[monthA as keyof typeof monthOrder] - monthOrder[monthB as keyof typeof monthOrder];
      });
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

  const getSupplierConsumption = (topCount: number = 7) => {
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

    const topSuppliers = sortedData.slice(0, topCount);
    const othersSuppliers = sortedData.slice(topCount);
    const othersValue = othersSuppliers.reduce((sum, item) => sum + item.value, 0);
    
    if (othersValue > 0) {
      topSuppliers.push({
        name: 'Others',
        value: Number(othersValue.toFixed(2))
      });
      // Store all others suppliers data
      setSupplierData(Object.fromEntries(
        othersSuppliers.map(({name, value}) => [name, value])
      ));
    }
    
    return topSuppliers;
  };

  const getSupplierPurchases = (topCount: number = 7) => {
    const allSupplierData: Record<string, number> = {};
    
    filteredInventory.forEach(item => {
      if (!item.supplier || !item.transactions) return;
      
      const purchases = item.transactions
        .filter(t => {
          if (t.type !== 'IN') return false;
          if (timeFrame === 'all') return true;
          const transactionDate = new Date(t.date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short' 
          });
          return transactionDate === timeFrame;
        })
        .reduce((sum, t) => sum + Number(t.quantity), 0);
      
      if (purchases > 0) {
        const shortName = item.supplier.split(' ')[0];
        allSupplierData[shortName] = (allSupplierData[shortName] || 0) + purchases;
      }
    });

    const sortedData = Object.entries(allSupplierData)
      .map(([name, value]) => ({
        name,
        value: Number(value.toFixed(2))
      }))
      .sort((a, b) => b.value - a.value);

    const topSuppliers = sortedData.slice(0, topCount);
    const othersSuppliers = sortedData.slice(topCount);
    const othersValue = othersSuppliers.reduce((sum, item) => sum + item.value, 0);
    
    if (othersValue > 0) {
      topSuppliers.push({
        name: 'Others',
        value: Number(othersValue.toFixed(2))
      });
      // Store all others suppliers data
      setSupplierData(Object.fromEntries(
        othersSuppliers.map(({name, value}) => [name, value])
      ));
    }
    
    return topSuppliers;
  };

  const memoizedSupplierConsumption = useMemo(() => getSupplierConsumption(7), [filteredInventory, timeFrame]);
  const memoizedSupplierPurchases = useMemo(() => getSupplierPurchases(7), [filteredInventory, timeFrame]);

  const activeSupplierData = useMemo(() => 
    supplierChartView === 'consumption' ? memoizedSupplierConsumption : memoizedSupplierPurchases, 
    [memoizedSupplierConsumption, memoizedSupplierPurchases, supplierChartView]
  );

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
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      sx={{ 
        backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.9)',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        minWidth: 'auto'
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

  const MobilePieChart: React.FC<{ data: any[] }> = ({ data }) => {
    const { isDarkMode } = useTheme();
    const [activeIndex, setActiveIndex] = useState(0); // Start with first segment focused

    // Take top 5 suppliers and combine rest into Others
    const topSuppliers = data.slice(0, 5);
    const othersValue = data.slice(5).reduce((sum, item) => sum + item.value, 0);
    const chartData = othersValue > 0 
      ? [...topSuppliers, { name: 'Others', value: othersValue }]
      : topSuppliers;

    const total = chartData.reduce((sum, item) => sum + item.value, 0);
    const otherSuppliers = data.slice(5);

    // Convert kg to tons with 2 decimal places
    const kgToTons = (kg: number) => (kg / 1000).toFixed(2);

    // Get active segment data
    const activeSegment = chartData[activeIndex];
    const activePercentage = ((activeSegment?.value || 0) / total * 100).toFixed(1);
    const activeTons = kgToTons(activeSegment?.value || 0);

    // Get active segment color
    const getSegmentColor = (index: number, name: string) => {
      if (name === 'Others') {
        return isDarkMode ? '#9C27B0' : '#7B1FA2';
      }
      return `hsl(${200 + index * 25}, 70%, 55%)`;
    };
    
    const activeColor = getSegmentColor(activeIndex, activeSegment?.name || '');

    return (
      <Box sx={{ position: 'relative', width: '100%', height: 'auto' }}>
        {/* Pie chart with pulled-out active segment - MADE LARGER */}
        <Box sx={{ height: 300, width: '100%', position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <linearGradient id="othersGradientMobile" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={isDarkMode ? '#FFD700' : '#FFE57F'} />
                <stop offset="20%" stopColor={isDarkMode ? '#FF8C00' : '#FFA726'} />
                <stop offset="40%" stopColor={isDarkMode ? '#FF4500' : '#FF7043'} />
                <stop offset="60%" stopColor={isDarkMode ? '#4169E1' : '#5C6BC0'} />
                <stop offset="80%" stopColor={isDarkMode ? '#8A2BE2' : '#9575CD'} />
                <stop offset="100%" stopColor={isDarkMode ? '#4B0082' : '#673AB7'} />
              </linearGradient>
                {chartData.map((_, index) => (
                  <filter key={`shadow-${index}`} id={`shadow-${index}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow 
                      dx="0" 
                      dy="0" 
                      stdDeviation={activeIndex === index ? "3" : "0"}
                      floodColor={isDarkMode ? "#ffffff" : "#000000"}
                      floodOpacity={activeIndex === index ? "0.3" : "0"}
                    />
                  </filter>
                ))}
            </defs>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
                innerRadius={70}
                outerRadius={120}
              paddingAngle={2}
              strokeWidth={0}
              activeIndex={activeIndex}
                activeShape={(props: any) => {
                  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
                  
                  // Calculate position for pulled-out segment
                  const midAngle = (startAngle + endAngle) / 2;
                const RADIAN = Math.PI / 180;
                const sin = Math.sin(-midAngle * RADIAN);
                const cos = Math.cos(-midAngle * RADIAN);
                  const offsetX = cos * 15;
                  const offsetY = sin * 15;
                
                return (
                    <g>
                      <Sector
                        cx={cx + offsetX}
                        cy={cy + offsetY}
                        innerRadius={innerRadius}
                        outerRadius={outerRadius + 5}
                        startAngle={startAngle}
                        endAngle={endAngle}
                        fill={fill}
                        filter={`url(#shadow-${activeIndex})`}
                      />
                    </g>
                  );
                }}
                onClick={(_, index) => setActiveIndex(index)}
            >
              {chartData.map((entry, index) => {
                const percent = (entry.value / total * 100).toFixed(1);
                const tons = kgToTons(entry.value);
                const color = getSegmentColor(index, entry.name);
                const isActive = activeIndex === index;
                
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.name === 'Others' 
                      ? 'url(#othersGradientMobile)'
                      : `hsl(${200 + index * 25}, 70%, 55%)`}
                      opacity={isActive ? 1 : 0.7}
                  />
                );
              })}
            </Pie>
            {/* Show selected segment info in center instead of total */}
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              fill={isDarkMode ? '#fff' : '#333'}
              style={{
                pointerEvents: 'none'
              }}
            >
              <tspan
                x="50%"
                dy="-20"
                fontSize="14"
                fontWeight="600"
                textAnchor="middle"
                fill={activeColor}
              >
                {activeSegment?.name || ''}
              </tspan>
              <tspan
                x="50%"
                dy="24"
                fontSize="16"
                fontWeight="700"
                textAnchor="middle"
                fill={activeColor}
              >
                {activePercentage}%
              </tspan>
              <tspan
                x="50%"
                dy="24"
                fontSize="14"
                fontWeight="500"
                textAnchor="middle"
              >
                {activeSegment?.value.toLocaleString()} kg
              </tspan>
            </text>
          </PieChart>
        </ResponsiveContainer>
        </Box>

        {/* Enhanced supplier list with more compact active item */}
        <Box sx={{
          mx: 'auto', 
          maxWidth: '90%',
          mb: 1
        }}>
          <Box sx={{
            p: 1,
            borderRadius: 2,
            backgroundColor: isDarkMode ? 'rgba(20,20,20,0.8)' : 'rgba(245,245,245,0.9)',
            border: '1px solid',
            borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          }}>
            {chartData.map((entry, index) => {
              const percent = (entry.value / total * 100).toFixed(1);
              const tons = kgToTons(entry.value);
              const color = getSegmentColor(index, entry.name);
              const isActive = activeIndex === index;
                
              return (
                <Box 
                  key={index}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    py: isActive ? 1 : 0.5,
                    px: isActive ? 1.5 : 1,
                    borderRadius: 1,
                    mb: 0.5,
                    backgroundColor: isActive 
                      ? (isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)')
                      : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    },
                    borderLeft: '3px solid',
                    borderLeftColor: color,
                    overflow: 'hidden',
                    boxShadow: isActive ? (isDarkMode ? '0 2px 8px rgba(255,255,255,0.1)' : '0 2px 8px rgba(0,0,0,0.1)') : 'none',
                    transform: isActive ? 'scale(1.02)' : 'scale(1)'
                  }}
                  onClick={() => setActiveIndex(index)}
                >
                  {/* Main row - always visible */}
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    width: '100%'
                  }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      overflow: 'hidden',
                      width: '50%'
                    }}>
                      <Box 
                        sx={{ 
                          width: isActive ? 10 : 8,
                          height: isActive ? 10 : 8,
                          borderRadius: '50%', 
                          backgroundColor: color,
                          flexShrink: 0,
                          mr: 1
                        }} 
                      />
                      <Typography 
                        sx={{ 
                          fontWeight: isActive ? 600 : 500,
                          fontSize: isActive ? '0.9rem' : '0.8rem',
                          color: isActive ? color : (isDarkMode ? '#fff' : '#333'),
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {entry.name}
                      </Typography>
                    </Box>
                    <Box sx={{ 
                      display: 'flex', 
                      gap: 2,
                      justifyContent: 'flex-end',
                      width: '50%'
                    }}>
                      <Typography 
                        sx={{ 
                          fontWeight: isActive ? 600 : 500,
                          fontSize: isActive ? '0.9rem' : '0.8rem',
                          color: color,
                          textAlign: 'right',
                          width: '40%'
                        }}
                      >
                        {percent}%
                      </Typography>
                      <Typography 
                        sx={{ 
                          fontWeight: isActive ? 600 : 500,
                          fontSize: isActive ? '0.9rem' : '0.8rem',
                          color: color,
                          textAlign: 'right',
                          width: '40%'
                        }}
                      >
                        {tons}T
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Others Breakdown Box - only shown when Others is active */}
        {activeSegment?.name === 'Others' && otherSuppliers.length > 0 && (
          <Box sx={{ 
            mx: 'auto', 
            maxWidth: '90%',
            mb: 1
          }}>
            <Box sx={{
            p: 1.5,
              borderRadius: 2,
              backgroundColor: isDarkMode ? 'rgba(20,20,20,0.8)' : 'rgba(245,245,245,0.9)',
              border: '1px solid',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            }}>
            <Typography variant="subtitle2" gutterBottom sx={{ 
              background: 'linear-gradient(45deg, #FFD700, #FF8C00, #FF4500, #4169E1, #8A2BE2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 600,
              mb: 0.5
            }}>
              Others Breakdown:
            </Typography>
              
              {/* Display other suppliers with "T" instead of "Tons" */}
              {[
                ...memoizedSupplierConsumption.slice(5, 7),
                ...Object.entries(supplierData)
                  .map(([name, value]) => ({ name, value }))
                  .filter(supplier => supplier.name !== 'Others')
              ]
                .sort((a, b) => b.value - a.value)
                .map((supplier, index) => {
                  const percent = (supplier.value / total * 100).toFixed(1);
                  const tons = kgToTons(supplier.value);
                  const color = `hsl(${280 + index * 15}, 70%, 55%)`;
                    
                  return (
                    <Box 
                      key={index}
                        sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        py: 0.5,
                        px: 1,
                        borderRadius: 1,
                        mb: 0.5,
                        backgroundColor: 'transparent',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                        },
                        borderLeft: '3px solid',
                        borderLeftColor: color
                      }}
                    >
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        overflow: 'hidden',
                        width: '50%'
                      }}>
                        <Box 
                          sx={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            backgroundColor: color,
                            flexShrink: 0,
                            mr: 1
                          }} 
                        />
                        <Typography 
                          sx={{ 
                            fontWeight: 500,
                            fontSize: '0.8rem',
                            color: isDarkMode ? '#fff' : '#333',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {supplier.name}
                        </Typography>
                        </Box>
                      <Box sx={{ 
                        display: 'flex', 
                        gap: 2,
                        justifyContent: 'flex-end',
                        width: '50%'
                      }}>
                        <Typography 
                          sx={{ 
                            fontWeight: 500,
                            fontSize: '0.8rem',
                            color: color,
                            textAlign: 'right',
                            width: '40%'
                          }}
                        >
                          {percent}%
                      </Typography>
                        <Typography 
                          sx={{ 
                            fontWeight: 500,
                            fontSize: '0.8rem',
                            color: color,
                            textAlign: 'right',
                            width: '40%'
                          }}
                        >
                          {tons}T
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card sx={{ p: 2, borderRadius: 2 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <StatBox
                icon={<LocationOnIcon sx={{ fontSize: 40, color: theme => theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2' }} />}
                value={distributors.length}
                label="Total Distributors"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <StatBox
                icon={<CategoryIcon sx={{ fontSize: 40, color: theme => theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2' }} />}
                value={totalDesigns}
                label="Total Designs"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <StatBox
                icon={<InventoryIcon sx={{ fontSize: 40, color: theme => theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2' }} />}
                value={totalStock.toFixed(2)}
                unit="kgs"
                label="Total Stock"
              />
            </Grid>
            <Grid item xs={12} md={3}>
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
            {/* Unified Compact Catalog Design Filter */}
            <Box sx={{ 
              mb: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1
            }}>
              <Box sx={{ 
                display: 'flex',
                borderRadius: 24,
                overflow: 'hidden',
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                border: '1px solid',
                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                width: { xs: '100%', sm: 'auto' },
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
              }}>
                <Box
                  onClick={() => setCatalogDesignFilter('all')}
                  sx={{
                    px: { xs: 2, sm: 2.5 },
                    py: 1,
                    cursor: 'pointer',
                    backgroundColor: catalogDesignFilter === 'all' 
                      ? (isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)')
                      : 'transparent',
                    color: catalogDesignFilter === 'all' 
                      ? (isDarkMode ? '#fff' : '#000') 
                      : 'text.secondary',
                    fontWeight: catalogDesignFilter === 'all' ? 600 : 400,
                    fontSize: '0.85rem',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    borderRight: '1px solid',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    minWidth: { xs: '25%', sm: 'auto' }
                  }}
                >
                  All
                </Box>
                <Box
                  onClick={() => setCatalogDesignFilter('Liner')}
                  sx={{
                    px: { xs: 2, sm: 2.5 },
                    py: 1,
                    cursor: 'pointer',
                    backgroundColor: catalogDesignFilter === 'Liner' 
                      ? (isDarkMode ? 'rgba(255,152,0,0.2)' : 'rgba(255,152,0,0.1)')
                      : 'transparent',
                    color: catalogDesignFilter === 'Liner' 
                      ? '#ff9800' 
                      : 'text.secondary',
                    fontWeight: catalogDesignFilter === 'Liner' ? 600 : 400,
                    fontSize: '0.85rem',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    borderRight: '1px solid',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    minWidth: { xs: '25%', sm: 'auto' }
                  }}
                >
                  Liner
                </Box>
                <Box
                  onClick={() => setCatalogDesignFilter('0.8MM')}
                  sx={{
                    px: { xs: 2, sm: 2.5 },
                    py: 1,
                    cursor: 'pointer',
                    backgroundColor: catalogDesignFilter === '0.8MM' 
                      ? (isDarkMode ? 'rgba(156,39,176,0.2)' : 'rgba(156,39,176,0.1)')
                      : 'transparent',
                    color: catalogDesignFilter === '0.8MM' 
                      ? (isDarkMode ? '#ce93d8' : '#7b1fa2') 
                      : 'text.secondary',
                    fontWeight: catalogDesignFilter === '0.8MM' ? 600 : 400,
                    fontSize: '0.85rem',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    borderRight: '1px solid',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    minWidth: { xs: '25%', sm: 'auto' }
                  }}
                >
                  0.8MM
                </Box>
                <Box
                  onClick={() => setCatalogDesignFilter('1MM')}
                  sx={{
                    px: { xs: 2, sm: 2.5 },
                    py: 1,
                    cursor: 'pointer',
                    backgroundColor: catalogDesignFilter === '1MM' 
                      ? (isDarkMode ? 'rgba(33,150,243,0.2)' : 'rgba(33,150,243,0.1)')
                      : 'transparent',
                    color: catalogDesignFilter === '1MM' 
                      ? (isDarkMode ? '#90caf9' : '#1976d2') 
                      : 'text.secondary',
                    fontWeight: catalogDesignFilter === '1MM' ? 600 : 400,
                    fontSize: '0.85rem',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    minWidth: { xs: '25%', sm: 'auto' }
                  }}
                >
                  1MM
                </Box>
              </Box>
              
              {catalogDesignFilter !== 'all' && (
                <Typography variant="caption" sx={{ 
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                  fontStyle: 'italic'
                }}>
                  {catalogDesignFilter === 'Liner' && 'Showing only Liner designs'}
                  {catalogDesignFilter === '0.8MM' && 'Showing Artvio and Woodrica designs'}
                  {catalogDesignFilter === '1MM' && 'Showing only 1MM designs'}
                </Typography>
              )}
            </Box>

            {/* Mobile View - More Compact Layout */}
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              {/* Compact Toggle for Consumption/Purchases and Filters */}
              <Box sx={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                mb: 2
              }}>
                <Box sx={{ 
                  display: 'flex',
                  borderRadius: 4,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                  width: '100%'
                }}>
                  <Box
                    onClick={() => setVisibleGraphs(prev => ({ ...prev, consumption: !prev.consumption }))}
                    sx={{
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      padding: '8px 12px',
                      flex: 1,
                      backgroundColor: isDarkMode ? '#7E57C2' : '#5E35B1',
                      opacity: visibleGraphs.consumption ? 1 : 0.6,
                      borderRight: '1px solid',
                      borderColor: 'rgba(255,255,255,0.2)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Typography sx={{ 
                      fontSize: '0.95rem', 
                      fontWeight: 500, 
                      color: '#fff',
                      textAlign: 'center'
                    }}>
                      Consumption {visibleGraphs.consumption ? '✓' : ''}
                    </Typography>
                  </Box>
                  <Box
                    onClick={() => setVisibleGraphs(prev => ({ ...prev, purchases: !prev.purchases }))}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      padding: '8px 12px',
                      flex: 1,
                      backgroundColor: isDarkMode ? '#4CAF50' : '#2E7D32',
                      opacity: visibleGraphs.purchases ? 1 : 0.6,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Typography sx={{ 
                      fontSize: '0.95rem', 
                      fontWeight: 500, 
                      color: '#fff',
                      textAlign: 'center'
                    }}>
                      Purchases {visibleGraphs.purchases ? '✓' : ''}
                    </Typography>
                  </Box>
                </Box>
                
                {/* Filters in a single row */}
                <Stack 
                  direction="row" 
                  spacing={1.5}
                  sx={{ width: '100%' }}
                >
                  <FormControl 
                    size="small" 
                    sx={{ 
                      flex: 1,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 28,
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        fontWeight: 500,
                        fontSize: '0.85rem',
                      },
                      '& .MuiSelect-select': {
                        py: 0.75,
                        fontSize: '0.85rem',
                      }
                    }}
                  >
                    <InputLabel>Supplier</InputLabel>
                  <Select
                    value={filterType === 'supplier' ? filterValue : ''}
                    onChange={(e) => {
                      setFilterType('supplier');
                      setFilterValue(e.target.value);
                      if (!e.target.value) {
                        setFilterType('none');
                      }
                    }}
                      label="Supplier"
                  >
                    <MenuItem value="">All Suppliers</MenuItem>
                    {suppliers.map((supplier) => (
                      <MenuItem key={supplier} value={supplier}>{supplier}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                  <FormControl 
                    size="small" 
                    sx={{ 
                      flex: 1,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 28,
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        fontWeight: 500,
                        fontSize: '0.85rem',
                      },
                      '& .MuiSelect-select': {
                        py: 0.75,
                        fontSize: '0.85rem',
                      }
                    }}
                  >
                    <InputLabel>Category</InputLabel>
                  <Select
                    value={filterType === 'category' ? filterValue : ''}
                    onChange={(e) => {
                      setFilterType('category');
                      setFilterValue(e.target.value);
                      if (!e.target.value) {
                        setFilterType('none');
                      }
                    }}
                      label="Category"
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>{category}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                </Stack>
              </Box>
            </Box>

            {/* Desktop View - Original Layout */}
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              justifyContent="space-between" 
              alignItems={{ xs: 'stretch', sm: 'center' }}
              mb={2}
              gap={2}
              sx={{ display: { xs: 'none', md: 'flex' } }}
            >
              {/* Removed duplicate Catalog Design Filter for Desktop */}
              
              <Box sx={{ 
                display: 'flex',
                borderRadius: 4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                overflow: 'hidden',
              }}>
                <Box
                  onClick={() => setVisibleGraphs(prev => ({ ...prev, consumption: !prev.consumption }))}
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    padding: '8px 16px',
                    backgroundColor: isDarkMode ? '#7E57C2' : '#5E35B1',
                    opacity: visibleGraphs.consumption ? 1 : 0.6,
                    borderRight: '1px solid',
                    borderColor: 'rgba(255,255,255,0.2)',
                  }}
                >
                  <Typography sx={{ 
                    fontSize: 14, 
                    fontWeight: 500, 
                    color: '#fff' 
                  }}>
                    Consumption {visibleGraphs.consumption ? '✓' : ''}
                  </Typography>
                </Box>
                <Box
                  onClick={() => setVisibleGraphs(prev => ({ ...prev, purchases: !prev.purchases }))}
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    padding: '8px 16px',
                    backgroundColor: isDarkMode ? '#4CAF50' : '#2E7D32',
                    opacity: visibleGraphs.purchases ? 1 : 0.6,
                  }}
                >
                  <Typography sx={{ 
                    fontSize: 14, 
                    fontWeight: 500, 
                    color: '#fff' 
                  }}>
                    Purchases {visibleGraphs.purchases ? '✓' : ''}
                  </Typography>
                </Box>
              </Box>
            </Stack>

            <Box sx={{ 
              height: 450,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              '& .recharts-wrapper': {
                width: '100% !important',
                margin: '0 auto'
              }
            }}>
              <ResponsiveContainer>
                <ComposedChart
                  data={getMonthlyConsumption()}
                  margin={{ top: 15, right: 15, left: 5, bottom: 40 }}
                  barGap={4}
                  barCategoryGap={10}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'} 
                    vertical={false}
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
                            dy={10}
                            textAnchor="end"
                            fill={isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'}
                            transform="rotate(-35)"
                            fontSize={11}
                            fontWeight="500"
                          >
                            {payload.value}
                          </text>
                        </g>
                      );
                    }}
                    axisLine={{ stroke: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }}
                    tickLine={false}
                    interval={0}
                    height={60}
                    tickMargin={5}
                  />
                  <YAxis 
                    tick={{ 
                      fill: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                      fontSize: 11,
                      fontWeight: 500
                    }}
                    axisLine={{ stroke: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }}
                    tickLine={false}
                    width={40}
                    tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(1)}k` : value}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
                      border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                      borderRadius: '8px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                      padding: '8px 12px'
                    }}
                    labelStyle={{ 
                      color: isDarkMode ? '#fff' : '#333',
                      fontWeight: 600,
                      marginBottom: '4px',
                      borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                      paddingBottom: '4px'
                    }}
                    itemStyle={{
                      padding: '2px 0',
                      fontSize: '12px'
                    }}
                    formatter={(value: any) => [`${value.toLocaleString()} kg`, null]}
                  />
                  {visibleGraphs.consumption && (
                    <Bar 
                      dataKey="amount" 
                      fill={isDarkMode ? '#7E57C2' : '#5E35B1'} 
                      name="Consumption"
                      barSize={24}
                      radius={[4, 4, 0, 0]}
                      opacity={0.9}
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
                      barSize={24}
                      radius={[4, 4, 0, 0]}
                      opacity={0.9}
                    />
                  )}
                  <ReferenceLine
                    y={getMonthlyConsumption()[0]?.average}
                    stroke={isDarkMode ? '#FFB74D' : '#F57C00'}
                    strokeDasharray="3 3"
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <Typography 
                sx={{ 
                  color: isDarkMode ? '#FFB74D' : '#F57C00',
                  mt: 0,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Box component="span" sx={{ 
                  width: 8, 
                  height: 2, 
                  backgroundColor: isDarkMode ? '#FFB74D' : '#F57C00',
                  display: 'inline-block',
                  marginRight: '4px'
                }}/>
                Average: {getMonthlyConsumption()[0]?.average?.toLocaleString()} kg
              </Typography>
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
                {`Top Suppliers of ${timeFrame === 'all' ? 'All Time' : timeFrame}`}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                <FormControl 
                  size="small" 
                  sx={{ 
                    width: '180px',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 28,
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      fontWeight: 500,
                    },
                    '& .MuiSelect-select': {
                      py: 1,
                    }
                  }}
                >
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
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '180px' }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => setSupplierChartView(prev => 
                      prev === 'consumption' ? 'purchases' : 'consumption'
                    )}
                    startIcon={<BarChartIcon />}
                    sx={{
                      borderRadius: 28,
                      px: 2,
                      py: 0.75,
                      width: '100%',
                      backgroundColor: supplierChartView === 'consumption' 
                        ? (isDarkMode ? '#7E57C2' : '#5E35B1') 
                        : (isDarkMode ? '#4CAF50' : '#2E7D32'),
                      '&:hover': {
                        backgroundColor: supplierChartView === 'consumption' 
                          ? (isDarkMode ? '#6A1B9A' : '#4527A0') 
                          : (isDarkMode ? '#388E3C' : '#1B5E20'),
                      },
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      transition: 'all 0.3s ease',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {supplierChartView === 'consumption' ? 'CONSUMPTION' : 'PURCHASES'}
                  </Button>
                  
                  {/* Add back the total display below the toggle button */}
                  <Box sx={{ 
                    textAlign: 'center', 
                    p: 0.75,
                    borderRadius: 2,
                    backgroundColor: isDarkMode ? 'rgba(20,20,20,0.6)' : 'rgba(245,245,245,0.7)',
                    width: '100%',
                  }}>
                    <Typography sx={{ 
                      fontWeight: 600, 
                      fontSize: '0.85rem',
                      color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'
                    }}>
                      Total: 
                      <Box component="span" sx={{ 
                        ml: 1,
                        color: supplierChartView === 'consumption' 
                          ? (isDarkMode ? '#9575CD' : '#5E35B1')
                          : (isDarkMode ? '#81C784' : '#2E7D32'),
                        fontWeight: 700
                      }}>
                        {activeSupplierData.reduce((sum, item) => sum + item.value, 0).toLocaleString()} kg
                      </Box>
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Stack>

            {/* Mobile View */}
            <Box sx={{ 
              display: { xs: 'block', md: 'none' } // Show only on mobile
            }}>
              <MobilePieChart data={activeSupplierData} />
            </Box>

            {/* Desktop View */}
            <Box sx={{ 
              display: { xs: 'none', md: 'block' } // Show only on desktop
            }}>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <defs>
                    <linearGradient id="othersGradientDesktop" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={isDarkMode ? '#FFD700' : '#FFE57F'} />
                      <stop offset="20%" stopColor={isDarkMode ? '#FF8C00' : '#FFA726'} />
                      <stop offset="40%" stopColor={isDarkMode ? '#FF4500' : '#FF7043'} />
                      <stop offset="60%" stopColor={isDarkMode ? '#4169E1' : '#5C6BC0'} />
                      <stop offset="80%" stopColor={isDarkMode ? '#8A2BE2' : '#9575CD'} />
                      <stop offset="100%" stopColor={isDarkMode ? '#4B0082' : '#673AB7'} />
                    </linearGradient>
                    {activeSupplierData.map((_, index) => (
                      <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={`hsl(${200 + index * 25}, 70%, 55%)`} />
                        <stop offset="100%" stopColor={`hsl(${200 + index * 25}, 80%, 35%)`} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={activeSupplierData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={140}
                    paddingAngle={2}
                    strokeWidth={0}
                    activeIndex={activeIndex}
                    activeShape={(props: any) => {
                      const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, name, value } = props;
                      
                      // Calculate position for pulled-out segment
                      const midAngle = (startAngle + endAngle) / 2;
                      const RADIAN = Math.PI / 180;
                      const sin = Math.sin(-midAngle * RADIAN);
                      const cos = Math.cos(-midAngle * RADIAN);
                      const offsetX = cos * 15;
                      const offsetY = sin * 15;
                      
                      return (
                        <g>
                          <Sector
                            cx={cx + offsetX}
                            cy={cy + offsetY}
                            innerRadius={innerRadius}
                            outerRadius={outerRadius + 5}
                            startAngle={startAngle}
                            endAngle={endAngle}
                            fill={fill}
                            filter={`url(#shadow-${activeIndex})`}
                          />
                        </g>
                      );
                    }}
                    onClick={(_, index) => setActiveIndex(index)}
                  >
                    {activeSupplierData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={entry.name === 'Others' 
                          ? 'url(#othersGradientDesktop)'
                          : `url(#gradient-${index})`}
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
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isDarkMode ? '#fff' : '#333'}
                    style={{
                      pointerEvents: 'none'
                    }}
                  >
                    <tspan
                      x="50%"
                      dy="-20"
                      fontSize="16"
                      fontWeight="600"
                      textAnchor="middle"
                      fill={activeSupplierData[activeIndex]?.name === 'Others' 
                        ? (isDarkMode ? '#9C27B0' : '#7B1FA2')
                        : `hsl(${200 + activeIndex * 25}, 70%, 55%)`}
                    >
                      {activeSupplierData[activeIndex]?.name || ''}
                    </tspan>
                    <tspan
                      x="50%"
                      dy="24"
                      fontSize="18"
                      fontWeight="700"
                      textAnchor="middle"
                      fill={activeSupplierData[activeIndex]?.name === 'Others' 
                        ? (isDarkMode ? '#9C27B0' : '#7B1FA2')
                        : `hsl(${200 + activeIndex * 25}, 70%, 55%)`}
                    >
                      {((activeSupplierData[activeIndex]?.value || 0) / activeSupplierData.reduce((sum, item) => sum + item.value, 0) * 100).toFixed(1)}%
                    </tspan>
                    <tspan
                      x="50%"
                      dy="24"
                      fontSize="16"
                      fontWeight="500"
                      textAnchor="middle"
                    >
                      {(activeSupplierData[activeIndex]?.value || 0).toLocaleString()} kg
                    </tspan>
                  </text>
                  <Legend
                    content={() => {
                      const othersData = activeSupplierData.find(item => item.name === 'Others');
                      if (!othersData) return null;
                      
                      const total = activeSupplierData.reduce((sum, item) => sum + item.value, 0);
                      const othersSuppliers = Object.entries(supplierData)
                        .sort((a, b) => b[1] - a[1])
                        .map(([name, value]) => ({
                          name,
                          value,
                          percentage: (value / total * 100).toFixed(1)
                        }));

                      // Calculate Others segment position
                      const RADIAN = Math.PI / 180;
                      const othersIndex = activeSupplierData.findIndex(item => item.name === 'Others');
                      const startAngle = othersIndex * (360 / activeSupplierData.length) * RADIAN;
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