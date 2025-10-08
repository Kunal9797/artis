import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  LinearProgress,
  Chip,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import procurementService, { SupplierPerformance as SupplierPerformanceData } from '../../services/procurementService';

const SupplierPerformance: React.FC = () => {
  const [suppliers, setSuppliers] = useState<SupplierPerformanceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSupplierPerformance();
  }, []);

  const loadSupplierPerformance = async () => {
    try {
      setLoading(true);
      const data = await procurementService.getSupplierPerformance();
      setSuppliers(data);
    } catch (error) {
      console.error('Error loading supplier performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (latePercentage: number | null) => {
    if (latePercentage === null) return 'default';
    if (latePercentage <= 10) return 'success';
    if (latePercentage <= 25) return 'warning';
    return 'error';
  };

  const getVarianceIndicator = (variance: number | null) => {
    if (variance === null) return null;
    if (variance > 2) {
      return <TrendingDownIcon color="error" fontSize="small" />;
    } else if (variance < -2) {
      return <TrendingUpIcon color="success" fontSize="small" />;
    }
    return <TimeIcon color="action" fontSize="small" />;
  };

  // Calculate summary statistics
  const totalOrders = suppliers.reduce((sum, s) => sum + s.total_orders, 0);
  const totalDelivered = suppliers.reduce((sum, s) => sum + s.delivered_orders, 0);
  const avgLeadTime = suppliers.length > 0
    ? suppliers.reduce((sum, s) => sum + (s.avg_expected_lead_time || 0), 0) / suppliers.length
    : 0;

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Orders
              </Typography>
              <Typography variant="h5">
                {totalOrders}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Across {suppliers.length} suppliers
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Delivery Rate
              </Typography>
              <Typography variant="h5">
                {totalOrders > 0 ? ((totalDelivered / totalOrders) * 100).toFixed(1) : 0}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {totalDelivered} delivered
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Avg Lead Time
              </Typography>
              <Typography variant="h5">
                {avgLeadTime.toFixed(0)} days
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Expected lead time
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Supplier</TableCell>
              <TableCell align="center">Total Orders</TableCell>
              <TableCell align="center">Delivered</TableCell>
              <TableCell align="center">Avg Expected Lead Time</TableCell>
              <TableCell align="center">Avg Actual Lead Time</TableCell>
              <TableCell align="center">Lead Time Variance</TableCell>
              <TableCell align="center">On-Time Delivery</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {suppliers.map((supplier, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {supplier.supplier}
                  </Typography>
                </TableCell>
                <TableCell align="center">{supplier.total_orders}</TableCell>
                <TableCell align="center">
                  {supplier.delivered_orders}
                  <Typography variant="caption" color="text.secondary" display="block">
                    ({((supplier.delivered_orders / supplier.total_orders) * 100).toFixed(0)}%)
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  {supplier.avg_expected_lead_time.toFixed(0)} days
                </TableCell>
                <TableCell align="center">
                  {supplier.avg_actual_lead_time !== null ? (
                    <>
                      {supplier.avg_actual_lead_time.toFixed(0)} days
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      N/A
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {supplier.avg_lead_time_variance !== null ? (
                      <>
                        {getVarianceIndicator(supplier.avg_lead_time_variance)}
                        <Typography
                          variant="body2"
                          sx={{ ml: 1 }}
                          color={
                            supplier.avg_lead_time_variance > 2 ? 'error' :
                            supplier.avg_lead_time_variance < -2 ? 'success.main' :
                            'text.primary'
                          }
                        >
                          {supplier.avg_lead_time_variance > 0 ? '+' : ''}
                          {supplier.avg_lead_time_variance.toFixed(1)} days
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        N/A
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  {supplier.late_delivery_percentage !== null ? (
                    <Chip
                      label={`${(100 - supplier.late_delivery_percentage).toFixed(0)}%`}
                      color={getPerformanceColor(supplier.late_delivery_percentage) as any}
                      size="small"
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      N/A
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Legend */}
      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Performance Indicators:
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Chip label="95%+" color="success" size="small" />
              <Typography variant="caption" sx={{ ml: 1 }}>
                Excellent on-time delivery
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Chip label="75-94%" color="warning" size="small" />
              <Typography variant="caption" sx={{ ml: 1 }}>
                Moderate delays
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Chip label="<75%" color="error" size="small" />
              <Typography variant="caption" sx={{ ml: 1 }}>
                Frequent delays
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default SupplierPerformance;