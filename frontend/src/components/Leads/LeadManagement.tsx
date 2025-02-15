import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  useTheme,
  Dialog,
  DialogContent
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import leadApi from '../../services/leadApi';
import { ILead, ILeadFormData, ILeadFilters, ILeadAssignment } from '../../types/sales';
import LeadForm from './components/LeadForm';
import LeadList from './components/LeadList';
import { AxiosError } from 'axios';

const LeadManagement: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [leads, setLeads] = useState<ILead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<ILeadFilters>({
    page: 0,
    limit: 10,
    status: undefined,
    searchTerm: undefined
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<ILead | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    console.log('Current user:', user);
    console.log('User role:', user?.role);
    fetchLeads();
  }, [filters]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await leadApi.getLeads(filters);
      setLeads(response.data);
      setTotalCount(parseInt(response.headers['x-total-count'] || '0', 10));
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError('Failed to fetch leads. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLead = async (data: ILeadFormData) => {
    try {
      setFormLoading(true);
      setFormError(null);
      console.log('Creating lead with data:', data);
      await leadApi.createLead(data);
      setShowForm(false);
      fetchLeads();
    } catch (err) {
      const error = err as AxiosError<{ error: string }>;
      console.error('Error creating lead:', error);
      
      if (error.response?.data?.error) {
        setFormError(`Failed to create lead: ${error.response.data.error}`);
      } else {
        setFormError('Failed to create lead. Please try again.');
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateLead = async (data: ILeadFormData) => {
    if (!editingLead) return;

    try {
      setFormLoading(true);
      setFormError(null);
      await leadApi.updateLead(editingLead.id, data);
      setShowForm(false);
      setEditingLead(null);
      fetchLeads();
    } catch (err) {
      console.error('Error updating lead:', err);
      setFormError('Failed to update lead. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteLead = async (lead: ILead) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;

    try {
      setLoading(true);
      setError(null);
      await leadApi.deleteLead(lead.id);
      fetchLeads();
    } catch (err) {
      console.error('Error deleting lead:', err);
      setError('Failed to delete lead. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (lead: ILead) => {
    setEditingLead(lead);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingLead(null);
    setFormError(null);
  };

  const handleFilterChange = (newFilters: Partial<ILeadFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: newFilters.page ?? 0
    }));
  };

  if (!user?.role) {
    return (
      <Alert severity="error">
        You don't have permission to access this page.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Lead Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowForm(true)}
        >
          Create Lead
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <LeadList
          leads={leads}
          onEdit={handleEdit}
          onDelete={handleDeleteLead}
          filters={filters}
          onFilterChange={handleFilterChange}
          totalCount={totalCount}
          page={filters.page || 0}
          onPageChange={(newPage) => handleFilterChange({ page: newPage })}
          rowsPerPage={filters.limit || 10}
          onRowsPerPageChange={(newLimit) => 
            handleFilterChange({ limit: newLimit, page: 0 })}
        />
      )}

      <Dialog 
        open={showForm}
        onClose={handleFormClose}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          <LeadForm
            initialData={editingLead || undefined}
            onSubmit={editingLead ? handleUpdateLead : handleCreateLead}
            onCancel={handleFormClose}
            isLoading={formLoading}
            error={formError || undefined}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default LeadManagement; 