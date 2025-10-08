import React, { useState } from 'react';
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
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Search as SearchIcon,
  ShoppingCart as CartIcon,
  Info as InfoIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { StockoutRisk } from '../../services/procurementService';
import procurementService from '../../services/procurementService';

interface Props {
  risks: StockoutRisk[];
  summary?: any;
  onRefresh: () => void;
}

const StockoutRiskList: React.FC<Props> = ({ risks, summary, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRiskLevel, setFilterRiskLevel] = useState('ALL');
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StockoutRisk | null>(null);
  const [orderQuantity, setOrderQuantity] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'STOCKOUT':
        return 'error';
      case 'CRITICAL':
        return 'error';
      case 'HIGH':
        return 'warning';
      case 'MEDIUM':
        return 'info';
      case 'LOW':
        return 'default';
      default:
        return 'success';
    }
  };

  const filteredRisks = risks.filter(risk => {
    const matchesSearch = searchTerm === '' ||
      risk.artisCodes.some(code => code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      risk.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      risk.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterRiskLevel === 'ALL' || risk.riskLevel === filterRiskLevel;

    return matchesSearch && matchesFilter;
  });

  const handleCreateOrder = (risk: StockoutRisk) => {
    setSelectedProduct(risk);
    setOrderQuantity(risk.recommendedOrderQty.toString());
    setOrderNotes('');
    setOrderDialogOpen(true);
  };

  const handleConfirmOrder = async () => {
    if (selectedProduct) {
      try {
        await procurementService.createPurchaseOrder({
          productId: selectedProduct.productId,
          quantity: parseFloat(orderQuantity),
          notes: orderNotes
        });
        setOrderDialogOpen(false);
        onRefresh();
      } catch (error) {
        console.error('Error creating purchase order:', error);
      }
    }
  };

  const exportToExcel = () => {
    // Convert risks to CSV
    const headers = ['Artis Codes', 'Supplier', 'Current Stock', 'Avg Consumption', 'Days Until Stockout', 'Risk Level', 'Recommended Order Qty'];
    const rows = filteredRisks.map(risk => [
      risk.artisCodes.join(', '),
      risk.supplier,
      risk.currentStock,
      risk.avgConsumption,
      risk.daysUntilStockout || 'N/A',
      risk.riskLevel,
      risk.recommendedOrderQty
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stockout-risks-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <Box>
      {/* Filters */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          placeholder="Search by code, supplier, or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ flexGrow: 1, maxWidth: 400 }}
        />

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Risk Level</InputLabel>
          <Select
            value={filterRiskLevel}
            onChange={(e) => setFilterRiskLevel(e.target.value)}
            label="Risk Level"
            size="small"
          >
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="STOCKOUT">Stockout</MenuItem>
            <MenuItem value="CRITICAL">Critical</MenuItem>
            <MenuItem value="HIGH">High</MenuItem>
            <MenuItem value="MEDIUM">Medium</MenuItem>
            <MenuItem value="LOW">Low</MenuItem>
            <MenuItem value="SAFE">Safe</MenuItem>
          </Select>
        </FormControl>

        <Tooltip title="Export to Excel">
          <IconButton onClick={exportToExcel}>
            <DownloadIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Results count */}
      <Typography variant="body2" sx={{ mb: 2 }}>
        Showing {filteredRisks.length} of {risks.length} products
      </Typography>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Artis Codes</TableCell>
              <TableCell>Supplier</TableCell>
              <TableCell align="right">Current Stock (kg)</TableCell>
              <TableCell align="right">Avg Monthly Usage</TableCell>
              <TableCell align="right">Days Until Stockout</TableCell>
              <TableCell align="center">Risk Level</TableCell>
              <TableCell align="right">Recommended Order</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRisks.map((risk, index) => (
              <TableRow
                key={index}
                sx={{
                  backgroundColor: risk.riskLevel === 'STOCKOUT' ? '#ffebee' :
                    risk.riskLevel === 'CRITICAL' ? '#fff3e0' : 'inherit'
                }}
              >
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {risk.artisCodes.join(', ')}
                    </Typography>
                    {risk.name && (
                      <Typography variant="caption" color="text.secondary">
                        {risk.name}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>{risk.supplier}</TableCell>
                <TableCell align="right">
                  <Typography
                    variant="body2"
                    color={risk.currentStock <= 0 ? 'error' : 'inherit'}
                  >
                    {Number(risk.currentStock).toFixed(2)}
                  </Typography>
                </TableCell>
                <TableCell align="right">{Number(risk.avgConsumption).toFixed(2)}</TableCell>
                <TableCell align="right">
                  {risk.daysUntilStockout !== null ? (
                    <Typography
                      variant="body2"
                      color={risk.daysUntilStockout < 10 ? 'error' : 'inherit'}
                    >
                      {risk.daysUntilStockout}
                    </Typography>
                  ) : (
                    'N/A'
                  )}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={risk.riskLevel}
                    color={getRiskColor(risk.riskLevel) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Box>
                    <Typography variant="body2">
                      {Number(risk.recommendedOrderQty).toFixed(0)} kg
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Order by: {new Date(risk.recommendedOrderDate).toLocaleDateString()}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Create Purchase Order">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleCreateOrder(risk)}
                      disabled={risk.riskLevel === 'SAFE'}
                    >
                      <CartIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Order Dialog */}
      <Dialog open={orderDialogOpen} onClose={() => setOrderDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Purchase Order</DialogTitle>
        <DialogContent>
          {selectedProduct && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" gutterBottom>
                <strong>Product:</strong> {selectedProduct.artisCodes.join(', ')}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Supplier:</strong> {selectedProduct.supplier}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Current Stock:</strong> {Number(selectedProduct.currentStock).toFixed(2)} kg
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Lead Time:</strong> {selectedProduct.leadTimeDays} days
              </Typography>

              <TextField
                fullWidth
                label="Order Quantity (kg)"
                type="number"
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(e.target.value)}
                margin="normal"
                required
              />

              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                margin="normal"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmOrder}
            variant="contained"
            disabled={!orderQuantity || parseFloat(orderQuantity) <= 0}
          >
            Create Order
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StockoutRiskList;