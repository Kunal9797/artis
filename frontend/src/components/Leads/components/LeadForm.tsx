import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  SelectChangeEvent
} from '@mui/material';
import { useAuth } from '../../../context/AuthContext';
import { authApi } from '../../../services/api';
import { ILeadFormData } from '../../../types/sales';

interface LeadFormProps {
  initialData?: Partial<ILeadFormData>;
  onSubmit: (data: ILeadFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string;
}

const LeadForm: React.FC<LeadFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  error
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<ILeadFormData>({
    customerName: '',
    phoneNumber: '',
    location: '',
    notes: '',
    assignedTo: '',
    enquiryDetails: '',
    ...initialData
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

    fetchSalesTeamMembers();
  }, [user]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name as string]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting lead data:', JSON.stringify(formData, null, 2));
    await onSubmit(formData);
  };

  const isValid = () => {
    return (
      formData.customerName.trim() !== '' &&
      formData.phoneNumber.trim() !== '' &&
      formData.location.trim() !== '' &&
      formData.assignedTo !== ''
    );
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {initialData ? 'Edit Lead' : 'Create New Lead'}
          </Typography>
        </Grid>

        {error && (
          <Grid item xs={12}>
            <Alert severity="error">{error}</Alert>
          </Grid>
        )}

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Customer Name"
            name="customerName"
            value={formData.customerName}
            onChange={handleTextChange}
            required
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Phone Number"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleTextChange}
            required
            inputProps={{
              pattern: "^\\+?[1-9][0-9]{7,14}$"
            }}
            helperText="Enter a valid phone number (8-15 digits, can start with +)"
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Location"
            name="location"
            value={formData.location}
            onChange={handleTextChange}
            required
          />
        </Grid>

        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Assign To</InputLabel>
            <Select
              name="assignedTo"
              value={formData.assignedTo}
              onChange={handleSelectChange}
              required
              disabled={loadingMembers}
            >
              {salesTeamMembers.map((member) => (
                <MenuItem key={member.id} value={member.id}>
                  {member.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            required
            label="Enquiry Details"
            name="enquiryDetails"
            value={formData.enquiryDetails}
            onChange={handleTextChange}
            multiline
            rows={3}
            placeholder="Enter details about the lead's enquiry"
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Additional Notes"
            name="notes"
            value={formData.notes}
            onChange={handleTextChange}
            multiline
            rows={3}
            placeholder="Any additional notes (optional)"
          />
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!isValid() || isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
              {initialData ? 'Update' : 'Create'} Lead
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LeadForm; 