import React, { useState } from 'react';
import {
  Box,
  Grid,
  TextField,
  Button,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Divider,
  InputAdornment
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Calculate as CalculateIcon
} from '@mui/icons-material';
import procurementService from '../../services/procurementService';
import productService from '../../services/productService';

const ProcurementSettings: React.FC = () => {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [settings, setSettings] = useState({
    leadTimeDays: 10,
    safetyStockDays: 15,
    orderQuantity: 0,
    isImported: false,
    minStockLevel: 0
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  React.useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await productService.getProducts();
      setProducts(response.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    const product = products.find(p => p.id === productId);
    if (product) {
      setSettings({
        leadTimeDays: product.leadTimeDays || 10,
        safetyStockDays: product.safetyStockDays || 15,
        orderQuantity: product.orderQuantity || 0,
        isImported: product.isImported || false,
        minStockLevel: product.minStockLevel || 0
      });
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedProductId) {
      setMessage({ type: 'error', text: 'Please select a product first' });
      return;
    }

    try {
      setLoading(true);
      await procurementService.updateProcurementSettings(selectedProductId, settings);
      setMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAllReorderPoints = async () => {
    try {
      setLoading(true);
      await procurementService.updateReorderPoints();
      setMessage({ type: 'success', text: 'All reorder points updated successfully' });
    } catch (error) {
      console.error('Error updating reorder points:', error);
      setMessage({ type: 'error', text: 'Failed to update reorder points' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateForecasts = async () => {
    try {
      setLoading(true);
      const result = await procurementService.generateAllForecasts(3);
      setMessage({
        type: 'success',
        text: `Generated forecasts for ${result.successful} products`
      });
    } catch (error) {
      console.error('Error generating forecasts:', error);
      setMessage({ type: 'error', text: 'Failed to generate forecasts' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Procurement Settings
      </Typography>

      {message.text && (
        <Alert severity={message.type as any} sx={{ mb: 2 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Product-Specific Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Product-Specific Settings
            </Typography>

            <FormControl fullWidth margin="normal">
              <InputLabel>Select Product</InputLabel>
              <Select
                value={selectedProductId}
                onChange={(e) => handleProductSelect(e.target.value)}
                label="Select Product"
              >
                {products.map((product) => (
                  <MenuItem key={product.id} value={product.id}>
                    {product.artisCodes.join(', ')} - {product.supplier}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedProductId && (
              <>
                <TextField
                  fullWidth
                  label="Lead Time"
                  type="number"
                  value={settings.leadTimeDays}
                  onChange={(e) => setSettings({ ...settings, leadTimeDays: parseInt(e.target.value) })}
                  margin="normal"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">days</InputAdornment>
                  }}
                  helperText="Time from order placement to delivery"
                />

                <TextField
                  fullWidth
                  label="Safety Stock"
                  type="number"
                  value={settings.safetyStockDays}
                  onChange={(e) => setSettings({ ...settings, safetyStockDays: parseInt(e.target.value) })}
                  margin="normal"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">days</InputAdornment>
                  }}
                  helperText="Buffer stock in days of average consumption"
                />

                <TextField
                  fullWidth
                  label="Order Quantity"
                  type="number"
                  value={settings.orderQuantity}
                  onChange={(e) => setSettings({ ...settings, orderQuantity: parseFloat(e.target.value) })}
                  margin="normal"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">kg</InputAdornment>
                  }}
                  helperText="Standard order quantity (0 for auto-calculate)"
                />

                <TextField
                  fullWidth
                  label="Minimum Stock Level"
                  type="number"
                  value={settings.minStockLevel}
                  onChange={(e) => setSettings({ ...settings, minStockLevel: parseFloat(e.target.value) })}
                  margin="normal"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">kg</InputAdornment>
                  }}
                  helperText="Minimum stock level before reordering"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.isImported}
                      onChange={(e) => {
                        const isImported = e.target.checked;
                        setSettings({
                          ...settings,
                          isImported,
                          leadTimeDays: isImported ? 60 : 10
                        });
                      }}
                    />
                  }
                  label="Imported Product (longer lead times)"
                  sx={{ mt: 2 }}
                />

                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveSettings}
                  disabled={loading}
                  sx={{ mt: 2 }}
                  fullWidth
                >
                  Save Settings
                </Button>
              </>
            )}
          </Paper>
        </Grid>

        {/* Global Actions */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Global Actions
            </Typography>

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Update reorder points for all products based on current consumption and lead times.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleUpdateAllReorderPoints}
                disabled={loading}
                fullWidth
                sx={{ mt: 1 }}
              >
                Update All Reorder Points
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box>
              <Typography variant="body2" gutterBottom>
                Generate consumption forecasts for the next 3 months using historical data.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<CalculateIcon />}
                onClick={handleGenerateForecasts}
                disabled={loading}
                fullWidth
                sx={{ mt: 1 }}
              >
                Generate Forecasts
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Default Settings
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Domestic Lead Time: 10 days
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Imported Lead Time: 60 days
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Safety Stock: 15 days
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Reorder Point = (Daily Consumption × Lead Time) + Safety Stock
              </Typography>
            </Box>
          </Paper>

          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Information Required from Management
            </Typography>

            <Typography variant="body2" paragraph>
              To improve procurement accuracy, please provide:
            </Typography>

            <Box sx={{ pl: 2 }}>
              <Typography variant="body2" color="text.secondary">
                • Actual lead times for each supplier
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Minimum order quantities per supplier
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Price break information for bulk orders
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Seasonal demand patterns
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Express delivery options and costs
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Budget constraints per month/quarter
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProcurementSettings;