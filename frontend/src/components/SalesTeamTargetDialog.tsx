import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Typography
} from '@mui/material';
import { salesApi } from '../services/salesApi';

interface SalesTeamTargetDialogProps {
  open: boolean;
  onClose: () => void;
  member: {
    id: string;
    name: string;
    targetQuarter?: number;
    targetYear?: number;
    targetAmount?: number;
  };
  onUpdate: () => void;
}

const SalesTeamTargetDialog: React.FC<SalesTeamTargetDialogProps> = ({
  open,
  onClose,
  member,
  onUpdate
}) => {
  const currentYear = new Date().getFullYear();
  const [targetData, setTargetData] = useState({
    targetQuarter: member.targetQuarter || 1,
    targetYear: member.targetYear || currentYear,
    targetAmount: member.targetAmount || 0
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await salesApi.updateTeamMember(member.id, targetData);
      onUpdate();
      onClose();
    } catch (err) {
      console.error('Failed to update target:', err);
      setError('Failed to update target');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Set Sales Target - {member.name}</DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Quarter"
              value={targetData.targetQuarter}
              onChange={(e) => setTargetData(prev => ({ ...prev, targetQuarter: Number(e.target.value) }))}
            >
              {[1, 2, 3, 4].map(quarter => (
                <MenuItem key={quarter} value={quarter}>Q{quarter}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Year"
              value={targetData.targetYear}
              onChange={(e) => setTargetData(prev => ({ ...prev, targetYear: Number(e.target.value) }))}
            >
              {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Target Amount (Sheets)"
              type="number"
              value={Math.round(targetData.targetAmount)}
              onChange={(e) => setTargetData(prev => ({ 
                ...prev, 
                targetAmount: Math.round(Number(e.target.value)) 
              }))}
            />
          </Grid>
        </Grid>
        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary" disabled={loading}>
          {loading ? 'Saving...' : 'Save Target'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SalesTeamTargetDialog; 