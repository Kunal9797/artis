import React, { useState } from 'react';
import {
  IconButton,
  Avatar,
  Box,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import ProfileMenu from './ProfileMenu';

const ProfileButton: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const getInitials = () => {
    if (!user) return '?';
    const first = user.firstName?.charAt(0) || '';
    const last = user.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || user.username?.charAt(0).toUpperCase() || '?';
  };

  const getAvatarColor = () => {
    if (user?.role === 'admin') {
      return 'linear-gradient(135deg, #d32f2f 0%, #f44336 100%)';
    }
    return 'linear-gradient(135deg, #1976d2 0%, #2196f3 100%)';
  };

  if (!user) return null;

  return (
    <>
      <Box
        onClick={handleClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: 2,
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.1)',
            transform: 'scale(1.02)'
          }
        }}
      >
        <Avatar
          sx={{
            width: 36,
            height: 36,
            background: getAvatarColor(),
            fontSize: '0.9rem',
            fontWeight: 600,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          {getInitials()}
        </Avatar>

        {!isMobile && (
          <Typography
            sx={{
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: 500
            }}
          >
            {user.firstName || user.username}
          </Typography>
        )}
      </Box>

      <ProfileMenu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      />
    </>
  );
};

export default ProfileButton;
