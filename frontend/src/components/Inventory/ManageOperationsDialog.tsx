import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Chip,
  List,
  CircularProgress,
  Alert,
  Divider,
  Tooltip,
  useTheme,
  useMediaQuery,
  Fade,
  Grow
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  Upload as UploadIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  Edit as EditIcon,
  Inventory as InventoryIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { inventoryApi } from '../../services/api';
import { useTheme as useCustomTheme } from '../../context/ThemeContext';

interface Operation {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  transactions: any[];
  summary: {
    totalTransactions: number;
    productsAffected: number;
    totalQuantityIn: number;
    totalQuantityOut: number;
    totalCorrections: number;
  };
}

interface Props {
  open: boolean;
  onClose: () => void;
  onOperationDeleted?: () => void;
}

const ManageOperationsDialog: React.FC<Props> = ({ open, onClose, onOperationDeleted }) => {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingOperation, setDeletingOperation] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const { isDarkMode } = useCustomTheme();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  useEffect(() => {
    if (open) {
      fetchOperations();
    }
  }, [open]);

  const fetchOperations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await inventoryApi.getOperationsHistory();
      setOperations(response.data.operations);
    } catch (error) {
      console.error('Error fetching operations:', error);
      setError('Failed to load operations history');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOperation = async (operationId: string) => {
    if (!window.confirm('Are you sure you want to delete this operation? This will reverse all its effects and remove the associated transactions.')) {
      return;
    }

    try {
      setDeletingOperation(operationId);
      await inventoryApi.deleteOperation(operationId);
      
      // Remove the operation from the list
      setOperations(prev => prev.filter(op => op.id !== operationId));
      
      // Notify parent component
      if (onOperationDeleted) {
        onOperationDeleted();
      }
    } catch (error) {
      console.error('Error deleting operation:', error);
      setError('Failed to delete operation');
    } finally {
      setDeletingOperation(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('⚠️ Are you sure you want to DELETE ALL OPERATIONS? This will:\n\n• Delete ALL transactions\n• Reset ALL stock levels to zero\n• Clear ALL consumption history\n\nThis action cannot be undone!')) {
      return;
    }

    try {
      setDeletingAll(true);
      await inventoryApi.deleteAllOperations();
      
      // Clear the operations list
      setOperations([]);
      
      // Notify parent component
      if (onOperationDeleted) {
        onOperationDeleted();
      }
    } catch (error) {
      console.error('Error deleting all operations:', error);
      setError('Failed to delete all operations');
    } finally {
      setDeletingAll(false);
    }
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'bulk_inventory':
        return <InventoryIcon />;
      case 'bulk_consumption':
        return <TrendingDownIcon />;
      case 'bulk_purchase':
        return <TrendingUpIcon />;
      case 'bulk_corrections':
        return <EditIcon />;
      case 'individual_purchase':
        return <TrendingUpIcon />;
      case 'individual':
        return <AssessmentIcon />;
      default:
        return <HistoryIcon />;
    }
  };

  const getOperationColor = (type: string) => {
    switch (type) {
      case 'bulk_inventory':
        return '#2196f3';
      case 'bulk_consumption':
        return '#f44336';
      case 'bulk_purchase':
        return '#4caf50';
      case 'bulk_corrections':
        return '#ff9800';
      case 'individual_purchase':
        return '#4caf50';
      case 'individual':
        return '#9c27b0';
      default:
        return '#757575';
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          bgcolor: isDarkMode ? 'background.paper' : '#fff',
          minHeight: isMobile ? '100vh' : '70vh',
          borderRadius: isMobile ? 0 : 3,
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          bgcolor: isDarkMode ? 'rgba(25, 118, 210, 0.1)' : 'rgba(25, 118, 210, 0.05)',
          borderBottom: 1,
          borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <HistoryIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Manage Recent Operations
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ p: 2 }}>
            {operations.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <HistoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No recent operations found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Operations will appear here as you perform bulk uploads or individual transactions
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {operations.map((operation, index) => (
                  <Grow
                    key={operation.id}
                    in={true}
                    timeout={300 + index * 100}
                  >
                    <Card 
                      elevation={0}
                      sx={{ 
                        mb: 2,
                        borderRadius: 3,
                        bgcolor: isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                        border: 1,
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '4px',
                          background: getOperationColor(operation.type),
                        }
                      }}
                    >
                      <CardContent sx={{ p: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                          <Box sx={{ 
                            p: 1, 
                            borderRadius: 2,
                            bgcolor: `${getOperationColor(operation.type)}15`,
                            color: getOperationColor(operation.type),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {getOperationIcon(operation.type)}
                          </Box>
                          
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                fontWeight: 700,
                                mb: 0.5,
                                color: isDarkMode ? '#fff' : '#1a1a1a',
                                fontSize: '1rem'
                              }}
                            >
                              {operation.description}
                            </Typography>
                            
                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              sx={{ mb: 1.5, fontSize: '0.85rem' }}
                            >
                              {formatDate(operation.timestamp)}
                            </Typography>

                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                              <Chip
                                size="small"
                                label={`${operation.summary.totalTransactions} transactions`}
                                sx={{ fontSize: '0.7rem' }}
                              />
                              <Chip
                                size="small"
                                label={`${operation.summary.productsAffected} products`}
                                sx={{ fontSize: '0.7rem' }}
                              />
                              {operation.summary.totalQuantityIn > 0 && (
                                <Chip
                                  size="small"
                                  label={`+${operation.summary.totalQuantityIn}kg IN`}
                                  color="success"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              )}
                              {operation.summary.totalQuantityOut > 0 && (
                                <Chip
                                  size="small"
                                  label={`-${operation.summary.totalQuantityOut}kg OUT`}
                                  color="error"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              )}
                              {operation.summary.totalCorrections > 0 && (
                                <Chip
                                  size="small"
                                  label={`${operation.summary.totalCorrections}kg corrections`}
                                  color="warning"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              )}
                            </Box>
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Tooltip title="Delete this operation and reverse its effects">
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleDeleteOperation(operation.id)}
                                disabled={deletingOperation === operation.id}
                                sx={{
                                  bgcolor: 'error.main',
                                  color: 'error.contrastText',
                                  '&:hover': {
                                    bgcolor: 'error.dark',
                                  },
                                  '&:disabled': {
                                    bgcolor: 'action.disabled',
                                  }
                                }}
                              >
                                {deletingOperation === operation.id ? (
                                  <CircularProgress size={16} color="inherit" />
                                ) : (
                                  <DeleteIcon sx={{ fontSize: 16 }} />
                                )}
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grow>
                ))}
              </List>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ 
        p: 2, 
        borderTop: 1, 
        borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
        bgcolor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)'
      }}>
        <Button 
          onClick={handleDeleteAll}
          variant="outlined"
          color="error"
          disabled={deletingAll || operations.length === 0}
          startIcon={deletingAll ? <CircularProgress size={16} /> : <WarningIcon />}
          sx={{ mr: 'auto' }}
        >
          {deletingAll ? 'Deleting All...' : 'Delete All Operations'}
        </Button>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
        <Button 
          onClick={fetchOperations} 
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManageOperationsDialog; 