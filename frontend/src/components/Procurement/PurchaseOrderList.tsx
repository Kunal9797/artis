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
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Tooltip
} from '@mui/material';
import {
  Edit as EditIcon,
  LocalShipping as ShippingIcon,
  CheckCircle as DeliveredIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import procurementService, { PurchaseOrder } from '../../services/procurementService';

const PurchaseOrderList: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [updateDialog, setUpdateDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [updateData, setUpdateData] = useState({
    status: '',
    actualDeliveryDate: '',
    trackingNumber: '',
    invoiceNumber: '',
    notes: ''
  });

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = statusFilter ? { status: statusFilter } : undefined;
      const response = await procurementService.getPurchaseOrders(params);
      setOrders(response.orders);
    } catch (error) {
      console.error('Error loading purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'confirmed':
        return 'info';
      case 'shipped':
        return 'warning';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'shipped':
        return <ShippingIcon fontSize="small" />;
      case 'delivered':
        return <DeliveredIcon fontSize="small" />;
      case 'cancelled':
        return <CancelIcon fontSize="small" />;
      default:
        return null;
    }
  };

  const handleUpdateClick = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setUpdateData({
      status: order.status,
      actualDeliveryDate: order.actualDeliveryDate || '',
      trackingNumber: order.trackingNumber || '',
      invoiceNumber: order.invoiceNumber || '',
      notes: order.notes || ''
    });
    setUpdateDialog(true);
  };

  const handleUpdateOrder = async () => {
    if (selectedOrder) {
      try {
        await procurementService.updatePurchaseOrderStatus(selectedOrder.id, updateData);
        setUpdateDialog(false);
        loadOrders();
      } catch (error) {
        console.error('Error updating order:', error);
      }
    }
  };

  const calculateLeadTimeVariance = (order: PurchaseOrder) => {
    if (order.actualLeadTimeDays && order.leadTimeDays) {
      const variance = order.actualLeadTimeDays - order.leadTimeDays;
      if (variance > 0) {
        return <Typography variant="caption" color="error">+{variance} days late</Typography>;
      } else if (variance < 0) {
        return <Typography variant="caption" color="success.main">{Math.abs(variance)} days early</Typography>;
      } else {
        return <Typography variant="caption" color="text.secondary">On time</Typography>;
      }
    }
    return null;
  };

  return (
    <Box>
      {/* Filters */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Status Filter</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Status Filter"
            size="small"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="confirmed">Confirmed</MenuItem>
            <MenuItem value="shipped">Shipped</MenuItem>
            <MenuItem value="delivered">Delivered</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          onClick={loadOrders}
        >
          Refresh
        </Button>
      </Box>

      {/* Orders Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Order Number</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Supplier</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell>Order Date</TableCell>
              <TableCell>Expected Delivery</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Lead Time</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {order.orderNumber}
                  </Typography>
                </TableCell>
                <TableCell>
                  {order.product && (
                    <Box>
                      <Typography variant="body2">
                        {order.product.artisCodes.join(', ')}
                      </Typography>
                      {order.product.name && (
                        <Typography variant="caption" color="text.secondary">
                          {order.product.name}
                        </Typography>
                      )}
                    </Box>
                  )}
                </TableCell>
                <TableCell>{order.supplier}</TableCell>
                <TableCell align="right">{order.quantity} kg</TableCell>
                <TableCell>
                  {new Date(order.orderDate).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {new Date(order.expectedDeliveryDate).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Chip
                    label={order.status}
                    color={getStatusColor(order.status) as any}
                    icon={getStatusIcon(order.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">
                      {order.leadTimeDays} days
                    </Typography>
                    {calculateLeadTimeVariance(order)}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Update Order">
                    <IconButton
                      size="small"
                      onClick={() => handleUpdateClick(order)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Update Order Dialog */}
      <Dialog open={updateDialog} onClose={() => setUpdateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Purchase Order</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                value={updateData.status}
                onChange={(e) => setUpdateData({ ...updateData, status: e.target.value })}
                label="Status"
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="shipped">Shipped</MenuItem>
                <MenuItem value="delivered">Delivered</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>

            {updateData.status === 'delivered' && (
              <TextField
                fullWidth
                label="Actual Delivery Date"
                type="date"
                value={updateData.actualDeliveryDate}
                onChange={(e) => setUpdateData({ ...updateData, actualDeliveryDate: e.target.value })}
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
            )}

            {(updateData.status === 'shipped' || updateData.status === 'delivered') && (
              <TextField
                fullWidth
                label="Tracking Number"
                value={updateData.trackingNumber}
                onChange={(e) => setUpdateData({ ...updateData, trackingNumber: e.target.value })}
                margin="normal"
              />
            )}

            {updateData.status === 'delivered' && (
              <TextField
                fullWidth
                label="Invoice Number"
                value={updateData.invoiceNumber}
                onChange={(e) => setUpdateData({ ...updateData, invoiceNumber: e.target.value })}
                margin="normal"
              />
            )}

            <TextField
              fullWidth
              label="Notes"
              multiline
              rows={3}
              value={updateData.notes}
              onChange={(e) => setUpdateData({ ...updateData, notes: e.target.value })}
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateDialog(false)}>Cancel</Button>
          <Button onClick={handleUpdateOrder} variant="contained">
            Update Order
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PurchaseOrderList;