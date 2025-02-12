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
  Box,
  Alert,
  Typography,
  Divider
} from '@mui/material';
import { authApi } from '../../services/api';
import { User, UserFormData, ROLE_LABELS } from '../../types/user';
import { salesApi } from '../../services/salesApi';

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  user: User | null;
}

interface SalesTeamFormData {
  reportingTo?: string;
  targetQuarter?: number;
  targetYear?: number;
  targetAmount?: number;
}

const initialFormData: UserFormData = {
  username: '',
  email: '',
  password: '',
  role: 'user',
  firstName: '',
  lastName: '',
  phoneNumber: ''
};

const UserForm: React.FC<UserFormProps> = ({ open, onClose, onSubmit, user }) => {
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [salesTeamData, setSalesTeamData] = useState<SalesTeamFormData>({});
  const [managers, setManagers] = useState<{id: string, name: string}[]>([]);
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
    } else {
      setFormData(initialFormData);
    }
  }, [user]);

  useEffect(() => {
    if (formData.role === 'SALES_EXECUTIVE') {
      loadManagers('ZONAL_HEAD');
    } else if (formData.role === 'ZONAL_HEAD') {
      loadManagers('COUNTRY_HEAD');
    }
  }, [formData.role]);

  const loadManagers = async (managerRole: string) => {
    try {
      const response = await salesApi.getAllSalesTeam();
      const filteredManagers = response.data.filter(member => member.role === managerRole);
      setManagers(filteredManagers.map(manager => ({
        id: manager.id,
        name: manager.name
      })));
    } catch (error) {
      console.error('Failed to load managers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (user) {
        // Check if this is a role change involving sales roles
        const isSalesRole = ['SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD'].includes(formData.role);
        const wasSalesRole = ['SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD'].includes(user.role);
        
        // Use updateUserWithSalesTeam if either the old or new role is a sales role
        if (isSalesRole || wasSalesRole) {
          console.log('Updating user with sales team data:', {
            userId: user.id,
            formData,
            salesTeamData
          });
          await authApi.updateUserWithSalesTeam(user.id, formData, salesTeamData);
        } else {
          await authApi.updateUser(user.id, formData);
        }
      } else {
        const isSalesRole = ['SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD'].includes(formData.role);
        if (isSalesRole) {
          await authApi.registerWithSalesTeam(formData, salesTeamData);
        } else {
          await authApi.register(formData);
        }
      }
      onSubmit();
      onClose();
    } catch (err: any) {
      console.error('Form submission error:', err);
      setError(err.response?.data?.error || 'Failed to save user. Please check all fields are valid.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof UserFormData) => (
    e: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const renderSalesTeamFields = () => {
    if (!['SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD'].includes(formData.role)) {
      return null;
    }

    return (
      <>
        {formData.role !== 'COUNTRY_HEAD' && (
          <FormControl fullWidth>
            <InputLabel>Reporting To</InputLabel>
            <Select
              value={salesTeamData.reportingTo || ''}
              onChange={(e) => setSalesTeamData(prev => ({
                ...prev,
                reportingTo: e.target.value as string
              }))}
            >
              {managers.map(manager => (
                <MenuItem key={manager.id} value={manager.id}>
                  {manager.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderRadius: 2,
          '& .MuiDialogTitle-root': {
            bgcolor: 'background.paper',
            py: 2
          }
        }
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <Typography variant="h6" component="div">
            {user ? 'Edit User' : 'Create New User'}
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 2, 
            mt: 2,
            '& .MuiTextField-root': {
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused fieldset': {
                  borderColor: 'primary.main'
                }
              }
            }
          }}>
            {error && (
              <Alert 
                severity="error"
                sx={{ 
                  borderRadius: 1,
                  '& .MuiAlert-icon': {
                    color: 'error.main'
                  }
                }}
              >
                {error}
              </Alert>
            )}
            
            <TextField
              required
              label="First Name"
              value={formData.firstName}
              onChange={handleChange('firstName')}
              fullWidth
              autoComplete="given-name"
            />

            <TextField
              required
              label="Last Name"
              value={formData.lastName}
              onChange={handleChange('lastName')}
              fullWidth
              autoComplete="family-name"
            />

            <TextField
              required
              label="Phone Number"
              value={formData.phoneNumber}
              onChange={handleChange('phoneNumber')}
              fullWidth
              autoComplete="tel"
            />

            <TextField
              required
              label="Username"
              value={formData.username}
              onChange={handleChange('username')}
              fullWidth
              autoComplete="username"
              helperText="Username must be at least 3 characters long"
              error={formData.username.length > 0 && formData.username.length < 3}
            />

            <TextField
              required
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              fullWidth
              autoComplete="email"
            />

            <TextField
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleChange('password')}
              required={!user}
              fullWidth
              autoComplete={user ? "new-password" : "current-password"}
              helperText={user ? "Leave blank to keep current password" : "Required for new user"}
            />

            <FormControl fullWidth>
              <InputLabel id="role-label">Role</InputLabel>
              <Select
                labelId="role-label"
                value={formData.role}
                label="Role"
                onChange={handleChange('role') as any}
              >
                <MenuItem value="admin">{ROLE_LABELS.admin}</MenuItem>
                <MenuItem value="SALES_EXECUTIVE">{ROLE_LABELS.SALES_EXECUTIVE}</MenuItem>
                <MenuItem value="ZONAL_HEAD">{ROLE_LABELS.ZONAL_HEAD}</MenuItem>
                <MenuItem value="COUNTRY_HEAD">{ROLE_LABELS.COUNTRY_HEAD}</MenuItem>
                <MenuItem value="user">{ROLE_LABELS.user}</MenuItem>
              </Select>
            </FormControl>

            {renderSalesTeamFields()}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: 'background.paper' }}>
          <Button 
            onClick={onClose} 
            disabled={loading}
            sx={{ 
              color: 'text.secondary',
              '&:hover': {
                bgcolor: 'action.hover'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading}
            sx={{
              bgcolor: 'primary.main',
              '&:hover': {
                bgcolor: 'primary.dark'
              }
            }}
          >
            {loading ? 'Saving...' : user ? 'Save Changes' : 'Create User'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default UserForm; 