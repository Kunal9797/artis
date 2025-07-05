import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  Alert,
  Chip,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Paper,
  LinearProgress,
  Tab,
  Tabs,
  Container,
  useTheme,
  useMediaQuery,
  Collapse,
  Badge,
  Snackbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Link
} from '@mui/material';
import {
  CloudSync as SyncIcon,
  CloudUpload as UploadIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Description as FileIcon,
  Analytics as ConsumptionIcon,
  ShoppingCart as PurchaseIcon,
  Build as CorrectionIcon,
  Inventory as StockIcon,
  OpenInNew as OpenInNewIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import sheetsApi from '../../services/sheetsApi';

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
      id={`sync-tabpanel-${index}`}
      aria-labelledby={`sync-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

interface SyncCategory {
  type: 'consumption' | 'purchases' | 'corrections' | 'initialStock';
  title: string;
  shortTitle: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  sheetUrl?: string;
  helpText: string;
}

const SheetsSyncRedesigned: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  
  const [activeTab, setActiveTab] = useState(0);
  const [pendingCounts, setPendingCounts] = useState({
    consumption: 0,
    purchases: 0,
    corrections: 0,
    initialStock: 0
  });
  const [loading, setLoading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [clearingInventory, setClearingInventory] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning'>('success');
  const [expandedArchives, setExpandedArchives] = useState(false);
  const [archives, setArchives] = useState<{ [key: string]: string[] }>({});
  const [results, setResults] = useState<{[key: string]: {
    success: boolean;
    message: string;
    added?: number;
    errors?: string[];
    warnings?: string[];
  }}>({});

  const categories: SyncCategory[] = [
    {
      type: 'consumption',
      title: 'Monthly Consumption',
      shortTitle: 'Consumption',
      description: 'Track monthly design paper usage',
      icon: <ConsumptionIcon />,
      color: theme.palette.primary.main,
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1hwS0u_Mcf7795WeMlX3Eez7j0J4ikR8JCz19nJvisJU/edit',
      helpText: 'Enter total monthly consumption for each product. Leave blank if no consumption.'
    },
    {
      type: 'purchases',
      title: 'Purchase Transactions',
      shortTitle: 'Purchases',
      description: 'Record new stock purchases',
      icon: <PurchaseIcon />,
      color: theme.palette.success.main,
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1gPOqkdU6NpOC0yx6Q-tx2PZs54VDyrbip5kTUJQ13Tw/edit',
      helpText: 'Enter individual purchase transactions with dates, amounts, and suppliers.'
    },
    {
      type: 'corrections',
      title: 'Stock Corrections',
      shortTitle: 'Corrections',
      description: 'Adjust inventory levels',
      icon: <CorrectionIcon />,
      color: theme.palette.warning.main,
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1WxtUXZC4XT7K5TX--rUivk7g0tT4WCBwc7tbyksKT3w/edit',
      helpText: 'Use +/- amounts to adjust stock (e.g., +50 or -30). Include reason for tracking.'
    },
    {
      type: 'initialStock',
      title: 'Initial Stock',
      shortTitle: 'Initial',
      description: 'Set opening balances',
      icon: <StockIcon />,
      color: theme.palette.secondary.main,
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1jS87QQ0eoVNQF9ymrRhiROU_oEyW-1zhnN382EX1Abs/edit',
      helpText: 'Set opening balance for products. Use only for initial setup or major corrections.'
    }
  ];

  useEffect(() => {
    fetchPendingCounts();
    fetchArchives();
  }, []);

  const fetchPendingCounts = async () => {
    setRefreshing(true);
    try {
      const response = await sheetsApi.getPendingCounts();
      if (response.success) {
        setPendingCounts(response.data);
      }
    } catch (error) {
      console.error('Error fetching pending counts:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchArchives = async () => {
    try {
      const types = ['consumption', 'purchases', 'corrections', 'initialStock'] as const;
      const archivePromises = types.map(async (type) => {
        const response = await sheetsApi.getArchiveTabs(type);
        return { type, archives: response.success ? response.data : [] };
      });
      
      const results = await Promise.all(archivePromises);
      const archiveMap: { [key: string]: string[] } = {};
      results.forEach(({ type, archives }) => {
        archiveMap[type] = archives;
      });
      setArchives(archiveMap);
    } catch (error) {
      console.error('Error fetching archives:', error);
    }
  };

  const handleSync = async (type: string) => {
    setLoading(type);
    setResults(prev => ({ ...prev, [type]: { success: false, message: 'Syncing...' } }));
    
    try {
      const syncMethod = type === 'initialStock' ? 'syncInitialStock' : `sync${type.charAt(0).toUpperCase() + type.slice(1)}`;
      const response = await sheetsApi[syncMethod as 'syncConsumption' | 'syncPurchases' | 'syncCorrections' | 'syncInitialStock']();
      
      setResults(prev => ({
        ...prev,
        [type]: response
      }));
      
      if (response.success) {
        await fetchPendingCounts();
        await fetchArchives();
        showNotification(`${type} synced successfully! Added ${response.added || 0} records.`, 'success');
      } else {
        showNotification(response.message, 'error');
      }
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        [type]: {
          success: false,
          message: error.response?.data?.error || 'Sync failed'
        }
      }));
      showNotification('Sync failed. Please try again.', 'error');
    } finally {
      setLoading(null);
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    const syncOrder = ['consumption', 'purchases', 'corrections', 'initialStock'];
    let totalSynced = 0;
    
    for (const type of syncOrder) {
      if (pendingCounts[type as keyof typeof pendingCounts] > 0) {
        await handleSync(type);
        totalSynced += pendingCounts[type as keyof typeof pendingCounts];
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    setSyncing(false);
    showNotification(`All data synced! Processed ${totalSynced} records.`, 'success');
  };

  const handleClearInventory = async () => {
    setClearingInventory(true);
    try {
      const response = await sheetsApi.clearInventory();
      if (response.success) {
        await fetchPendingCounts();
        showNotification(
          `Cleared ${response.details?.transactionsDeleted || 0} transactions and reset ${response.details?.productsReset || 0} products`,
          'success'
        );
      }
    } catch (error: any) {
      showNotification('Failed to clear inventory', 'error');
    } finally {
      setClearingInventory(false);
      setShowClearConfirm(false);
    }
  };

  const showNotification = (message: string, severity: 'success' | 'error' | 'warning') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setShowSnackbar(true);
  };

  const totalPending = Object.values(pendingCounts).reduce((sum, count) => sum + count, 0);
  const currentCategory = categories[activeTab];
  const currentPending = pendingCounts[currentCategory.type];
  const currentResult = results[currentCategory.type];
  const hasArchives = archives[currentCategory.type]?.length > 0;

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header Section */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          mb: 3
        }}>
          <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">
            Google Sheets Sync
          </Typography>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Clear all inventory data">
              <IconButton 
                color="error" 
                onClick={() => setShowClearConfirm(true)}
                disabled={clearingInventory || loading !== null}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh counts">
              <IconButton 
                onClick={() => {
                  fetchPendingCounts();
                  fetchArchives();
                }} 
                disabled={refreshing}
              >
                <RefreshIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* Overview Stats */}
        <Box 
          sx={{ 
            p: 2,
            borderRadius: 2,
            bgcolor: totalPending > 0 ? 'rgba(25, 118, 210, 0.08)' : 'grey.100',
            border: 1,
            borderColor: totalPending > 0 ? 'primary.main' : 'grey.300'
          }}
        >
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2} 
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h6" fontWeight="medium">
                {totalPending > 0 ? `${totalPending} Changes Pending` : 'All Synced'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {totalPending > 0 
                  ? 'Review and sync your Google Sheets data'
                  : 'Your database is up to date with Google Sheets'
                }
              </Typography>
            </Box>
            {totalPending > 0 && (
              <Button
                variant="contained"
                size={isMobile ? 'medium' : 'large'}
                startIcon={syncing ? <CircularProgress size={20} /> : <SyncIcon />}
                onClick={handleSyncAll}
                disabled={syncing || loading !== null}
                fullWidth={isMobile}
                sx={{ minWidth: { sm: 200 } }}
              >
                Sync All Changes
              </Button>
            )}
          </Stack>
        </Box>
      </Box>

      {/* Tabs Navigation */}
      <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant={isMobile ? 'scrollable' : 'fullWidth'}
          scrollButtons={isMobile ? 'auto' : false}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {categories.map((category, index) => (
            <Tab
              key={category.type}
              label={
                <Badge 
                  badgeContent={pendingCounts[category.type]} 
                  color="warning"
                  sx={{ 
                    '& .MuiBadge-badge': { 
                      right: -8, 
                      top: 8,
                      fontSize: '0.7rem'
                    } 
                  }}
                >
                  <Stack 
                    direction={isMobile ? 'column' : 'row'} 
                    spacing={isMobile ? 0.5 : 1} 
                    alignItems="center"
                  >
                    <Box sx={{ color: category.color, fontSize: isMobile ? '1.2rem' : '1.5rem' }}>
                      {category.icon}
                    </Box>
                    <Typography 
                      variant={isMobile ? 'caption' : 'body2'}
                      sx={{ fontWeight: 500 }}
                    >
                      {category.shortTitle}
                    </Typography>
                  </Stack>
                </Badge>
              }
              id={`sync-tab-${index}`}
              aria-controls={`sync-tabpanel-${index}`}
              sx={{
                minHeight: isMobile ? 64 : 48,
                textTransform: 'none'
              }}
            />
          ))}
        </Tabs>

        {/* Tab Content */}
        {categories.map((category, index) => (
          <TabPanel key={category.type} value={activeTab} index={index}>
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
              {/* Category Header */}
              <Stack spacing={3}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {category.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {category.description}
                  </Typography>
                </Box>

                {/* Action Buttons */}
                <Stack 
                  direction={{ xs: 'column', sm: 'row' }} 
                  spacing={2}
                  alignItems={{ sm: 'center' }}
                >
                  <Button
                    variant="outlined"
                    startIcon={<OpenInNewIcon />}
                    onClick={() => window.open(category.sheetUrl, '_blank')}
                    fullWidth={isMobile}
                  >
                    Open Google Sheet
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={loading === category.type ? <CircularProgress size={20} /> : <UploadIcon />}
                    onClick={() => handleSync(category.type)}
                    disabled={loading !== null || currentPending === 0}
                    fullWidth={isMobile}
                    sx={{ 
                      bgcolor: category.color,
                      '&:hover': { bgcolor: category.color }
                    }}
                  >
                    Sync {currentPending > 0 ? `${currentPending} Records` : 'Data'}
                  </Button>
                </Stack>

                {/* Help Text */}
                <Alert severity="info" icon={<InfoIcon />}>
                  <Typography variant="body2">{category.helpText}</Typography>
                </Alert>

                {/* Sync Result */}
                {currentResult && (
                  <Alert 
                    severity={currentResult.success ? 'success' : 'error'}
                    icon={currentResult.success ? <CheckIcon /> : <ErrorIcon />}
                  >
                    <Typography variant="body2">{currentResult.message}</Typography>
                    
                    {/* Errors */}
                    {currentResult.errors && currentResult.errors.length > 0 && (
                      <Accordion sx={{ mt: 1, bgcolor: 'transparent' }} elevation={0}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="body2" color="error">
                            {currentResult.errors.length} errors found
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <List dense>
                            {currentResult.errors.map((error, idx) => (
                              <ListItem key={idx}>
                                <ListItemText 
                                  primary={error} 
                                  primaryTypographyProps={{ variant: 'caption' }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </AccordionDetails>
                      </Accordion>
                    )}

                    {/* Warnings */}
                    {currentResult.warnings && currentResult.warnings.length > 0 && (
                      <Accordion sx={{ mt: 1, bgcolor: 'transparent' }} elevation={0}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="body2" color="warning.main">
                            {currentResult.warnings.length} warnings
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <List dense>
                            {currentResult.warnings.map((warning, idx) => (
                              <ListItem key={idx}>
                                <ListItemText 
                                  primary={warning} 
                                  primaryTypographyProps={{ 
                                    variant: 'caption',
                                    color: 'warning.main'
                                  }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </AccordionDetails>
                      </Accordion>
                    )}
                  </Alert>
                )}

                {/* Archives */}
                {hasArchives && (
                  <Accordion 
                    expanded={expandedArchives}
                    onChange={(_, isExpanded) => setExpandedArchives(isExpanded)}
                    elevation={0}
                    sx={{ bgcolor: 'grey.50' }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="body2" color="text.secondary">
                        {archives[category.type].length} Archived Sync{archives[category.type].length > 1 ? 's' : ''}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={1}>
                        {archives[category.type].map((archive, idx) => (
                          <Chip
                            key={idx}
                            label={archive.replace('Archive_', '')}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                )}
              </Stack>
            </Box>
          </TabPanel>
        ))}
      </Box>

      {/* Clear Inventory Dialog */}
      <Dialog
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Clear All Inventory Data?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete all:
            <ul>
              <li>Transactions (purchases, consumption, corrections)</li>
              <li>Product stock levels (will be reset to 0)</li>
              <li>Average consumption data (will be reset to 0)</li>
            </ul>
            <strong>This action cannot be undone.</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowClearConfirm(false)}>Cancel</Button>
          <Button
            onClick={handleClearInventory}
            color="error"
            variant="contained"
            disabled={clearingInventory}
            startIcon={clearingInventory && <CircularProgress size={20} />}
          >
            Clear All Data
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={6000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setShowSnackbar(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SheetsSyncRedesigned;