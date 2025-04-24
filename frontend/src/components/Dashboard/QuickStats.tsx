import React, { useState, useMemo, useCallback } from 'react';
import { Box, Card, CardContent, Grid, Typography, FormControl, InputLabel, Select, MenuItem, Button, Stack, IconButton, Menu, Popover, Paper } from '@mui/material';
import { InventoryItem } from '../Inventory/InventoryList';
import InventoryIcon from '@mui/icons-material/Inventory';
import BarChartIcon from '@mui/icons-material/BarChart';
import CategoryIcon from '@mui/icons-material/Category';
import BusinessIcon from '@mui/icons-material/Business';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Bar, ReferenceLine, Legend, Tooltip, PieChart, Pie, Cell, Sector, Label } from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import { aggregateMonthlyConsumption } from '../../utils/consumption';
import { Transaction } from '../../types/transaction';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { Distributor } from '../../types/distributor';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

interface QuickStatsProps {
  inventory: InventoryItem[];
  distributors?: Distributor[];
}

// Move this function outside of MobilePieChart to the component level so it can be reused
const getChartColors = (isDarkMode: boolean, supplierChartView: 'consumption' | 'purchases', index: number, name: string) => {
  if (name === 'Others') {
    // Make the "Others" segment a unique teal/turquoise color - distinct from any other palette color
    return isDarkMode ? '#00796B' : '#009688'; 
  }
  
  // Define two completely different color palettes for better distinction between segments
  const colorPalettes = {
    consumption: [
      isDarkMode ? '#3B7EA1' : '#4A8CAF', // Primary slate blue (keep this as it matches the bar chart)
      isDarkMode ? '#D26363' : '#E57373', // Red
      isDarkMode ? '#827717' : '#9E9D24', // Olive
      isDarkMode ? '#8E24AA' : '#AB47BC', // Purple (adjusted to not conflict with Others)
      isDarkMode ? '#E67C13' : '#F57C00', // Orange
      isDarkMode ? '#1565C0' : '#1976D2', // Bright blue
      isDarkMode ? '#558B2F' : '#689F38'  // Green
    ],
    purchases: [
      isDarkMode ? '#5D9D7E' : '#68B090', // Primary sage green (keep this as it matches the bar chart)
      isDarkMode ? '#D84315' : '#E64A19', // Deep orange
      isDarkMode ? '#5E35B1' : '#673AB7', // Deep purple
      isDarkMode ? '#0277BD' : '#0288D1', // Light blue (adjusted to not conflict with Others)
      isDarkMode ? '#C62828' : '#D32F2F', // Deep red
      isDarkMode ? '#F9A825' : '#FBC02D', // Amber
      isDarkMode ? '#2E7D32' : '#388E3C'  // Green
    ]
  };
  
  // Select the appropriate color palette based on the chart type
  const colors = supplierChartView === 'consumption' 
    ? colorPalettes.consumption 
    : colorPalettes.purchases;
  
  return colors[index % colors.length];
};

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
  const [customDateRange, setCustomDateRange] = useState<{start: string, end: string} | null>(null);
  // Add a new state to track if the custom menu is open
  const [customMenuOpen, setCustomMenuOpen] = useState(false);
  // Add a new state for chart time range view
  const [chartTimeRange, setChartTimeRange] = useState<'recent' | 'all'>('recent');
  // Add month picker anchor and state
  const [monthPickerAnchor, setMonthPickerAnchor] = useState<null | HTMLElement>(null);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

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

  // Memoize getMonthlyConsumption to avoid recalculating on every render
  const monthlyConsumption = React.useMemo(() => {
    // This implementation should be identical to getMonthlyConsumption
    // I'll keep the existing function for backward compatibility
    let monthlyData: { month: string; amount: number; average?: number }[] = [];
    
    // Group inventory items by month
    const consumptionByMonth = new Map<string, { total: number; count: number }>();
    
    filteredInventory.forEach(item => {
      // Skip items with no transactions
      if (!item.transactions || item.transactions.length === 0) return;
      
      item.transactions.forEach(transaction => {
        // Only consider OUT transactions as consumption
        if (transaction.type !== 'OUT') return;
        
        const month = new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        if (!consumptionByMonth.has(month)) {
          consumptionByMonth.set(month, { total: 0, count: 0 });
        }
        
        const monthData = consumptionByMonth.get(month)!;
        monthData.total += transaction.quantity;
        monthData.count += 1;
      });
    });
    
    // Calculate average across all months
    let totalConsumption = 0;
    let totalCount = 0;
    
    consumptionByMonth.forEach(data => {
      totalConsumption += data.total;
      totalCount += 1;
    });
    
    const overallAverage = totalCount > 0 ? totalConsumption / totalCount : 0;
    
    // Convert map to array and sort by date
    monthlyData = Array.from(consumptionByMonth.entries()).map(([month, data]) => ({
      month,
      amount: data.total,
      average: overallAverage
    }));
    
    // Sort by date (oldest to newest)
    monthlyData.sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });
    
    return monthlyData;
  }, [filteredInventory]);
  
  // Original function kept for backward compatibility
  const getMonthlyConsumption = () => monthlyConsumption;
  
  // Memoize aggregateMonthlyPurchases to avoid recalculating on every render
  const monthlyPurchases = React.useMemo(() => {
    // Extract all transactions from the filtered inventory
    const transactions = filteredInventory.flatMap(item => item.transactions || []);
    
    // This implementation should be identical to aggregateMonthlyPurchases
    // I'll keep the original function for backward compatibility
    const purchasesByMonth = new Map<string, number>();
  
    transactions.forEach(transaction => {
      if (transaction.type !== 'IN') return;
      
      const month = new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      if (!purchasesByMonth.has(month)) {
        purchasesByMonth.set(month, 0);
      }
      
      purchasesByMonth.set(month, purchasesByMonth.get(month)! + transaction.quantity);
    });
    
    // Convert to array and sort by date
    const monthlyData = Array.from(purchasesByMonth.entries()).map(([month, amount]) => ({
      month,
      amount
    }));
    
    // Sort by date (oldest to newest)
    monthlyData.sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });
    
    return monthlyData;
  }, [filteredInventory]);
  
  // Original function kept for backward compatibility
  const aggregateMonthlyPurchases = (_transactions: Transaction[]) => monthlyPurchases;

  const getSupplierConsumption = (topCount: number = 7) => {
    const allSupplierData: Record<string, number> = {};
    
    filteredInventory.forEach(item => {
      if (!item.supplier || !item.transactions) return;
      
      const consumption = item.transactions
        .filter(t => {
          if (t.type !== 'OUT') return false;
          
          // Handle different time frame types
          if (timeFrame === 'all') return true;
          
          const transactionDate = new Date(t.date);
          const formattedDate = transactionDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short' 
          });
          
          // Handle custom selection
          if (timeFrame === 'custom') {
            return selectedMonths.includes(formattedDate);
          } else {
            // It's a specific month
            return formattedDate === timeFrame;
          }
        })
        .reduce((sum, t) => sum + Number(t.quantity), 0);
      
      if (consumption > 0) {
        const shortName = item.supplier.split(' ')[0];
        allSupplierData[shortName] = (allSupplierData[shortName] || 0) + consumption;
      }
    });

    // Rest of the function remains the same
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
          
          // Handle different time frame types
          if (timeFrame === 'all') return true;
          
          const transactionDate = new Date(t.date);
          const formattedDate = transactionDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short' 
          });
          
          // Handle custom selection
          if (timeFrame === 'custom') {
            return selectedMonths.includes(formattedDate);
          } else {
            // It's a specific month
            return formattedDate === timeFrame;
          }
        })
        .reduce((sum, t) => sum + Number(t.quantity), 0);
      
      if (purchases > 0) {
        const shortName = item.supplier.split(' ')[0];
        allSupplierData[shortName] = (allSupplierData[shortName] || 0) + purchases;
      }
    });

    // Rest of the function remains the same
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

  const memoizedSupplierConsumption = useMemo(() => 
    getSupplierConsumption(7), 
    [filteredInventory, timeFrame, selectedMonths]
  );

  const memoizedSupplierPurchases = useMemo(() => 
    getSupplierPurchases(7), 
    [filteredInventory, timeFrame, selectedMonths]
  );

  const activeSupplierData = useMemo(() => 
    supplierChartView === 'consumption' ? memoizedSupplierConsumption : memoizedSupplierPurchases, 
    [memoizedSupplierConsumption, memoizedSupplierPurchases, supplierChartView]
  );

  const StatBox = ({ icon, value, unit, label }: { icon: React.ReactNode, value: string | number, unit?: string, label: string }) => (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 2,
      p: 0,
      borderRadius: 2,
      transition: 'all 0.2s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
      }
    }}>
      <Box sx={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 48,
        borderRadius: 2,
        background: isDarkMode 
          ? 'linear-gradient(145deg, #2d3748, #1a202c)'
          : 'linear-gradient(145deg, #f8f9fa, #ffffff)',
        boxShadow: `0 3px 10px ${isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.06)'}`,
        border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}`,
      }}>
        {icon}
      </Box>
      <Box>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 600, 
            fontSize: '1.3rem',
            display: 'flex', 
            alignItems: 'baseline', 
            gap: 0.5,
            color: isDarkMode ? '#fff' : '#2d3748',
            lineHeight: 1.2,
            mb: 0.5
          }}
        >
          {value}
          {unit && (
            <Typography 
              component="span" 
              sx={{ 
                fontSize: '0.75rem', 
                color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                fontWeight: 500,
                ml: 0.5
              }}
            >
              {unit}
            </Typography>
          )}
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
            fontSize: '0.75rem',
            lineHeight: 1.1
          }}
        >
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
            bgcolor: isDarkMode ? '#3B7EA1' : '#4A8CAF' // Updated to slate blue
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
            bgcolor: isDarkMode ? '#5D9D7E' : '#68B090' // Updated to sage green
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
            fill={isDarkMode ? '#78A7BF' : '#3B7EA1'}
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
            fill={isDarkMode ? '#8ABE9F' : '#5D9D7E'}
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

  // Optimize filteredChartData with memoized calculations
  const filteredChartData = React.useMemo(() => {
    // Only process data if we have valid data to work with
    if (!monthlyConsumption.length && !monthlyPurchases.length) {
      return { consumptionData: [], purchasesData: [] };
    }
    
    // Create a Map for faster lookups
    const allMonthsMap = new Map();
    
    // Add all months to the map with a single iteration for each array
    monthlyConsumption.forEach(d => allMonthsMap.set(d.month, true));
    monthlyPurchases.forEach(d => allMonthsMap.set(d.month, true));
    
    // Convert map keys to array and sort once
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const sortedMonths = Array.from(allMonthsMap.keys()).sort((a, b) => {
      // Handle consistent date parsing across all browsers and devices
      // Split the month string (e.g., "Jan 2025") into month and year
      const [monthA, yearA] = a.split(' ');
      const [monthB, yearB] = b.split(' ');
      
      // Convert month names to month numbers (0-11)
      const monthNumA = monthNames.indexOf(monthA);
      const monthNumB = monthNames.indexOf(monthB);
      
      // Compare years first, then months
      return Number(yearA) !== Number(yearB) 
        ? Number(yearA) - Number(yearB) 
        : monthNumA - monthNumB;
    });
    
    // Create lookup Maps for faster access instead of filtering arrays repeatedly
    const consumptionMap = new Map(monthlyConsumption.map(item => [item.month, item]));
    const purchasesMap = new Map(monthlyPurchases.map(item => [item.month, item]));
    
    // Get months based on the time range setting
    const months = chartTimeRange === 'recent' ? sortedMonths.slice(-4) : sortedMonths;
    
    // Map the months to their data points efficiently
    const consumptionData = months.map(month => 
      consumptionMap.has(month) ? consumptionMap.get(month) : { month, amount: 0, average: monthlyConsumption[0]?.average || 0 }
    );
    
    const purchasesData = months.map(month => 
      purchasesMap.has(month) ? purchasesMap.get(month) : { month, amount: 0 }
    );
    
    return {
      consumptionData,
      purchasesData
    };
  }, [chartTimeRange, monthlyConsumption, monthlyPurchases]);
  
  // Convert to inline function to eliminate unnecessary function call overhead
  const getFilteredChartData = React.useCallback(() => filteredChartData, [filteredChartData]);

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
      return getChartColors(isDarkMode, supplierChartView, index, name);
    };
    
    const activeColor = getSegmentColor(activeIndex, activeSegment?.name || '');

    return (
      <Box sx={{ position: 'relative', width: '100%', height: 'auto' }}>
        {/* Pie chart with pulled-out active segment - MADE LARGER */}
        <Box sx={{ height: 300, width: '100%', position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {/* Create pattern for "Others" segment - crosshatch pattern */}
              <pattern id="othersPatternMobile" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                <rect width="8" height="8" fill={isDarkMode ? '#00796B' : '#009688'} />
                <line x1="0" y1="0" x2="0" y2="8" stroke={isDarkMode ? '#E0F2F1' : '#004D40'} strokeWidth="1.5" strokeOpacity="0.5" />
              </pattern>
              {/* Add a second pattern with perpendicular lines for a crosshatch effect */}
              <pattern id="othersPatternCrossMobile" patternUnits="userSpaceOnUse" width="8" height="8">
                <rect width="8" height="8" fill="url(#othersPatternMobile)" />
                <line x1="0" y1="4" x2="8" y2="4" stroke={isDarkMode ? '#E0F2F1' : '#004D40'} strokeWidth="1" strokeOpacity="0.5" />
              </pattern>
              <linearGradient id="othersGradientMobile" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={isDarkMode ? '#00796B' : '#009688'} /> {/* Teal for Others */}
                <stop offset="100%" stopColor={isDarkMode ? '#00796B' : '#009688'} opacity={0.8} />
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
              {/* Add glow filters for active segments */}
              {chartData.map((entry, index) => (
                <filter key={`glow-${index}`} id={`glow-${index}`} x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feFlood 
                    floodColor={getSegmentColor(index, entry.name)} 
                    floodOpacity={activeIndex === index ? "0.5" : "0"} 
                    result="color" 
                  />
                  <feComposite in="color" in2="blur" operator="in" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
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
                      ? 'url(#othersPatternCrossMobile)'
                      : color}
                    opacity={isActive ? 1 : 0.7}
                    filter={isActive ? `url(#glow-${index})` : undefined}
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
                {activeSegment?.name === 'Others' 
                  ? 'Others'
                  : activeSegment?.name || ''}
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

  // Get all available months for the month picker
  const availableMonths = useMemo(() => {
    const dates = new Set(
      filteredInventory
        .flatMap(item => item.transactions || [])
        .map(t => new Date(t.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }))
    );
    
    // Sort months in chronological order
    return Array.from(dates)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [filteredInventory]);

  // Modify the timeFrameOptions to be more compact
  const timeFrameOptions = useMemo(() => {
    // Get individual months
    const dates = new Set(
      filteredInventory
        .flatMap(item => item.transactions || [])
        .map(t => new Date(t.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }))
    );
    
    // Sort months in descending order
    const individualMonths = Array.from(dates)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => ({ value: date, label: date }));
    
    // Return the restructured options
    return [
      { value: 'all', label: 'All Time' },
      { value: 'custom', label: 'Custom Selection' },
      { value: 'divider_months', label: 'Individual Months', isDivider: true },
      ...individualMonths
    ];
  }, [filteredInventory]);

  // Handle month selection 
  const handleMonthClick = (month: string) => {
    if (selectedMonths.includes(month)) {
      setSelectedMonths(selectedMonths.filter(m => m !== month));
    } else {
      setSelectedMonths([...selectedMonths, month]);
    }
  };

  // Apply selected months
  const applyCustomSelection = () => {
    if (selectedMonths.length > 0) {
      setTimeFrame('custom');
    } else {
      setTimeFrame('all');
    }
    setMonthPickerAnchor(null);
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card sx={{ 
          p: 1.5, 
          borderRadius: 2,
          background: isDarkMode 
            ? 'linear-gradient(145deg, #252d3b, #1e2430)'
            : 'linear-gradient(145deg, #f4f6f8, #ffffff)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}`,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(to right, #3B7EA1, #68B090)',
            borderTopLeftRadius: '8px',
            borderTopRightRadius: '8px',
          }
        }}>
          <Grid container spacing={0}>
            <Grid item xs={12} sm={6} md={3} sx={{ 
              p: { xs: 0.75, sm: 1 },
              borderRight: { xs: 'none', md: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}` }
            }}>
              <StatBox
                icon={<LocationOnIcon sx={{ fontSize: 26, color: isDarkMode ? '#90caf9' : '#3B7EA1' }} />}
                value={distributors.length}
                label="Total Distributors"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3} sx={{ 
              p: { xs: 0.75, sm: 1 },
              borderRight: { xs: 'none', md: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}` }
            }}>
              <StatBox
                icon={<CategoryIcon sx={{ fontSize: 26, color: isDarkMode ? '#ce93d8' : '#7e57c2' }} />}
                value={totalDesigns}
                label="Total Designs"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3} sx={{ 
              p: { xs: 0.75, sm: 1 },
              borderRight: { xs: 'none', md: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}` }
            }}>
              <StatBox
                icon={<InventoryIcon sx={{ fontSize: 26, color: isDarkMode ? '#ffb74d' : '#f57c00' }} />}
                value={totalStock.toFixed(2)}
                unit="kgs"
                label="Total Stock"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3} sx={{ p: { xs: 0.75, sm: 1 } }}>
              <StatBox
                icon={<BarChartIcon sx={{ fontSize: 26, color: isDarkMode ? '#81c784' : '#388e3c' }} />}
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
            : '0 4px 20px rgba(0,0,0,0.1)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            boxShadow: isDarkMode 
              ? '0 6px 25px rgba(0,0,0,0.35)' 
              : '0 6px 25px rgba(0,0,0,0.15)',
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: isDarkMode 
              ? 'linear-gradient(rgba(30, 30, 30, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(30, 30, 30, 0.03) 1px, transparent 1px)' 
              : 'linear-gradient(rgba(0, 0, 0, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.02) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            pointerEvents: 'none',
            zIndex: 0
          }
        }}>
          <Box 
            sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              height: '4px', 
              background: 'linear-gradient(90deg, #3B7EA1, #5D9D7E)', 
              zIndex: 2 
            }} 
          />
          <CardContent sx={{ 
            pb: 2, // Reduce bottom padding
            '&:last-child': { pb: 2 }, // Override MUI's default padding
            position: 'relative',
            zIndex: 1,
            pt: 3 // Extra top padding to account for the colored bar
          }}>
            {/* Unified Compact Catalog Design Filter */}
            <Box sx={{ 
              mb: 2, // Reduced margin
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
                  overflow: 'hidden',
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  border: '1px solid',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                  width: '100%',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
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
                      backgroundColor: isDarkMode ? '#3B7EA1' : '#4A8CAF', // Slate blue
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
                      backgroundColor: isDarkMode ? '#5D9D7E' : '#68B090', // Sage green
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
                
                {/* Mobile Filter Controls */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {/* Filter Controls Row - Changed to horizontal layout */}
                  <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1.5 }}>
                    {/* Filter by Supplier */}
                    <FormControl 
                      size="small" 
                      sx={{ 
                        flex: 1,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 28,
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        },
                        '& .MuiInputLabel-root': {
                          fontWeight: 500,
                          fontSize: '0.75rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          transform: 'translate(14px, -9px) scale(0.75)',
                          '&.MuiInputLabel-shrink': {
                            transform: 'translate(14px, -9px) scale(0.75)',
                          }
                        },
                        '& .MuiSelect-select': {
                          py: 0.75,
                          fontSize: '0.8rem',
                          paddingTop: '10px',
                        }
                      }}
                    >
                      <InputLabel 
                        sx={{ 
                          backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                          px: 0.5,
                          borderRadius: 1,
                          backdropFilter: 'blur(4px)',
                          fontSize: '0.85rem',
                          fontWeight: 600
                        }}
                      >
                        Supplier
                      </InputLabel>
                      <Select
                        value={filterType === 'supplier' ? filterValue : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            setFilterType('supplier');
                            setFilterValue(e.target.value);
                          } else {
                            setFilterType('none');
                            setFilterValue('');
                          }
                        }}
                        label="Supplier"
                        displayEmpty
                      >
                        <MenuItem value="">All Suppliers</MenuItem>
                        {suppliers.map(supplier => (
                          <MenuItem key={supplier} value={supplier}>
                            {supplier}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    
                    {/* Filter by Category */}
                    <FormControl 
                      size="small" 
                      sx={{ 
                        flex: 1,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 28,
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        },
                        '& .MuiInputLabel-root': {
                          fontWeight: 500,
                          fontSize: '0.75rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          transform: 'translate(14px, -9px) scale(0.75)',
                          '&.MuiInputLabel-shrink': {
                            transform: 'translate(14px, -9px) scale(0.75)',
                          }
                        },
                        '& .MuiSelect-select': {
                          py: 0.75,
                          fontSize: '0.8rem',
                          paddingTop: '10px',
                        }
                      }}
                    >
                      <InputLabel 
                        sx={{ 
                          backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.6)' : 'rgba(255, 255, 255, 0.7)',
                          px: 0.5,
                          borderRadius: 1,
                          backdropFilter: 'blur(4px)',
                          fontSize: '0.85rem',
                          fontWeight: 600
                        }}
                      >
                        Category
                      </InputLabel>
                      <Select
                        value={filterType === 'category' ? filterValue : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            setFilterType('category');
                            setFilterValue(e.target.value);
                          } else {
                            setFilterType('none');
                            setFilterValue('');
                          }
                        }}
                        label="Category"
                        displayEmpty
                      >
                        <MenuItem value="">All Categories</MenuItem>
                        {categories.map(category => (
                          <MenuItem key={category} value={category}>
                            {category}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
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
                borderRadius: 8, // More rounded corners
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
                    transition: 'all 0.25s ease',
                    padding: '8px 16px',
                    backgroundColor: isDarkMode ? '#3B7EA1' : '#4A8CAF', // Slate blue
                    opacity: visibleGraphs.consumption ? 1 : 0.6,
                    borderRight: '1px solid',
                    borderColor: 'rgba(255,255,255,0.2)',
                    '&:hover': {
                      opacity: 0.9,
                    }
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
                    transition: 'all 0.25s ease',
                    padding: '8px 16px',
                    backgroundColor: isDarkMode ? '#5D9D7E' : '#68B090', // Sage green
                    opacity: visibleGraphs.purchases ? 1 : 0.6,
                    '&:hover': {
                      opacity: 0.9,
                    }
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
              
              {/* Add filter controls here */}
              <Box sx={{ 
                display: 'flex',
                gap: 2,
              }}>
                {/* Filter by Supplier */}
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
                  <InputLabel>Filter by Supplier</InputLabel>
                  <Select
                    value={filterType === 'supplier' ? filterValue : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        setFilterType('supplier');
                        setFilterValue(e.target.value);
                      } else {
                        setFilterType('none');
                        setFilterValue('');
                      }
                    }}
                    label="Filter by Supplier"
                    displayEmpty
                  >
                    <MenuItem value="">All Suppliers</MenuItem>
                    {suppliers.map(supplier => (
                      <MenuItem key={supplier} value={supplier}>
                        {supplier}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {/* Filter by Category */}
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
                  <InputLabel>Filter by Category</InputLabel>
                  <Select
                    value={filterType === 'category' ? filterValue : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        setFilterType('category');
                        setFilterValue(e.target.value);
                      } else {
                        setFilterType('none');
                        setFilterValue('');
                      }
                    }}
                    label="Filter by Category"
                    displayEmpty
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {categories.map(category => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Stack>

            <Box sx={{
              height: 400, // Reduced height from 450px
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              '& .recharts-wrapper': {
                width: '100% !important',
                margin: '0 auto'
              },
              borderRadius: 2,
              padding: '10px 5px',
              boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)',
              background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)'
            }}>
              {/* Add time range toggle button as a floating element */}
              <Box 
                sx={{
                  position: 'absolute',
                  top: 5,
                  right: 5,
                  zIndex: 10
                }}
              >
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => setChartTimeRange(prev => prev === 'recent' ? 'all' : 'recent')}
                  sx={{
                    borderRadius: 20,
                    py: 0.5,
                    px: 2,
                    minWidth: 'auto',
                    backgroundColor: isDarkMode 
                      ? (chartTimeRange === 'recent' ? 'rgba(59, 126, 161, 0.8)' : 'rgba(93, 157, 126, 0.8)') // Match consumption/purchases colors
                      : (chartTimeRange === 'recent' ? 'rgba(74, 140, 175, 0.9)' : 'rgba(104, 176, 144, 0.9)'),
                    color: '#fff',
                    boxShadow: isDarkMode 
                      ? '0 2px 8px rgba(0,0,0,0.4)' 
                      : '0 2px 8px rgba(0,0,0,0.15)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      backgroundColor: isDarkMode 
                        ? (chartTimeRange === 'recent' ? 'rgba(59, 126, 161, 0.9)' : 'rgba(93, 157, 126, 0.9)')
                        : (chartTimeRange === 'recent' ? 'rgba(74, 140, 175, 1)' : 'rgba(104, 176, 144, 1)'),
                    },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5
                  }}
                  endIcon={chartTimeRange === 'recent' ? 
                    <ArrowDropDownIcon style={{ marginLeft: -4, marginRight: -4 }} /> : 
                    <ArrowDropUpIcon style={{ marginLeft: -4, marginRight: -4 }} />}
                >
                  {chartTimeRange === 'recent' ? 'Recent' : 'All Time'}
                </Button>
              </Box>
              <ResponsiveContainer>
                <ComposedChart
                  data={getFilteredChartData().consumptionData}
                  margin={{ top: 20, right: 20, left: 10, bottom: 30 }} // Reduced bottom margin
                  barGap={chartTimeRange === 'recent' ? 8 : 5} // Dynamic spacing between bars
                  barCategoryGap={chartTimeRange === 'recent' ? 30 : 15} // Wider spacing between categories
                >
                  <defs>
                    {/* Gradient for consumption bars */}
                    <linearGradient id="consumptionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isDarkMode ? '#2E6A8A' : '#3B7EA1'} stopOpacity={1} />
                      <stop offset="95%" stopColor={isDarkMode ? '#1E4C65' : '#2A5C7A'} stopOpacity={0.9} />
                    </linearGradient>
                    {/* Gradient for purchase bars */}
                    <linearGradient id="purchasesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isDarkMode ? '#4D8269' : '#5D9D7E'} stopOpacity={1} />
                      <stop offset="95%" stopColor={isDarkMode ? '#3D6352' : '#487A62'} stopOpacity={0.9} />
                    </linearGradient>
                    {/* Drop shadow for bars */}
                    <filter id="barShadow" x="-10%" y="-10%" width="120%" height="130%">
                      <feDropShadow 
                        dx="0" 
                        dy="1" 
                        stdDeviation="2" 
                        floodColor={isDarkMode ? '#000' : '#333'} 
                        floodOpacity="0.2" 
                      />
                    </filter>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={isDarkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.04)'} // Significantly increased opacity for dark mode
                    vertical={false}
                    strokeWidth={isDarkMode ? 0.9 : 0.8} // Slightly thicker in dark mode
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
                  
                  <Tooltip content={(props) => {
                    const { active, payload, label } = props;
                    
                    if (active && payload && payload.length) {
                      return (
                        <div style={{
                          backgroundColor: isDarkMode ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
                          border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                          borderRadius: '10px',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                          padding: '10px 14px',
                          fontSize: '12px',
                          lineHeight: 1.4
                        }}>
                          <p style={{
                            color: isDarkMode ? '#fff' : '#333',
                            fontWeight: 600,
                            marginBottom: '6px',
                            borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                            paddingBottom: '6px',
                            margin: '0 0 8px 0'
                          }}>
                            {label}
                          </p>
                          {payload.map((entry, index) => {
                            const isConsumption = entry.dataKey === 'amount';
                            const color = isConsumption
                              ? (isDarkMode ? '#78A7BF' : '#3B7EA1')
                              : (isDarkMode ? '#8ABE9F' : '#5D9D7E');
                            const name = isConsumption ? 'Consumption' : 'Purchases';
                            
                            return (
                              <p key={index} style={{
                                color,
                                margin: '4px 0',
                                fontWeight: 500
                              }}>
                                {name}: {(entry.value !== undefined) ? entry.value.toLocaleString() : '0'} kg
                              </p>
                            );
                          })}
                        </div>
                      );
                    }
                    
                    return null;
                  }} />
                  
                  {visibleGraphs.consumption && (
                    <Bar 
                      dataKey="amount" 
                      fill="url(#consumptionGradient)" 
                      name="Consumption"
                      barSize={chartTimeRange === 'recent' ? 34 : 26} 
                      radius={[6, 6, 0, 0]} 
                      opacity={1} 
                      filter="url(#barShadow)" 
                    />
                  )}
                  {visibleGraphs.purchases && (
                    <Bar 
                      dataKey={(data) => {
                        const purchases = getFilteredChartData().purchasesData;
                        const purchase = purchases.find(p => p?.month === data.month);
                        return purchase?.amount || 0;
                      }}
                      fill="url(#purchasesGradient)" 
                      name="Purchases" 
                      barSize={chartTimeRange === 'recent' ? 34 : 26} 
                      radius={[6, 6, 0, 0]}
                      opacity={1} 
                      filter="url(#barShadow)" 
                    />
                  )}
                  
                  {/* Display average line */}
                  {(() => {
                    const average = getFilteredChartData().consumptionData[0]?.average;
                    return average !== undefined && (
                      <ReferenceLine
                        y={average}
                        stroke={isDarkMode ? '#E8B266' : '#D08C39'} 
                        strokeDasharray="5 3" 
                        strokeWidth={1.5} 
                        label={{
                          position: 'left',
                          value: `${(average/1000).toFixed(1)}k`,
                          fontSize: 11,
                          fontWeight: 600,
                          fill: isDarkMode ? '#E8B266' : '#D08C39'
                        }}
                      />
                    );
                  })()}
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card sx={{ 
          borderRadius: 2,
          boxShadow: isDarkMode 
            ? '0 4px 20px rgba(0,0,0,0.25)' 
            : '0 4px 20px rgba(0,0,0,0.1)',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            boxShadow: isDarkMode 
              ? '0 6px 25px rgba(0,0,0,0.35)' 
              : '0 6px 25px rgba(0,0,0,0.15)',
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: isDarkMode 
              ? 'linear-gradient(rgba(30, 30, 30, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(30, 30, 30, 0.03) 1px, transparent 1px)' 
              : 'linear-gradient(rgba(0, 0, 0, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.02) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            pointerEvents: 'none',
            zIndex: 0
          }
        }}>
          <Box 
            sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              height: '4px', 
              background: supplierChartView === 'consumption'
                ? 'linear-gradient(90deg, #3B7EA1, #4a8caf)'
                : 'linear-gradient(90deg, #5D9D7E, #68b090)', 
              zIndex: 2,
              transition: 'background 0.3s ease'
            }} 
          />
          <CardContent sx={{
            position: 'relative',
            zIndex: 1,
            pt: 3 // Extra top padding to account for the colored bar
          }}>
            <Stack 
              direction="row" 
              justifyContent="space-between" 
              alignItems="flex-start"
              mb={2}
              gap={2}
            >
              <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
                {`Top Suppliers of ${
                  timeFrame === 'all' 
                    ? 'All Time' 
                    : timeFrame === 'last2'
                      ? 'Last 2 Months'
                      : timeFrame === 'last3'
                        ? 'Last 3 Months'
                        : timeFrame === 'last6'
                          ? 'Last 6 Months'
                          : timeFrame // specific month
                }`}
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
                    onChange={(e) => {
                      // Only set timeFrame if the selected value is not a divider
                      if (!e.target.value.toString().startsWith('divider_')) {
                        setTimeFrame(e.target.value);
                      }
                    }}
                    label="Time Frame"
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          maxHeight: 300,
                        }
                      }
                    }}
                  >
                    {timeFrameOptions.map((option: { value: string; label: string; isDivider?: boolean; }) => 
                      option.isDivider ? (
                        // Render dividers as non-selectable headers
                        <MenuItem 
                          key={option.value}
                          disabled
                          sx={{ 
                            opacity: 0.7, 
                            py: 0.5, 
                            fontSize: '0.8rem',
                            pointerEvents: 'none',
                            color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                            fontWeight: 600,
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                            borderBottom: '1px solid',
                            borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                          }}
                        >
                          {option.label}
                        </MenuItem>
                      ) : option.value === 'custom' ? (
                        // Custom month selection option
                        <MenuItem 
                          key={option.value} 
                          value={option.value}
                          onClick={(e) => {
                            e.preventDefault();
                            setMonthPickerAnchor(e.currentTarget);
                          }}
                          sx={{ 
                            pl: 1,
                            fontSize: '0.9rem',
                            py: 0.75,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <span>{option.label}</span>
                          <CalendarMonthIcon fontSize="small" sx={{ ml: 1, opacity: 0.7 }} />
                        </MenuItem>
                      ) : (
                        // Render normal options
                        <MenuItem 
                          key={option.value} 
                          value={option.value}
                          sx={{ 
                            pl: option.value !== 'all' ? 2 : 1,
                            fontSize: '0.9rem',
                            py: 0.75
                          }}
                        >
                          {option.label}
                        </MenuItem>
                      )
                    )}
                  </Select>
                </FormControl>
                
                {/* Month Picker Popover */}
                <Popover
                  open={Boolean(monthPickerAnchor)}
                  anchorEl={monthPickerAnchor}
                  onClose={() => setMonthPickerAnchor(null)}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                  }}
                  PaperProps={{
                    sx: {
                      p: 2,
                      width: 320,
                      maxHeight: 400,
                      overflow: 'auto',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      borderRadius: '10px',
                      border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    }
                  }}
                >
                  <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                    Select Months
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 1,
                    mb: 2
                  }}>
                    {availableMonths.map(month => (
                      <Box
                        key={month}
                        onClick={() => handleMonthClick(month)}
                        sx={{
                          px: 1.5,
                          py: 0.75,
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          backgroundColor: selectedMonths.includes(month)
                            ? (isDarkMode ? '#4A8CAF' : '#3B7EA1')
                            : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                          color: selectedMonths.includes(month)
                            ? '#fff'
                            : (isDarkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)'),
                          fontWeight: selectedMonths.includes(month) ? 600 : 400,
                          border: '1px solid',
                          borderColor: selectedMonths.includes(month)
                            ? (isDarkMode ? '#4A8CAF' : '#3B7EA1')
                            : 'transparent',
                          transition: 'all 0.2s',
                          '&:hover': {
                            backgroundColor: selectedMonths.includes(month)
                              ? (isDarkMode ? '#3B7EA1' : '#2E6A8A')
                              : (isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'),
                          }
                        }}
                      >
                        {month}
                      </Box>
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => setMonthPickerAnchor(null)}
                      sx={{ 
                        borderRadius: '20px',
                        textTransform: 'none',
                        px: 2
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="contained" 
                      size="small"
                      onClick={applyCustomSelection}
                      sx={{ 
                        borderRadius: '20px',
                        textTransform: 'none',
                        px: 2,
                        backgroundColor: isDarkMode ? '#4A8CAF' : '#3B7EA1',
                        '&:hover': {
                          backgroundColor: isDarkMode ? '#3B7EA1' : '#2E6A8A',
                        }
                      }}
                    >
                      Apply Selection
                    </Button>
                  </Box>
                </Popover>
                
                {/* Rest of the existing controls */}
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
                        ? (isDarkMode ? '#3B7EA1' : '#4A8CAF') // Updated to slate blue for consumption
                        : (isDarkMode ? '#5D9D7E' : '#68B090'), // Updated to sage green for purchases
                      '&:hover': {
                        backgroundColor: supplierChartView === 'consumption' 
                          ? (isDarkMode ? '#2E6A8A' : '#3B7EA1') // Updated hover state
                          : (isDarkMode ? '#4D8269' : '#5D9D7E'), // Updated hover state
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
                          ? (isDarkMode ? '#78A7BF' : '#3B7EA1') // Updated to slate blue for consumption
                          : (isDarkMode ? '#8ABE9F' : '#5D9D7E'), // Updated to sage green for purchases
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

            {/* Desktop View - UPDATED LAYOUT */}
            <Box sx={{ 
              display: { xs: 'none', md: 'block' } // Show only on desktop
            }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                width: '100%',
                height: 500, // Increased height
              }}> 
                {/* Pie chart container - Increased size */}
                <Box sx={{ 
                  width: '65%', // Adjusted width
                  height: '100%',
                  position: 'relative'
                }}> 
                  <ResponsiveContainer width="100%" height="100%"> 
                    <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <defs>
                        {/* Create pattern for "Others" segment in desktop chart - crosshatch pattern */}
                        <pattern id="othersPatternDesktop" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
                          <rect width="8" height="8" fill={isDarkMode ? '#00796B' : '#009688'} />
                          <line x1="0" y1="0" x2="0" y2="8" stroke={isDarkMode ? '#E0F2F1' : '#004D40'} strokeWidth="1.5" strokeOpacity="0.5" />
                        </pattern>
                        {/* Add a second pattern with perpendicular lines for a crosshatch effect */}
                        <pattern id="othersPatternCrossDesktop" patternUnits="userSpaceOnUse" width="8" height="8">
                          <rect width="8" height="8" fill="url(#othersPatternDesktop)" />
                          <line x1="0" y1="4" x2="8" y2="4" stroke={isDarkMode ? '#E0F2F1' : '#004D40'} strokeWidth="1" strokeOpacity="0.5" />
                        </pattern>
                        <linearGradient id="othersGradientDesktop" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={isDarkMode ? '#00796B' : '#009688'} /> {/* Teal for Others */}
                          <stop offset="100%" stopColor={isDarkMode ? '#00796B' : '#009688'} opacity={0.8} />
                        </linearGradient>
                        {activeSupplierData.map((entry, index) => (
                          <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={getChartColors(isDarkMode, supplierChartView, index, entry.name)} />
                            <stop offset="100%" stopColor={getChartColors(isDarkMode, supplierChartView, index, entry.name)} opacity={0.7} />
                          </linearGradient>
                        ))}
                        {/* Add glow filters for active segments */}
                        {activeSupplierData.map((entry, index) => (
                          <filter key={`glow-${index}`} id={`desktop-glow-${index}`} x="-30%" y="-30%" width="160%" height="160%">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feFlood 
                              floodColor={getChartColors(isDarkMode, supplierChartView, index, entry.name)} 
                              floodOpacity={activeIndex === index ? "0.4" : "0"} 
                              result="color" 
                            />
                            <feComposite in="color" in2="blur" operator="in" result="glow" />
                            <feMerge>
                              <feMergeNode in="glow" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        ))}
                      </defs>
                      <Pie
                        data={activeSupplierData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={100} // Increased inner radius
                        outerRadius={180} // Increased outer radius
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
                              ? 'url(#othersPatternCrossDesktop)'
                              : `url(#gradient-${index})`}
                            strokeWidth={0}
                            opacity={0.85}
                            filter={activeIndex === index ? `url(#desktop-glow-${index})` : undefined}
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
                          dy="-22" // Adjusted spacing
                          fontSize="22" // Increased font size
                          fontWeight="600"
                          textAnchor="middle"
                          fill={activeSupplierData[activeIndex]?.name === 'Others' 
                            ? (isDarkMode ? '#00796B' : '#009688')
                            : getChartColors(isDarkMode, supplierChartView, activeIndex, activeSupplierData[activeIndex]?.name || '')}
                        >
                          {activeSupplierData[activeIndex]?.name === 'Others'
                            ? 'Others'
                            : activeSupplierData[activeIndex]?.name || ''}
                        </tspan>
                        <tspan
                          x="50%"
                          dy="30" // Adjusted spacing
                          fontSize="24" // Increased font size
                          fontWeight="700"
                          textAnchor="middle"
                          fill={activeSupplierData[activeIndex]?.name === 'Others' 
                            ? (isDarkMode ? '#00796B' : '#009688')
                            : getChartColors(isDarkMode, supplierChartView, activeIndex, activeSupplierData[activeIndex]?.name || '')}
                        >
                          {((activeSupplierData[activeIndex]?.value || 0) / activeSupplierData.reduce((sum, item) => sum + item.value, 0) * 100).toFixed(1)}%
                        </tspan>
                        <tspan
                          x="50%"
                          dy="30" // Adjusted spacing
                          fontSize="20" // Increased font size
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
                          
                          // Get the correct suppliers for the Others breakdown based on current view and filters
                          let othersSuppliers = [];
                          
                          if (supplierChartView === 'consumption') {
                            // Get all suppliers from the current filtered inventory
                            const allSuppliers = getSupplierConsumption(999); // Get all suppliers
                            // Filter out the ones already shown in the main pie chart (top 7)
                            othersSuppliers = allSuppliers
                              .filter(s => !memoizedSupplierConsumption.slice(0, 7).some(top => top.name === s.name))
                              .filter(s => s.name !== 'Others')
                              .map(s => ({
                                name: s.name,
                                value: s.value,
                                percentage: (s.value / total * 100).toFixed(1)
                              }));
                          } else {
                            // Same for purchases view
                            const allSuppliers = getSupplierPurchases(999);
                            othersSuppliers = allSuppliers
                              .filter(s => !memoizedSupplierPurchases.slice(0, 7).some(top => top.name === s.name))
                              .filter(s => s.name !== 'Others')
                              .map(s => ({
                                name: s.name,
                                value: s.value,
                                percentage: (s.value / total * 100).toFixed(1)
                              }));
                          }

                          // Calculate Others segment position
                          const RADIAN = Math.PI / 180;
                          const othersIndex = activeSupplierData.findIndex(item => item.name === 'Others');
                          const startAngle = othersIndex * (360 / activeSupplierData.length) * RADIAN;
                          const x = 250 + 180 * Math.cos(-startAngle - (RADIAN * 15)); // Adjusted for larger radius
                          const y = 250 + 180 * Math.sin(-startAngle - (RADIAN * 15)); // Adjusted for larger radius

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
                              {othersSuppliers.length > 0 ? (
                                othersSuppliers.map((supplier) => (
                                  <div key={supplier.name} style={{
                                    fontSize: '11px',
                                    color: isDarkMode ? '#aaa' : '#666',
                                    marginTop: '4px'
                                  }}>
                                    {`${supplier.name} (${supplier.percentage}%)`}
                                  </div>
                                ))
                              ) : (
                                <div style={{
                                  fontSize: '11px',
                                  color: isDarkMode ? '#aaa' : '#666',
                                  fontStyle: 'italic'
                                }}>
                                  No additional suppliers
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                
                {/* Supplier List - Improved styling */}
                <Box sx={{ 
                  width: '30%',
                  maxWidth: '350px',
                  minWidth: '250px',
                  height: 500, // Increased height
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  backgroundColor: isDarkMode ? 'rgba(20,20,20,0.8)' : 'rgba(245,245,245,0.9)', 
                  borderRadius: 2,
                  boxShadow: isDarkMode ? '0 2px 8px rgba(255,255,255,0.1)' : '0 2px 8px rgba(0,0,0,0.05)',
                  ml: 3, // Added margin for spacing
                  border: '1px solid',
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  // Custom scrollbar styling for modern browsers
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: 'transparent'
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                    borderRadius: '3px',
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    background: isDarkMode ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                  }
                }}>
                  <Typography variant="h6" sx={{ 
                    mb: 1, 
                    fontWeight: 600,
                    px: 2, // Increased padding
                    pt: 2, // Increased padding
                    pb: 1.5, // Increased padding
                    fontSize: '1rem', // Increased font size
                    borderBottom: '1px solid',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                  }}>
                    Suppliers List
                  </Typography>
                  
                  <Box sx={{ px: 2, pb: 2 }}>
                    {activeSupplierData.map((entry, index) => {
                      const percent = (entry.value / activeSupplierData.reduce((sum, item) => sum + item.value, 0) * 100).toFixed(1);
                      const color = entry.name === 'Others' 
                        ? (isDarkMode ? '#00796B' : '#009688')
                        : getChartColors(isDarkMode, supplierChartView, index, entry.name);
                      const isActive = activeIndex === index;
                      
                      return (
                        <Box
                          key={`supplier-${index}`}
                          onClick={() => setActiveIndex(isActive ? -1 : index)}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            p: 1, // Increased padding
                            mb: 1, // Increased margin
                            borderRadius: 1,
                            cursor: 'pointer',
                            backgroundColor: isActive 
                              ? (isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)')
                              : 'transparent',
                            borderLeft: '4px solid', // Increased border thickness
                            borderLeftColor: color,
                            transition: 'all 0.2s ease',
                            position: 'relative',
                            '&:hover': {
                              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                              transform: 'translateX(2px)',
                              '&::after': {
                                opacity: 1,
                                transform: 'scaleX(1)',
                              }
                            },
                            '&::after': {
                              content: '""',
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: '1px',
                              background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                              transform: 'scaleX(0.7)',
                              transformOrigin: 'left',
                              opacity: 0.5,
                              transition: 'opacity 0.2s ease, transform 0.2s ease',
                            }
                          }}
                        >
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            maxWidth: '60%',
                            overflow: 'hidden'
                          }}>
                            <Box 
                              sx={{ 
                                width: 12, // Increased size
                                height: 12, // Increased size
                                borderRadius: '50%', 
                                backgroundColor: color,
                                mr: 1, // Increased margin
                                flexShrink: 0
                              }} 
                            />
                            <Typography sx={{ 
                              fontWeight: isActive ? 600 : 500,
                              fontSize: '0.9rem', // Increased font size
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {entry.name}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                            <Typography sx={{ 
                              fontWeight: 600,
                              fontSize: '0.95rem' // Increased font size
                            }}>
                              {percent}%
                            </Typography>
                            <Typography sx={{ 
                              color: isDarkMode ? '#aaa' : '#666',
                              fontSize: '0.8rem' // Increased font size
                            }}>
                              {(entry.value !== undefined) ? entry.value.toLocaleString() : '0'} kg
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default QuickStats; 