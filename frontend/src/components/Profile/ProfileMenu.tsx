import React, { useState } from 'react';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  Chip,
  useMediaQuery,
  useTheme,
  Drawer,
  ListItemButton
} from '@mui/material';
import {
  Lock,
  PersonAdd,
  Logout,
  Edit
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import ProfileDialog from './ProfileDialog';
import ChangePasswordDialog from './ChangePasswordDialog';
import QuickAddUserDialog from './QuickAddUserDialog';
import { ROLE_LABELS, ROLE_COLORS } from '../../types/user';

interface ProfileMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({ anchorEl, open, onClose }) => {
  const { user, logout, isAdmin } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);

  const handleEditProfile = () => {
    onClose();
    setProfileDialogOpen(true);
  };

  const handleChangePassword = () => {
    onClose();
    setPasswordDialogOpen(true);
  };

  const handleAddUser = () => {
    onClose();
    setAddUserDialogOpen(true);
  };

  const handleLogout = () => {
    onClose();
    logout();
  };

  if (!user) return null;

  const isDark = theme.palette.mode === 'dark';

  // MOBILE: Bottom Sheet Drawer
  if (isMobile) {
    return (
      <>
        <Drawer
          anchor="bottom"
          open={open}
          onClose={onClose}
          PaperProps={{
            sx: {
              borderRadius: '16px 16px 0 0',
              maxHeight: '65vh',
              bgcolor: isDark ? '#1e1e1e' : 'background.paper'
            }
          }}
        >
          {/* Drag Handle */}
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.5, pb: 1 }}>
            <Box sx={{ width: 40, height: 4, bgcolor: isDark ? 'rgba(255,255,255,0.3)' : 'divider', borderRadius: 2 }} />
          </Box>

          {/* User Info Header */}
          <Box sx={{ px: 3, py: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.35rem', lineHeight: 1.1, color: isDark ? 'white' : 'text.primary' }}>
                {user.firstName} {user.lastName}
              </Typography>
              <Chip
                label={ROLE_LABELS[user.role]}
                size="small"
                sx={{
                  height: 24,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  bgcolor: ROLE_COLORS[user.role],
                  color: 'white'
                }}
              />
            </Box>
            <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'text.secondary', fontSize: '0.9rem', mt: 0.5 }}>
              {user.email}
            </Typography>
          </Box>

          {/* Menu Items - Card Button Style */}
          <Box sx={{ px: 3, pt: 1, pb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box
              onClick={handleEditProfile}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                py: 2,
                px: 2.5,
                borderRadius: 2.5,
                border: '2px solid',
                borderColor: isDark ? 'rgba(25, 118, 210, 0.5)' : 'divider',
                bgcolor: isDark ? 'rgba(25, 118, 210, 0.15)' : 'background.paper',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: isDark ? '0 2px 12px rgba(25, 118, 210, 0.25)' : '0 2px 4px rgba(0,0,0,0.05)',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'primary.main',
                  boxShadow: '0 4px 16px rgba(25, 118, 210, 0.5)',
                  '& .MuiSvgIcon-root': { color: 'white' },
                  '& .MuiTypography-root': { color: 'white' }
                }
              }}
            >
              <Edit sx={{ fontSize: 24, color: isDark ? 'primary.light' : 'primary.main', transition: 'color 0.2s' }} />
              <Typography sx={{ fontSize: '1.05rem', fontWeight: 600, color: isDark ? 'white' : 'text.primary', transition: 'color 0.2s' }}>
                Edit Profile
              </Typography>
            </Box>

            <Box
              onClick={handleChangePassword}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                py: 2,
                px: 2.5,
                borderRadius: 2.5,
                border: '2px solid',
                borderColor: isDark ? 'rgba(237, 108, 2, 0.5)' : 'divider',
                bgcolor: isDark ? 'rgba(237, 108, 2, 0.15)' : 'background.paper',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: isDark ? '0 2px 12px rgba(237, 108, 2, 0.25)' : '0 2px 4px rgba(0,0,0,0.05)',
                '&:hover': {
                  borderColor: 'warning.main',
                  bgcolor: 'warning.main',
                  boxShadow: '0 4px 16px rgba(237, 108, 2, 0.5)',
                  '& .MuiSvgIcon-root': { color: 'white' },
                  '& .MuiTypography-root': { color: 'white' }
                }
              }}
            >
              <Lock sx={{ fontSize: 24, color: isDark ? 'warning.light' : 'warning.main', transition: 'color 0.2s' }} />
              <Typography sx={{ fontSize: '1.05rem', fontWeight: 600, color: isDark ? 'white' : 'text.primary', transition: 'color 0.2s' }}>
                Change Password
              </Typography>
            </Box>

            {isAdmin() && (
              <Box
                onClick={handleAddUser}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  py: 2,
                  px: 2.5,
                  borderRadius: 2.5,
                  border: '2px solid',
                  borderColor: isDark ? 'rgba(46, 125, 50, 0.5)' : 'divider',
                  bgcolor: isDark ? 'rgba(46, 125, 50, 0.15)' : 'background.paper',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isDark ? '0 2px 12px rgba(46, 125, 50, 0.25)' : '0 2px 4px rgba(0,0,0,0.05)',
                  '&:hover': {
                    borderColor: 'success.main',
                    bgcolor: 'success.main',
                    boxShadow: '0 4px 16px rgba(46, 125, 50, 0.5)',
                    '& .MuiSvgIcon-root': { color: 'white' },
                    '& .MuiTypography-root': { color: 'white' }
                  }
                }}
              >
                <PersonAdd sx={{ fontSize: 24, color: isDark ? 'success.light' : 'success.main', transition: 'color 0.2s' }} />
                <Typography sx={{ fontSize: '1.05rem', fontWeight: 600, color: isDark ? 'white' : 'text.primary', transition: 'color 0.2s' }}>
                  Add New User
                </Typography>
              </Box>
            )}

            <Box
              onClick={handleLogout}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                py: 2,
                px: 2.5,
                borderRadius: 2.5,
                bgcolor: 'error.main',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: isDark ? '0 2px 12px rgba(211, 47, 47, 0.5)' : '0 2px 8px rgba(211, 47, 47, 0.3)',
                '&:hover': {
                  bgcolor: 'error.dark',
                  boxShadow: '0 4px 16px rgba(211, 47, 47, 0.6)',
                  transform: 'scale(1.02)'
                }
              }}
            >
              <Logout sx={{ fontSize: 24, color: 'white' }} />
              <Typography sx={{ fontSize: '1.05rem', fontWeight: 600, color: 'white' }}>
                Logout
              </Typography>
            </Box>
          </Box>

          {/* Safe Area Padding */}
          <Box sx={{ pb: 'env(safe-area-inset-bottom, 16px)' }} />
        </Drawer>

        {/* Dialogs */}
        <ProfileDialog
          open={profileDialogOpen}
          onClose={() => setProfileDialogOpen(false)}
        />

        <ChangePasswordDialog
          open={passwordDialogOpen}
          onClose={() => setPasswordDialogOpen(false)}
        />

        {isAdmin() && (
          <QuickAddUserDialog
            open={addUserDialogOpen}
            onClose={() => setAddUserDialogOpen(false)}
          />
        )}
      </>
    );
  }

  // DESKTOP: Regular Dropdown Menu
  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            mt: 1.5,
            minWidth: 260,
            maxWidth: 300,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            borderRadius: 2,
            overflow: 'visible',
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* User Info Header */}
        <Box sx={{ px: 2.5, py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.1 }}>
              {user.firstName} {user.lastName}
            </Typography>
            <Chip
              label={ROLE_LABELS[user.role]}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.7rem',
                fontWeight: 700,
                bgcolor: ROLE_COLORS[user.role],
                color: 'white'
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem', mt: 0.5 }}>
            {user.email}
          </Typography>
        </Box>

        {/* Profile Actions */}
        <Box sx={{ px: 2, pb: 1.5 }}>
          <MenuItem
            onClick={handleEditProfile}
            sx={{
              py: 1.25,
              px: 2,
              borderRadius: 1.5,
              mb: 0.5,
              '&:hover': {
                bgcolor: 'primary.main',
                color: 'white',
                '& .MuiListItemIcon-root': { color: 'white' }
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Edit fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Edit Profile"
              primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: 500 }}
            />
          </MenuItem>

          <MenuItem
            onClick={handleChangePassword}
            sx={{
              py: 1.25,
              px: 2,
              borderRadius: 1.5,
              mb: 0.5,
              '&:hover': {
                bgcolor: 'warning.main',
                color: 'white',
                '& .MuiListItemIcon-root': { color: 'white' }
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Lock fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Change Password"
              primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: 500 }}
            />
          </MenuItem>

          {/* Admin Section */}
          {isAdmin() && (
            <MenuItem
              onClick={handleAddUser}
              sx={{
                py: 1.25,
                px: 2,
                borderRadius: 1.5,
                mb: 0.5,
                '&:hover': {
                  bgcolor: 'success.main',
                  color: 'white',
                  '& .MuiListItemIcon-root': { color: 'white' }
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <PersonAdd fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Add New User"
                primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: 500 }}
              />
            </MenuItem>
          )}

          {/* Logout */}
          <Divider sx={{ my: 1 }} />
          <MenuItem
            onClick={handleLogout}
            sx={{
              py: 1.25,
              px: 2,
              borderRadius: 1.5,
              bgcolor: 'error.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'error.dark',
                '& .MuiListItemIcon-root': { color: 'white' }
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Logout fontSize="small" sx={{ color: 'white' }} />
            </ListItemIcon>
            <ListItemText
              primary="Logout"
              primaryTypographyProps={{ fontSize: '0.95rem', fontWeight: 600 }}
            />
          </MenuItem>
        </Box>
      </Menu>

      {/* Dialogs */}
      <ProfileDialog
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
      />

      <ChangePasswordDialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
      />

      {isAdmin() && (
        <QuickAddUserDialog
          open={addUserDialogOpen}
          onClose={() => setAddUserDialogOpen(false)}
        />
      )}
    </>
  );
};

export default ProfileMenu;
