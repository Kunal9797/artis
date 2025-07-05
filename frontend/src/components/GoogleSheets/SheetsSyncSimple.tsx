import React, { useState, useEffect } from 'react';
import {
  Box,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Paper,
  Link,
  Collapse,
  LinearProgress,
  Divider,
  Tooltip,
  TextField
} from '@mui/material';
import {
  CloudSync as SyncIcon,
  CloudUpload as UploadIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Analytics as ConsumptionIcon,
  ShoppingCart as PurchaseIcon,
  Build as CorrectionIcon,
  Inventory as StockIcon,
  OpenInNew as OpenInNewIcon,
  Info as InfoIcon,
  History as HistoryIcon,
  Undo as UndoIcon
} from '@mui/icons-material';
import sheetsApi from '../../services/sheetsApi';
import { format } from 'date-fns';

interface SyncCategory {
  type: 'consumption' | 'purchases' | 'corrections' | 'initialStock';
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  sheetUrl?: string;
  helpText: string;
}

const SheetsSyncSimple: React.FC = () => {
  const [pendingCounts, setPendingCounts] = useState({
    consumption: 0,
    purchases: 0,
    corrections: 0,
    initialStock: 0
  });
  const [loading, setLoading] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('consumption');
  const [clearingInventory, setClearingInventory] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [archives, setArchives] = useState<{ [key: string]: string[] }>({});
  const [showArchives, setShowArchives] = useState<{ [key: string]: boolean }>({});
  const [results, setResults] = useState<{[key: string]: {
    success: boolean;
    message: string;
    added?: number;
    errors?: string[];
    warnings?: string[];
  }}>({});
  const [showSyncHistory, setShowSyncHistory] = useState(false);
  const [syncHistory, setSyncHistory] = useState<any[]>([]);
  const [syncHistoryLoading, setSyncHistoryLoading] = useState(false);
  const [undoLoading, setUndoLoading] = useState<string | null>(null);
  const [archiveNames, setArchiveNames] = useState<{[key: string]: string}>({});

  const categories: SyncCategory[] = [
    {
      type: 'consumption',
      title: 'Monthly Consumption',
      description: 'Track monthly design paper usage',
      icon: <ConsumptionIcon />,
      color: '#1976d2',
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1hwS0u_Mcf7795WeMlX3Eez7j0J4ikR8JCz19nJvisJU/edit',
      helpText: 'Enter total monthly consumption for each product.'
    },
    {
      type: 'purchases',
      title: 'Purchase Transactions',
      description: 'Record new stock purchases',
      icon: <PurchaseIcon />,
      color: '#388e3c',
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1gPOqkdU6NpOC0yx6Q-tx2PZs54VDyrbip5kTUJQ13Tw/edit',
      helpText: 'Enter individual purchase transactions with dates.'
    },
    {
      type: 'corrections',
      title: 'Stock Corrections',
      description: 'Adjust inventory levels',
      icon: <CorrectionIcon />,
      color: '#f57c00',
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1WxtUXZC4XT7K5TX--rUivk7g0tT4WCBwc7tbyksKT3w/edit',
      helpText: 'Use +/- amounts to adjust stock.'
    },
    {
      type: 'initialStock',
      title: 'Initial Stock',
      description: 'Set opening balances',
      icon: <StockIcon />,
      color: '#9c27b0',
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1jS87QQ0eoVNQF9ymrRhiROU_oEyW-1zhnN382EX1Abs/edit',
      helpText: 'Set opening balance for products.'
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
      const archiveName = archiveNames[type];
      const syncMethod = type === 'initialStock' ? 'syncInitialStock' : `sync${type.charAt(0).toUpperCase() + type.slice(1)}`;
      const response = await sheetsApi[syncMethod as 'syncConsumption' | 'syncPurchases' | 'syncCorrections' | 'syncInitialStock'](archiveName);
      
      setResults(prev => ({
        ...prev,
        [type]: response
      }));
      
      if (response.success) {
        await fetchPendingCounts();
        await fetchArchives();
        // Clear archive name after successful sync
        setArchiveNames(prev => ({ ...prev, [type]: '' }));
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

  const handleSyncAll = async () => {
    const syncOrder = ['consumption', 'purchases', 'corrections', 'initialStock'];
    
    for (const type of syncOrder) {
      if (pendingCounts[type as keyof typeof pendingCounts] > 0) {
        await handleSync(type);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  const handleClearInventory = async () => {
    setClearingInventory(true);
    try {
      const response = await sheetsApi.clearInventory();
      if (response.success) {
        await fetchPendingCounts();
        setResults(prev => ({
          ...prev,
          clearInventory: {
            success: true,
            message: `Cleared ${response.details?.transactionsDeleted || 0} transactions`
          }
        }));
      }
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        clearInventory: {
          success: false,
          message: 'Failed to clear inventory'
        }
      }));
    } finally {
      setClearingInventory(false);
      setShowClearConfirm(false);
    }
  };

  const fetchSyncHistory = async () => {
    setSyncHistoryLoading(true);
    try {
      const response = await sheetsApi.getSyncHistory(20);
      if (response.success) {
        setSyncHistory(response.data.records);
      }
    } catch (error) {
      console.error('Error fetching sync history:', error);
    } finally {
      setSyncHistoryLoading(false);
    }
  };

  const handleUndoSync = async (syncBatchId: string) => {
    setUndoLoading(syncBatchId);
    try {
      const response = await sheetsApi.undoSync(syncBatchId);
      if (response.success) {
        setResults(prev => ({
          ...prev,
          undoSync: {
            success: true,
            message: response.message
          }
        }));
        await fetchPendingCounts();
        await fetchSyncHistory();
      }
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        undoSync: {
          success: false,
          message: error.response?.data?.error || 'Failed to undo sync'
        }
      }));
    } finally {
      setUndoLoading(null);
    }
  };

  const totalPending = Object.values(pendingCounts).reduce((sum, count) => sum + count, 0);

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: 'background.default',
      pb: 4
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" fontWeight="bold">
            Google Sheets Sync
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<HistoryIcon />}
              onClick={() => {
                setShowSyncHistory(true);
                fetchSyncHistory();
              }}
            >
              History
            </Button>
            <IconButton 
              size="small"
              onClick={() => setShowClearConfirm(true)}
              disabled={clearingInventory || loading !== null}
            >
              <DeleteIcon />
            </IconButton>
            <IconButton 
              size="small"
              onClick={() => {
                fetchPendingCounts();
                fetchArchives();
              }} 
              disabled={refreshing}
            >
              <RefreshIcon />
            </IconButton>
          </Stack>
        </Stack>

        {/* Overview Card */}
        <Paper 
          variant="outlined"
          sx={{ 
            p: 2,
            bgcolor: totalPending > 0 ? 'rgba(255, 152, 0, 0.08)' : 'rgba(76, 175, 80, 0.08)',
            borderColor: totalPending > 0 ? 'warning.main' : 'success.main',
            color: 'text.primary'
          }}
        >
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              {totalPending > 0 ? (
                <WarningIcon color="warning" />
              ) : (
                <CheckIcon color="success" />
              )}
              <Typography variant="h6">
                {totalPending > 0 ? `${totalPending} Changes Pending` : 'All Synced'}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {totalPending > 0 
                ? 'Review and sync your Google Sheets data'
                : 'Your database is up to date with Google Sheets'
              }
            </Typography>
            {totalPending > 0 && (
              <Button
                variant="contained"
                fullWidth
                color="primary"
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
                onClick={handleSyncAll}
                disabled={loading !== null}
                sx={{ 
                  mt: 1,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600
                }}
              >
                Sync All Changes ({totalPending})
              </Button>
            )}
          </Stack>
        </Paper>
      </Box>

      {/* Categories */}
      <Box sx={{ p: 2 }}>
        <Stack spacing={2}>
          {categories.map((category) => {
            const isExpanded = expandedCategory === category.type;
            const pending = pendingCounts[category.type];
            const result = results[category.type];
            const hasArchives = archives[category.type]?.length > 0;

            return (
              <Paper 
                key={category.type} 
                variant="outlined"
                sx={{ 
                  overflow: 'hidden',
                  borderColor: isExpanded ? category.color : 'divider',
                  transition: 'border-color 0.2s'
                }}
              >
                {/* Category Header */}
                <Box
                  onClick={() => setExpandedCategory(isExpanded ? null : category.type)}
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    bgcolor: isExpanded ? 'action.hover' : 'transparent',
                    transition: 'background-color 0.2s',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={2} alignItems="center" flex={1}>
                      <Box sx={{ color: category.color }}>
                        {category.icon}
                      </Box>
                      <Box flex={1}>
                        <Typography variant="body1" fontWeight="medium">
                          {category.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {category.description}
                        </Typography>
                      </Box>
                      {pending > 0 && (
                        <Chip 
                          label={pending} 
                          color="warning" 
                          size="small"
                        />
                      )}
                    </Stack>
                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </Stack>
                </Box>

                {/* Expanded Content */}
                <Collapse in={isExpanded}>
                  <Divider />
                  <Box sx={{ p: 2 }}>
                    <Stack spacing={2}>
                      {/* Help Text */}
                      <Alert severity="info" icon={<InfoIcon />}>
                        <Typography variant="caption">{category.helpText}</Typography>
                      </Alert>

                      {/* Archive Name Input */}
                      <TextField
                        size="small"
                        label="Archive Name (optional)"
                        placeholder={`e.g. June 2025`}
                        value={archiveNames[category.type] || ''}
                        onChange={(e) => setArchiveNames(prev => ({ 
                          ...prev, 
                          [category.type]: e.target.value 
                        }))}
                        fullWidth
                        helperText="Will be saved as '{name}_Archive'"
                      />

                      {/* Action Buttons */}
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<OpenInNewIcon />}
                          onClick={() => window.open(category.sheetUrl, '_blank')}
                          fullWidth
                        >
                          Open Sheet
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={loading === category.type ? <CircularProgress size={16} /> : <UploadIcon />}
                          onClick={() => handleSync(category.type)}
                          disabled={loading !== null || pending === 0}
                          fullWidth
                        >
                          Sync {pending > 0 ? `(${pending})` : ''}
                        </Button>
                      </Stack>

                      {/* Result */}
                      {result && (
                        <Alert 
                          severity={result.success ? 'success' : 'error'}
                          icon={result.success ? <CheckIcon /> : <ErrorIcon />}
                        >
                          <Typography variant="caption">{result.message}</Typography>
                          
                          {/* Errors */}
                          {result.errors && result.errors.length > 0 && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="error">
                                {result.errors.length} errors:
                              </Typography>
                              <List dense>
                                {result.errors.slice(0, 3).map((error, idx) => (
                                  <ListItem key={idx} sx={{ py: 0 }}>
                                    <ListItemText 
                                      primary={error} 
                                      primaryTypographyProps={{ variant: 'caption' }}
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            </Box>
                          )}
                        </Alert>
                      )}

                      {/* Archives */}
                      {hasArchives && (
                        <Box>
                          <Button
                            size="small"
                            onClick={() => setShowArchives(prev => ({
                              ...prev,
                              [category.type]: !prev[category.type]
                            }))}
                            endIcon={showArchives[category.type] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          >
                            {archives[category.type].length} Archives
                          </Button>
                          <Collapse in={showArchives[category.type]}>
                            <Box sx={{ mt: 1, pl: 2 }}>
                              {archives[category.type].slice(0, 3).map((archive, idx) => (
                                <Chip
                                  key={idx}
                                  label={archive.replace('Archive_', '')}
                                  size="small"
                                  variant="outlined"
                                  sx={{ m: 0.5 }}
                                />
                              ))}
                            </Box>
                          </Collapse>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                </Collapse>
              </Paper>
            );
          })}
        </Stack>
      </Box>

      {/* Clear Inventory Dialog */}
      <Dialog
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Clear All Inventory?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will delete all transactions and reset product stocks to 0.
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowClearConfirm(false)}>Cancel</Button>
          <Button
            onClick={handleClearInventory}
            color="error"
            variant="contained"
            disabled={clearingInventory}
          >
            Clear All
          </Button>
        </DialogActions>
      </Dialog>

      {/* Progress Bar */}
      {loading && (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1200 }}>
          <LinearProgress />
        </Box>
      )}

      {/* Sync History Dialog */}
      <Dialog
        open={showSyncHistory}
        onClose={() => setShowSyncHistory(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Typography>Sync History</Typography>
        </DialogTitle>
        <DialogContent dividers>
          {syncHistoryLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : syncHistory.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
              No sync history available
            </Typography>
          ) : (
            <List>
              {syncHistory.map((record, index) => (
                <ListItem 
                  key={record.id} 
                  divider={index < syncHistory.length - 1}
                  secondaryAction={
                    <Box>
                      {(record.status === 'completed' || record.status === 'failed') ? (
                        <Tooltip title={`Undo this ${record.status} sync`}>
                          <IconButton
                            edge="end"
                            aria-label="undo"
                            onClick={() => handleUndoSync(record.syncBatchId)}
                            disabled={undoLoading !== null}
                            color="error"
                            size="small"
                          >
                            {undoLoading === record.syncBatchId ? (
                              <CircularProgress size={20} />
                            ) : (
                              <UndoIcon />
                            )}
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {record.status === 'undone' ? 'Already undone' : record.status}
                        </Typography>
                      )}
                    </Box>
                  }
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body1">
                          {record.syncType.charAt(0).toUpperCase() + record.syncType.slice(1)}
                        </Typography>
                        <Chip
                          label={record.status}
                          size="small"
                          color={
                            record.status === 'completed' ? 'success' : 
                            record.status === 'failed' ? 'error' : 'default'
                          }
                          variant="outlined"
                        />
                        {record.itemCount > 0 && (
                          <Chip
                            label={`${record.itemCount} items`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    }
                    secondary={
                      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(record.syncDate), 'PPpp')}
                        </Typography>
                        {record.user && (
                          <Typography variant="caption" color="text.secondary">
                            By: {record.user.username || record.user.email}
                          </Typography>
                        )}
                        {record.errors && (
                          <Alert severity="error" sx={{ mt: 1 }}>
                            <Typography variant="caption">
                              {JSON.parse(record.errors).slice(0, 3).join(', ')}
                            </Typography>
                          </Alert>
                        )}
                        {record.warnings && (
                          <Alert severity="warning" sx={{ mt: 1 }}>
                            <Typography variant="caption">
                              {JSON.parse(record.warnings).slice(0, 3).join(', ')}
                            </Typography>
                          </Alert>
                        )}
                      </Stack>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
          
          {/* Undo result */}
          {results.undoSync && (
            <Alert 
              severity={results.undoSync.success ? 'success' : 'error'} 
              sx={{ mt: 2 }}
            >
              {results.undoSync.message}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSyncHistory(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SheetsSyncSimple;