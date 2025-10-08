import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Alert,
  AlertTitle,
  Tab,
  Tabs,
  LinearProgress,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  ShoppingCart as ShoppingCartIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
  LocalShipping as ShippingIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import procurementService, { StockoutRisk, ProcurementAlerts } from '../../services/procurementService';
import StockoutRiskList from './StockoutRiskList';
import PurchaseOrderList from './PurchaseOrderList';
import SupplierPerformance from './SupplierPerformance';
import ProcurementSettings from './ProcurementSettings';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`procurement-tabpanel-${index}`}
      aria-labelledby={`procurement-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ProcurementDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [alerts, setAlerts] = useState<ProcurementAlerts | null>(null);
  const [stockoutRisks, setStockoutRisks] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [alertsData, risksData] = await Promise.all([
        procurementService.getProcurementAlerts(),
        procurementService.getStockoutRisks()
      ]);
      setAlerts(alertsData);
      setStockoutRisks(risksData);
    } catch (error) {
      console.error('Error loading procurement data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'STOCKOUT':
      case 'CRITICAL':
        return <ErrorIcon color="error" />;
      case 'HIGH':
        return <WarningIcon color="warning" />;
      case 'MEDIUM':
        return <InfoIcon color="info" />;
      default:
        return <CheckCircleIcon color="success" />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'STOCKOUT':
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

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          Loading procurement data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Procurement Intelligence
        </Typography>
        <Tooltip title="Refresh data">
          <IconButton onClick={handleRefresh} disabled={refreshing}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fee', borderLeft: 4, borderColor: 'error.main' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Critical Items
              </Typography>
              <Typography variant="h4" component="div">
                {alerts?.critical.length || 0}
              </Typography>
              <Typography variant="body2">
                Need immediate attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#ffeaa7', borderLeft: 4, borderColor: 'warning.main' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Upcoming Orders
              </Typography>
              <Typography variant="h4" component="div">
                {alerts?.upcoming.length || 0}
              </Typography>
              <Typography variant="body2">
                Will need ordering soon
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e3f2fd', borderLeft: 4, borderColor: 'info.main' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Overstock Items
              </Typography>
              <Typography variant="h4" component="div">
                {alerts?.overstock.length || 0}
              </Typography>
              <Typography variant="body2">
                Excess inventory
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e8f5e9', borderLeft: 4, borderColor: 'success.main' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Safe Stock
              </Typography>
              <Typography variant="h4" component="div">
                {stockoutRisks?.summary?.safe || 0}
              </Typography>
              <Typography variant="body2">
                Adequate inventory
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Critical Alerts */}
      {alerts && alerts.critical.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Critical Stock Alerts</AlertTitle>
          <Box>
            {alerts.critical.slice(0, 5).map((item, index) => (
              <Box key={index} sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>{item.artisCodes.join(', ')}</strong> - {item.supplier}:
                  {item.currentStock <= 0 ? (
                    <Chip
                      label="OUT OF STOCK"
                      color="error"
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  ) : (
                    <>
                      {' '}Only {Number(item.currentStock).toFixed(0)} kg left
                      {item.daysUntilStockout && (
                        <Chip
                          label={`${item.daysUntilStockout} days until stockout`}
                          color="warning"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </>
                  )}
                </Typography>
              </Box>
            ))}
            {alerts.critical.length > 5 && (
              <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                ...and {alerts.critical.length - 5} more critical items
              </Typography>
            )}
          </Box>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="procurement tabs">
            <Tab
              label="Risk Analysis"
              icon={
                <Badge badgeContent={alerts?.critical.length || 0} color="error">
                  <WarningIcon />
                </Badge>
              }
              iconPosition="start"
            />
            <Tab label="Purchase Orders" icon={<ShoppingCartIcon />} iconPosition="start" />
            <Tab label="Supplier Performance" icon={<AssessmentIcon />} iconPosition="start" />
            <Tab label="Settings" icon={<ShippingIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <StockoutRiskList
            risks={stockoutRisks?.risks || []}
            summary={stockoutRisks?.summary}
            onRefresh={loadData}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <PurchaseOrderList />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <SupplierPerformance />
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <ProcurementSettings />
        </TabPanel>
      </Paper>

      {/* Overstock Warning */}
      {alerts && alerts.overstock.length > 0 && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <AlertTitle>Overstock Items</AlertTitle>
          <Typography variant="body2">
            The following items have more than 6 months of stock:
          </Typography>
          <Box sx={{ mt: 1 }}>
            {alerts.overstock.slice(0, 5).map((item, index) => (
              <Typography key={index} variant="body2">
                <strong>{item.artisCodes.join(', ')}</strong> - {item.supplier}:
                {item.monthsOfStock} months of stock ({Number(item.currentStock).toFixed(0)} kg)
              </Typography>
            ))}
          </Box>
        </Alert>
      )}
    </Box>
  );
};

export default ProcurementDashboard;