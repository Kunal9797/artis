import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Alert,
  Chip,
  Box,
  Typography,
  IconButton,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { ROLE_LABELS, ROLE_COLORS } from '../../types/user';
import { useSnackbar } from 'notistack';

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

const ProfileDialog: React.FC<ProfileDialogProps> = ({ open, onClose }) => {
  const { user, login } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { enqueueSnackbar } = useSnackbar();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || ''
      });
    }
  }, [user]);

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: event.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.put('/api/auth/profile', formData);

      // Update user in AuthContext and localStorage
      const updatedUser = response.data.user;
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        login(currentToken, updatedUser);
      }

      enqueueSnackbar('Profile updated successfully', { variant: 'success' });
      onClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to update profile';
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
          Edit Profile
        </Typography>
        <IconButton onClick={onClose} size="small">
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
                label="Phone Number"
                value={formData.phoneNumber}
                onChange={handleChange('phoneNumber')}
                disabled={loading}
                placeholder="+91 XXXXXXXXXX"
              />
            </Grid>

            {/* Read-only fields */}
            <Grid item xs={12}>
              <Box sx={{
                p: 2,
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider'
              }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
                  Account Information (Read-only)
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 80 }}>
                      Username:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {user.username}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 80 }}>
                      Role:
                    </Typography>
                    <Chip
                      label={ROLE_LABELS[user.role]}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        bgcolor: ROLE_COLORS[user.role],
                        color: 'white'
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ProfileDialog;
