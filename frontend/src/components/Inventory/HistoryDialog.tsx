import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { inventoryApi } from '../../services/api';
import { Transaction } from '../../types/transaction';

interface HistoryDialogProps {
  open: boolean;
  onClose: () => void;
  productId: string;
}

const HistoryDialog: React.FC<HistoryDialogProps> = ({ open, onClose, productId }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && productId) {
      fetchTransactions();
    }
  }, [open, productId]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await inventoryApi.getProductTransactions(productId);
      setTransactions(response.data.transactions);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionTypeChip = (type: string) => {
    switch (type) {
      case 'IN':
        return <Chip label="IN" size="small" color="primary" />;
      case 'OUT':
        return <Chip label="OUT" size="small" color="secondary" />;
      case 'CORRECTION':
        return <Chip label="CORRECTION" size="small" color="warning" />;
      default:
        return <Chip label={type} size="small" />;
    }
  };

  const getQuantityColor = (transaction: Transaction) => {
    if (transaction.type === 'IN') return 'success.main';
    if (transaction.type === 'OUT') return 'error.main';
    if (transaction.type === 'CORRECTION') {
      return Number(transaction.quantity) >= 0 ? 'success.main' : 'error.main';
    }
    return 'inherit';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Transaction History
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Balance</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow 
                  key={transaction.id}
                  sx={{ 
                    backgroundColor: transaction.type === 'CORRECTION' ? 'rgba(255, 152, 0, 0.05)' : 'inherit'
                  }}
                >
                  <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                  <TableCell>{getTransactionTypeChip(transaction.type)}</TableCell>
                  <TableCell 
                    align="right"
                    sx={{ 
                      color: getQuantityColor(transaction),
                      fontWeight: transaction.type === 'CORRECTION' ? 'bold' : 'inherit'
                    }}
                  >
                    {transaction.quantity > 0 && transaction.type !== 'OUT' ? '+' : ''}
                    {transaction.quantity}
                  </TableCell>
                  <TableCell align="right">{transaction.balance}</TableCell>
                  <TableCell>{transaction.notes || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
    </Dialog>
  );
};

export default HistoryDialog; 