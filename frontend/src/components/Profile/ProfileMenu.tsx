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
  useTheme
} from '@mui/material';
import {
  Person,
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

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: isMobile ? {
            // Mobile: Full-width bottom sheet
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            top: 'auto',
            m: 0,
            maxWidth: '100%',
            width: '100%',
            borderRadius: '16px 16px 0 0',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.2)',
            maxHeight: '70vh'
          } : {
            // Desktop: Regular dropdown
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
        transformOrigin={isMobile ? { horizontal: 'center', vertical: 'bottom' } : { horizontal: 'right', vertical: 'top' }}
        anchorOrigin={isMobile ? { horizontal: 'center', vertical: 'bottom' } : { horizontal: 'right', vertical: 'bottom' }}
        BackdropProps={isMobile ? {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }
        } : undefined}
      >
        {/* Mobile: Drag Handle */}
        {isMobile && (
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            pt: 1,
            pb: 0.5
          }}>
            <Box sx={{
              width: 40,
              height: 4,
              bgcolor: 'divider',
              borderRadius: 2
            }} />
          </Box>
        )}

        {/* User Info Header */}
        <Box sx={{
          px: isMobile ? 3 : 2,
          py: isMobile ? 2.5 : 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          <Typography
            variant={isMobile ? "h6" : "subtitle1"}
            sx={{
              fontWeight: 600,
              lineHeight: 1.2,
              fontSize: isMobile ? '1.1rem' : '1rem'
            }}
          >
            {user.firstName} {user.lastName}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Chip
              label={ROLE_LABELS[user.role]}
              size="small"
              sx={{
                height: isMobile ? 24 : 20,
                fontSize: isMobile ? '0.8rem' : '0.7rem',
                fontWeight: 600,
                bgcolor: ROLE_COLORS[user.role],
                color: 'white'
              }}
            />
          </Box>
        </Box>

        {/* Profile Actions */}
        <MenuItem
          onClick={handleEditProfile}
          sx={{
            py: isMobile ? 2 : 1.5,
            px: isMobile ? 3 : 2,
            minHeight: isMobile ? 56 : 'auto'
          }}
        >
          <ListItemIcon>
            <Edit fontSize={isMobile ? "medium" : "small"} />
          </ListItemIcon>
          <ListItemText
            primary="Edit Profile"
            primaryTypographyProps={{
              fontSize: isMobile ? '1rem' : '0.9rem'
            }}
          />
        </MenuItem>

        <MenuItem
          onClick={handleChangePassword}
          sx={{
            py: isMobile ? 2 : 1.5,
            px: isMobile ? 3 : 2,
            minHeight: isMobile ? 56 : 'auto'
          }}
        >
          <ListItemIcon>
            <Lock fontSize={isMobile ? "medium" : "small"} />
          </ListItemIcon>
          <ListItemText
            primary="Change Password"
            primaryTypographyProps={{
              fontSize: isMobile ? '1rem' : '0.9rem'
            }}
          />
        </MenuItem>

        {/* Admin Section */}
        {isAdmin() && (
          <>
            <Divider sx={{ my: isMobile ? 1.5 : 1 }} />
            <MenuItem
              onClick={handleAddUser}
              sx={{
                py: isMobile ? 2 : 1.5,
                px: isMobile ? 3 : 2,
                minHeight: isMobile ? 56 : 'auto'
              }}
            >
              <ListItemIcon>
                <PersonAdd fontSize={isMobile ? "medium" : "small"} />
              </ListItemIcon>
              <ListItemText
                primary="Add New User"
                primaryTypographyProps={{
                  fontSize: isMobile ? '1rem' : '0.9rem'
                }}
              />
            </MenuItem>
          </>
        )}

        {/* Logout */}
        <Divider sx={{ my: isMobile ? 1.5 : 1 }} />
        <MenuItem
          onClick={handleLogout}
          sx={{
            py: isMobile ? 2 : 1.5,
            px: isMobile ? 3 : 2,
            minHeight: isMobile ? 56 : 'auto',
            color: 'error.main',
            '&:hover': {
              backgroundColor: 'error.lighter',
            }
          }}
        >
          <ListItemIcon>
            <Logout fontSize={isMobile ? "medium" : "small"} sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText
            primary="Logout"
            primaryTypographyProps={{
              fontSize: isMobile ? '1rem' : '0.9rem',
              fontWeight: 500
            }}
          />
        </MenuItem>

        {/* Mobile: Safe area padding */}
        {isMobile && (
          <Box sx={{ height: 'env(safe-area-inset-bottom, 16px)' }} />
        )}
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
