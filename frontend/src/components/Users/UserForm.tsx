import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
} from '@mui/material';
import { authApi } from '../../services/api';
import { salesApi } from '../../services/salesApi';
import { User, UserFormData, ROLE_LABELS } from '../../types/user';

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  user: User | null;
}

const UserForm: React.FC<UserFormProps> = ({ open, onClose, onSubmit, user }) => {
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    password: '',
    role: 'user',
    firstName: '',
    lastName: '',
    phoneNumber: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
        password: '',
        role: user.role,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumber || ''
      });
    }
  }, [user]);

  const handleChange = (field: keyof UserFormData) => (
    e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>
  ) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = user 
        ? await authApi.updateUser(user.id, formData)
        : await authApi.register(formData);

      // Create sales team member in two cases:
      // 1. New user with sales role
      // 2. Existing user being updated to a sales role
      const isSalesRole = ['SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD'].includes(formData.role);
      const wasNotSalesRole = user && !['SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD'].includes(user.role);
      
      if (isSalesRole && (!user || wasNotSalesRole)) {
        try {
          const userId = user ? user.id : response.data.user.id;
          console.log('Creating sales team member for:', userId);
          await salesApi.createSalesTeamMember({
            userId,
            territory: '',
            targetQuarter: new Date().getMonth() < 3 ? 1 : 
                          new Date().getMonth() < 6 ? 2 : 
                          new Date().getMonth() < 9 ? 3 : 4,
            targetYear: new Date().getFullYear(),
            targetAmount: 0,
            reportingTo: null
          });
        } catch (err) {
          console.error('Error creating sales team member:', err);
          setError('User updated but failed to set up sales team member');
          return;
        }
      }

      setError('');
      onSubmit();
    } catch (err: any) {
      console.error('Error submitting form:', err);
      setError(err.response?.data?.error || 'Failed to submit form');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{user ? 'Edit User' : 'Create User'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                required
                label="First Name"
                value={formData.firstName}
                onChange={handleChange('firstName')}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                required
                label="Last Name"
                value={formData.lastName}
                onChange={handleChange('lastName')}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                required
                label="Username"
                value={formData.username}
                onChange={handleChange('username')}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                required
                label="Email"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Password"
                type="password"
                value={formData.password}
                onChange={handleChange('password')}
                required={!user}
                fullWidth
                helperText={user ? "Leave blank to keep current password" : "Required for new user"}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Phone Number"
                value={formData.phoneNumber}
                onChange={handleChange('phoneNumber')}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  onChange={handleChange('role') as any}
                  label="Role"
                >
                  {Object.entries(ROLE_LABELS).map(([role, label]) => (
                    <MenuItem key={role} value={role}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading}
          >
            {loading ? 'Saving...' : user ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default UserForm; 