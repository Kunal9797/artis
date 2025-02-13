import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  CircularProgress,
  Alert,
  SelectChangeEvent
} from '@mui/material';
import { authApi } from '../../../services/api';
import { ILeadAssignment } from '../../../types/sales';

interface LeadAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  onAssign: (data: ILeadAssignment) => Promise<void>;
  leadId: string;
  currentAssignee?: string;
  isLoading?: boolean;
  error?: string;
}

const LeadAssignmentDialog: React.FC<LeadAssignmentDialogProps> = ({
  open,
  onClose,
  onAssign,
  leadId,
  currentAssignee,
  isLoading = false,
  error
}) => {
  const [assignmentData, setAssignmentData] = useState<ILeadAssignment>({
    leadId,
    assignedTo: currentAssignee || '',
    notes: ''
  });
  const [salesTeamMembers, setSalesTeamMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    const fetchSalesTeamMembers = async () => {
      try {
        setLoadingMembers(true);
        const response = await authApi.getSalesTeamMembers();
        setSalesTeamMembers(response.data);
      } catch (error) {
        console.error('Error fetching sales team members:', error);
      } finally {
        setLoadingMembers(false);
      }
    };

    if (open) {
      fetchSalesTeamMembers();
    }
  }, [open]);

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    setAssignmentData(prev => ({
      ...prev,
      assignedTo: e.target.value
    }));
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAssignmentData(prev => ({
      ...prev,
      notes: e.target.value
    }));
  };

  const handleSubmit = async () => {
    await onAssign(assignmentData);
  };

  const isValid = () => {
    return assignmentData.assignedTo !== '' && 
           assignmentData.assignedTo !== currentAssignee;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Reassign Lead
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Assign To</InputLabel>
            <Select
              value={assignmentData.assignedTo}
              onChange={handleSelectChange}
              disabled={loadingMembers || isLoading}
              label="Assign To"
            >
              {salesTeamMembers.map((member) => (
                <MenuItem 
                  key={member.id} 
                  value={member.id}
                  disabled={member.id === currentAssignee}
                >
                  {member.name}
                  {member.id === currentAssignee ? ' (Current)' : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Reassignment Notes"
            value={assignmentData.notes}
            onChange={handleNotesChange}
            multiline
            rows={3}
            disabled={isLoading}
            placeholder="Add any notes about this reassignment"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={onClose}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!isValid() || isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          Reassign
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LeadAssignmentDialog; 