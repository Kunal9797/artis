import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Typography,
  Tooltip,
  Alert,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { authApi } from '../../services/api';
import { User, ROLE_LABELS, ROLE_COLORS } from '../../types/user';
import UserForm from './UserForm';
import ConfirmDialog from '../Common/ConfirmDialog';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { useAuth } from '../../context/AuthContext';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    try {
      const response = await authApi.getAllUsers();
      console.log('Fetched users:', response.data);
      setUsers(response.data);
      setError('');
    } catch (err: any) {
      setError('Failed to load users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setOpenForm(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setOpenConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    try {
      await authApi.deleteUser(selectedUser.id);
      await fetchUsers();
      setOpenConfirm(false);
      setSelectedUser(null);
    } catch (err: any) {
      setError('Failed to delete user');
      console.error('Error deleting user:', err);
    }
  };

  const handleUserOperation = async () => {
    await fetchUsers();
    setOpenForm(false);
    setSelectedUser(null);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SALES_EXECUTIVE':
        return 'primary';
      case 'ZONAL_HEAD':
        return 'success';
      case 'COUNTRY_HEAD':
        return 'warning';
      case 'admin':
        return 'error';
      case 'user':
        return 'default';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (role: string): string => {
    return ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role;
  };

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 2
      }}>
        <Typography variant="h4" sx={{ 
          fontWeight: 500,
          fontSize: isMobile ? '1.5rem' : '2rem'
        }}>
          {isMobile ? 'Users' : 'User Management'}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedUser(null);
            setOpenForm(true);
          }}
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            px: isMobile ? 2 : 3,
            fontSize: isMobile ? '0.875rem' : '1rem'
          }}
        >
          Add User
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {users.map((user) => (
            <Paper
              key={user.id}
              sx={{ 
                p: 2,
                borderRadius: 2,
                bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              {/* Left side: User info */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ 
                    fontWeight: 700,
                    mb: 0.5
                  }}>
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user.username}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.username}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.phoneNumber || ''}
                  </Typography>
                </Box>

                {/* Right side: Actions and role */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton 
                      onClick={() => handleEdit(user)} 
                      size="small"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    {user.id !== currentUser?.id && (
                      <IconButton 
                        onClick={() => handleDelete(user)} 
                        size="small"
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                  <Chip
                    label={getRoleLabel(user.role)}
                    size="small"
                    sx={{ 
                      fontWeight: 500,
                      bgcolor: ROLE_COLORS[user.role as keyof typeof ROLE_COLORS],
                      color: 'white',
                      height: 24
                    }}
                  />
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Username</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow 
                  key={user.id}
                  sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <TableCell>
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : '-'}
                  </TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phoneNumber || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={getRoleLabel(user.role)}
                      color={getRoleColor(user.role)}
                      size="small"
                      sx={{ 
                        fontWeight: 500,
                        minWidth: 100,
                        textAlign: 'center',
                        bgcolor: ROLE_COLORS[user.role as keyof typeof ROLE_COLORS],
                        color: 'white'
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton 
                        onClick={() => handleEdit(user)} 
                        size="small"
                        sx={{ mr: 1 }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {user.id !== currentUser?.id && (
                      <Tooltip title="Delete">
                        <IconButton 
                          onClick={() => handleDelete(user)} 
                          size="small"
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <UserForm
        open={openForm}
        onClose={() => {
          setOpenForm(false);
          setSelectedUser(null);
        }}
        onSubmit={handleUserOperation}
        user={selectedUser}
      />

      <ConfirmDialog
        open={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete User"
        content="Are you sure you want to delete this user? This action cannot be undone."
      />
    </Box>
  );
};

export default UserManagement; 