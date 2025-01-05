import React from 'react';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import { InventoryItem } from '../Inventory/InventoryList';
import InventoryIcon from '@mui/icons-material/Inventory';
import BarChartIcon from '@mui/icons-material/BarChart';
import CategoryIcon from '@mui/icons-material/Category';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Bar, ReferenceLine, Legend } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

interface QuickStatsProps {
  inventory: InventoryItem[];
}

const QuickStats: React.FC<QuickStatsProps> = ({ inventory }) => {
  const { isDarkMode } = useTheme();
  const totalDesigns = inventory.length;
  const totalStock = inventory.reduce((sum, item) => sum + (Number(item.currentStock) || 0), 0);
  const totalAvgConsumption = inventory.reduce((sum, item) => sum + (Number(item.avgConsumption) || 0), 0);

  // Aggregate monthly consumption data
  const getMonthlyConsumption = () => {
    const monthlyData: { [key: string]: number } = {};
    
    inventory.forEach(item => {
      const consumption = Number(item.avgConsumption) || 0;
      const currentDate = new Date();
      
      // Get last 6 months
      for (let i = 0; i < 6; i++) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + consumption;
      }
    });

    return Object.entries(monthlyData)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([month, amount]) => ({
        month,
        amount: Number(amount.toFixed(2)),
        average: Number(totalAvgConsumption.toFixed(2))
      }));
  };

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

  return (
    <>
      <Card elevation={3} sx={{ mt: 4 }}>
        <CardContent sx={{ py: 3 }}>
          <Grid container spacing={4}>
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
        </CardContent>
      </Card>

      <Card elevation={3} sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" color="primary" gutterBottom>
            Monthly Consumption Overview
          </Typography>
          <Box sx={{ height: 300, width: '100%' }}>
            <ResponsiveContainer>
              <ComposedChart
                data={getMonthlyConsumption()}
                margin={{ top: 40, right: 120, left: 20, bottom: 5 }}
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
                  y={totalAvgConsumption}
                  stroke="#FF7043"
                  strokeDasharray="5 5"
                  label={{
                    value: `Avg: ${totalAvgConsumption.toFixed(2)} kgs`,
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
    </>
  );
};

export default QuickStats; 