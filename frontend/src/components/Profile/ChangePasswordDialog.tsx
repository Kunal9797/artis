import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  IconButton,
  Typography,
  Box,
  LinearProgress,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { Close, CheckCircle, Cancel } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { useSnackbar } from 'notistack';

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({ open, onClose }) => {
  const { logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { enqueueSnackbar } = useSnackbar();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!newPassword) return 0;

    let strength = 0;
    if (newPassword.length >= 8) strength += 25;
    if (newPassword.length >= 12) strength += 25;
    if (/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword)) strength += 25;
    if (/\d/.test(newPassword)) strength += 15;
    if (/[^A-Za-z0-9]/.test(newPassword)) strength += 10;

    return Math.min(strength, 100);
  };

  const getStrengthLabel = () => {
    const strength = getPasswordStrength();
    if (strength < 40) return { label: 'Weak', color: 'error' };
    if (strength < 70) return { label: 'Medium', color: 'warning' };
    return { label: 'Strong', color: 'success' };
  };

  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const passwordsDontMatch = confirmPassword && newPassword !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!currentPassword) {
      setError('Current password is required');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await api.put('/api/auth/change-password', {
        currentPassword,
        newPassword
      });

      enqueueSnackbar('Password changed successfully! Logging out...', { variant: 'success' });

      // Wait 2 seconds then logout
      setTimeout(() => {
        logout();
      }, 2000);

      handleClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to change password';
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
      setLoading(false);
    }
  };

  const strength = getStrengthLabel();

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
          Change Password
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

          <Alert severity="warning" sx={{ mb: 3 }}>
            You'll be logged out after changing your password. Please login again with your new password.
          </Alert>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              required
              fullWidth
              type="password"
              label="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />

            <Box>
              <TextField
                required
                fullWidth
                type="password"
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                helperText="Minimum 8 characters"
              />
              {newPassword && (
                <Box sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Strength:
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        color: `${strength.color}.main`
                      }}
                    >
                      {strength.label}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getPasswordStrength()}
                    sx={{
                      height: 6,
                      borderRadius: 1,
                      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 1,
                        backgroundColor: `${strength.color}.main`
                      }
                    }}
                  />
                </Box>
              )}
            </Box>

            <Box>
              <TextField
                required
                fullWidth
                type="password"
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
              />
              {passwordsMatch && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                  <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                  <Typography variant="caption" sx={{ color: 'success.main' }}>
                    Passwords match
                  </Typography>
                </Box>
              )}
              {passwordsDontMatch && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                  <Cancel sx={{ fontSize: 16, color: 'error.main' }} />
                  <Typography variant="caption" sx={{ color: 'error.main' }}>
                    Passwords do not match
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading || !passwordsMatch || getPasswordStrength() < 40}
          >
            {loading ? 'Changing...' : 'Change Password'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ChangePasswordDialog;
