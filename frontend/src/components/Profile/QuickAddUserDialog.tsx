import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Alert,
  IconButton,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { authApi } from '../../services/api';
import { ROLE_LABELS } from '../../types/user';
import { useSnackbar } from 'notistack';

interface QuickAddUserDialogProps {
  open: boolean;
  onClose: () => void;
}

const QuickAddUserDialog: React.FC<QuickAddUserDialogProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { enqueueSnackbar } = useSnackbar();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    phoneNumber: '',
    role: 'user' as 'admin' | 'user'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      password: '',
      phoneNumber: '',
      role: 'user'
    });
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleChange = (field: string) => (event: any) => {
    setFormData({ ...formData, [field]: event.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authApi.register(formData);

      enqueueSnackbar(`User ${formData.firstName} ${formData.lastName} created successfully!`, {
        variant: 'success'
      });
      handleClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create user';
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2
        }
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Quick Add User
        </Typography>
        <IconButton onClick={handleClose} size="small" disabled={loading}>
          <Close />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Alert severity="info" sx={{ mb: 2 }}>
            Creating a basic user account. Additional details can be added later in User Management.
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="First Name"
                value={formData.firstName}
                onChange={handleChange('firstName')}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Last Name"
                value={formData.lastName}
                onChange={handleChange('lastName')}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Username"
                value={formData.username}
                onChange={handleChange('username')}
                disabled={loading}
                helperText="Used for login"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                type="email"
                label="Email"
                value={formData.email}
                onChange={handleChange('email')}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone Number (Optional)"
                value={formData.phoneNumber}
                onChange={handleChange('phoneNumber')}
                disabled={loading}
                placeholder="+91 XXXXXXXXXX"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                type="password"
                label="Password"
                value={formData.password}
                onChange={handleChange('password')}
                disabled={loading}
                helperText="Minimum 8 characters"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Role</InputLabel>
                <Select
                  value={formData.role}
                  onChange={handleChange('role')}
                  label="Role"
                  disabled={loading}
                >
                  <MenuItem value="user">{ROLE_LABELS.user}</MenuItem>
                  <MenuItem value="admin">{ROLE_LABELS.admin}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create User'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default QuickAddUserDialog;
