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

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  user: User | null;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (user) {
        const updateData = {
          ...formData,
          ...(formData.password ? { password: formData.password } : {})
        };
        await authApi.updateUser(user.id, updateData);
      } else {
        await authApi.register(formData);
      }
      onSubmit();
      onClose();
    } catch (err: any) {
      console.error('Form submission error:', err);
      setError(err.response?.data?.error || 'Failed to save user');
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
              autoFocus
            />

            <TextField
              required
              label="Last Name"
              value={formData.lastName}
              onChange={handleChange('lastName')}
              fullWidth
            />

            <TextField
              required
              label="Phone Number"
              value={formData.phoneNumber}
              onChange={handleChange('phoneNumber')}
              fullWidth
            />

            <TextField
              required
              label="Username"
              value={formData.username}
              onChange={handleChange('username')}
              fullWidth
            />

            <TextField
              required
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              fullWidth
            />

            <TextField
              label="Password"
              type="password"
              value={formData.password}
              onChange={handleChange('password')}
              required={!user}
              fullWidth
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