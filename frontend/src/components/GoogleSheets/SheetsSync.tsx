import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Grid,
  Chip,
  CircularProgress,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Divider,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Description as FileIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import sheetsApi from '../../services/sheetsApi';

interface SheetData {
  type: 'consumption' | 'purchases' | 'corrections' | 'initialStock';
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  sheetUrl?: string;
}

const SheetsSync: React.FC = () => {
  const [pendingCounts, setPendingCounts] = useState({
    consumption: 0,
    purchases: 0,
    corrections: 0,
    initialStock: 0
  });
  const [loading, setLoading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [clearingInventory, setClearingInventory] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [archives, setArchives] = useState<{ [key: string]: string[] }>({});
  const [results, setResults] = useState<{[key: string]: {
    success: boolean;
    message: string;
    added?: number;
    errors?: string[];
    warnings?: string[];
  }}>({}); 
  const [expandedErrors, setExpandedErrors] = useState<{[key: string]: boolean}>({});
  const [expandedWarnings, setExpandedWarnings] = useState<{[key: string]: boolean}>({});

  const sheets: SheetData[] = [
    {
      type: 'consumption',
      title: 'Monthly Consumption',
      description: 'Upload monthly consumption data for all products',
      icon: <FileIcon />,
      color: '#1976d2',
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1hwS0u_Mcf7795WeMlX3Eez7j0J4ikR8JCz19nJvisJU/edit'
    },
    {
      type: 'purchases',
      title: 'Purchase Transactions',
      description: 'Upload individual purchase transactions with dates',
      icon: <FileIcon />,
      color: '#388e3c',
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1gPOqkdU6NpOC0yx6Q-tx2PZs54VDyrbip5kTUJQ13Tw/edit'
    },
    {
      type: 'corrections',
      title: 'Stock Corrections',
      description: 'Apply stock adjustments with +/- amounts',
      icon: <FileIcon />,
      color: '#f57c00',
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1WxtUXZC4XT7K5TX--rUivk7g0tT4WCBwc7tbyksKT3w/edit'
    },
    {
      type: 'initialStock',
      title: 'Initial Stock',
      description: 'Set opening balance for products',
      icon: <FileIcon />,
      color: '#9c27b0',
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1jS87QQ0eoVNQF9ymrRhiROU_oEyW-1zhnN382EX1Abs/edit'
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
    setResults(prev => ({ ...prev, [type]: { success: false, message: 'Loading...' } }));
    
    try {
      const syncMethod = type === 'initialStock' ? 'syncInitialStock' : `sync${type.charAt(0).toUpperCase() + type.slice(1)}`;
      const response = await sheetsApi[syncMethod as 'syncConsumption' | 'syncPurchases' | 'syncCorrections' | 'syncInitialStock']();
      setResults(prev => ({
        ...prev,
        [type]: response
      }));
      
      // Refresh counts and archives after successful sync
      if (response.success) {
        await fetchPendingCounts();
        await fetchArchives();
      }
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        [type]: {
          success: false,
          message: error.response?.data?.error || 'Sync failed'
        }
      }));
    } finally {
      setLoading(null);
    }
  };

  const toggleErrors = (type: string) => {
    setExpandedErrors(prev => ({ ...prev, [type]: !prev[type] }));
  };
  
  const toggleWarnings = (type: string) => {
    setExpandedWarnings(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handleSyncAll = async () => {
    const syncOrder = ['consumption', 'purchases', 'corrections', 'initialStock'];
    
    for (const type of syncOrder) {
      if (pendingCounts[type as keyof typeof pendingCounts] > 0) {
        await handleSync(type);
        // Add a small delay between syncs to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  const handleClearInventory = async () => {
    setClearingInventory(true);
    try {
      const response = await sheetsApi.clearInventory();
      if (response.success) {
        // Show success message
        setResults(prev => ({
          ...prev,
          clearInventory: {
            success: true,
            message: `Cleared ${response.details?.transactionsDeleted || 0} transactions and reset ${response.details?.productsReset || 0} products`
          }
        }));
        // Refresh counts
        await fetchPendingCounts();
      }
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        clearInventory: {
          success: false,
          message: error.response?.data?.error || 'Failed to clear inventory'
        }
      }));
    } finally {
      setClearingInventory(false);
      setShowClearConfirm(false);
    }
  };

  const totalPending = Object.values(pendingCounts).reduce((sum, count) => sum + count, 0);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Google Sheets Sync</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={clearingInventory ? <CircularProgress size={20} /> : <DeleteIcon />}
            onClick={() => setShowClearConfirm(true)}
            disabled={clearingInventory || loading !== null}
          >
            Clear Inventory
          </Button>
          {totalPending > 0 && (
            <Button
              variant="contained"
              color="primary"
              startIcon={loading ? <CircularProgress size={20} /> : <UploadIcon />}
              onClick={handleSyncAll}
              disabled={loading !== null}
            >
              Sync All ({totalPending})
            </Button>
          )}
          <Tooltip title="Refresh">
            <IconButton onClick={async () => {
              await fetchPendingCounts();
              await fetchArchives();
            }} disabled={refreshing}>
              <RefreshIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Upload your data to the Google Sheets below, then click sync to import into the database.
          Data will be archived to timestamped tabs after successful sync, maintaining your history.
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {sheets.map((sheet) => (
          <Grid item xs={12} sm={6} md={3} key={sheet.type}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ 
                    bgcolor: sheet.color, 
                    color: 'white', 
                    p: 1, 
                    borderRadius: 1, 
                    mr: 2 
                  }}>
                    {sheet.icon}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">{sheet.title}</Typography>
                    {pendingCounts[sheet.type] > 0 && (
                      <Chip 
                        label={`${pendingCounts[sheet.type]} pending`} 
                        color="warning" 
                        size="small" 
                      />
                    )}
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {sheet.description}
                </Typography>

                <Stack spacing={1}>
                  {sheet.sheetUrl ? (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<FileIcon />}
                      onClick={() => window.open(sheet.sheetUrl, '_blank')}
                      fullWidth
                    >
                      Open Sheet
                    </Button>
                  ) : sheet.type === 'initialStock' && (
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
                      Please create a Google Sheet and share it with the service account
                    </Typography>
                  )}
                  
                  <Button
                    variant="contained"
                    startIcon={loading === sheet.type ? <CircularProgress size={20} /> : <UploadIcon />}
                    onClick={() => handleSync(sheet.type)}
                    disabled={loading !== null || pendingCounts[sheet.type] === 0}
                    fullWidth
                  >
                    Sync {pendingCounts[sheet.type] > 0 ? `(${pendingCounts[sheet.type]})` : ''}
                  </Button>
                </Stack>

                {results[sheet.type] && (
                  <Box sx={{ mt: 2 }}>
                    <Alert 
                      severity={results[sheet.type].success ? 'success' : 'error'}
                      icon={results[sheet.type].success ? <CheckIcon /> : <ErrorIcon />}
                    >
                      <Typography variant="body2">
                        {results[sheet.type].message}
                      </Typography>
                      {results[sheet.type].errors && results[sheet.type].errors!.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Button
                            size="small"
                            onClick={() => toggleErrors(sheet.type)}
                            endIcon={expandedErrors[sheet.type] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          >
                            {results[sheet.type].errors!.length} errors
                          </Button>
                          <Collapse in={expandedErrors[sheet.type]}>
                            <List dense sx={{ mt: 1 }}>
                              {results[sheet.type].errors!.map((error, index) => (
                                <ListItem key={index} sx={{ pl: 0 }}>
                                  <ListItemText 
                                    primary={error} 
                                    primaryTypographyProps={{ variant: 'caption' }}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </Collapse>
                        </Box>
                      )}
                      {results[sheet.type].warnings && results[sheet.type].warnings!.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Button
                            size="small"
                            onClick={() => toggleWarnings(sheet.type)}
                            endIcon={expandedWarnings[sheet.type] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            sx={{ color: 'warning.main' }}
                          >
                            {results[sheet.type].warnings!.length} warnings
                          </Button>
                          <Collapse in={expandedWarnings[sheet.type]}>
                            <List dense sx={{ mt: 1 }}>
                              {results[sheet.type].warnings!.map((warning, index) => (
                                <ListItem key={index} sx={{ pl: 0 }}>
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
                          </Collapse>
                        </Box>
                      )}
                    </Alert>
                  </Box>
                )}
                
                {archives[sheet.type] && archives[sheet.type].length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Divider sx={{ mb: 1 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Archives ({archives[sheet.type].length})
                    </Typography>
                    <Stack spacing={0.5}>
                      {archives[sheet.type].slice(0, 3).map((archive, index) => (
                        <Chip
                          key={index}
                          label={archive.replace('Archive_', '')}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      ))}
                      {archives[sheet.type].length > 3 && (
                        <Typography variant="caption" color="text.secondary">
                          +{archives[sheet.type].length - 3} more
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="h6" gutterBottom>Instructions</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" gutterBottom>Consumption Data</Typography>
            <Typography variant="body2" color="text.secondary">
              Enter the total consumption for each product for the current month. 
              Leave blank if no consumption.
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" gutterBottom>Purchase Data</Typography>
            <Typography variant="body2" color="text.secondary">
              Enter individual purchase transactions with dates, amounts, and suppliers. 
              One row per transaction.
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" gutterBottom>Corrections</Typography>
            <Typography variant="body2" color="text.secondary">
              Use +/- amounts to adjust stock (e.g., +50 or -30). 
              Include reason for tracking.
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" gutterBottom>Initial Stock</Typography>
            <Typography variant="body2" color="text.secondary">
              Set the opening balance for products. 
              Use only for initial setup or major corrections.
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Clear Inventory Confirmation Dialog */}
      <Dialog
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
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
            This action cannot be undone. Are you sure you want to continue?
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

      {/* Clear Inventory Result Alert */}
      {results.clearInventory && (
        <Alert 
          severity={results.clearInventory.success ? 'success' : 'error'}
          sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}
          onClose={() => setResults(prev => ({ ...prev, clearInventory: undefined } as any))}
        >
          {results.clearInventory.message}
        </Alert>
      )}
    </Box>
  );
};

export default SheetsSync;