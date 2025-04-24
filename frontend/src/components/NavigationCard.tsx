import React from 'react';
import { Box, Paper, Typography, useTheme as useMuiTheme } from '@mui/material';
import { useTheme } from '../context/ThemeContext';

interface NavigationCardProps {
  title: string;
  description?: string;
  icon: React.ReactNode;
  onClick: () => void;
  iconSx?: React.CSSProperties;
  decorativeElement?: boolean;
  hoverEffect?: boolean;
  sx?: any;
}

const NavigationCard: React.FC<NavigationCardProps> = ({
  title,
  description,
  icon,
  onClick,
  iconSx = {},
  decorativeElement = true,
  hoverEffect = false,
  sx = {}
}) => {
  const { isDarkMode } = useTheme();
  const muiTheme = useMuiTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'relative',
        py: { xs: 2, md: 2.5 },
        px: { xs: 3, md: 4 },
        height: '100%',
        borderRadius: 8,
        cursor: 'pointer',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        transition: 'all 0.3s ease-in-out',
        background: isDarkMode 
          ? 'rgba(59,126,161,0.08)' 
          : 'rgba(245,250,255,0.9)',
        border: `1px solid ${isDarkMode ? 'rgba(59,126,161,0.2)' : 'rgba(74,140,175,0.15)'}`,
        boxShadow: 'none',
        ...(hoverEffect && {
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: isDarkMode 
              ? '0 6px 15px rgba(0,0,0,0.1), 0 0 10px rgba(59,126,161,0.1)' 
              : '0 6px 15px rgba(0,0,0,0.04), 0 0 10px rgba(74,140,175,0.1)',
            borderColor: isDarkMode 
              ? 'rgba(59,126,161,0.4)' 
              : 'rgba(74,140,175,0.4)',
            background: isDarkMode 
              ? 'rgba(59,126,161,0.15)' 
              : 'rgba(245,250,255,1)',
            '& .card-icon': {
              transform: 'scale(1.05)',
              color: isDarkMode ? '#78A7BF' : '#4A8CAF !important',
            },
            '& .card-title': {
              color: isDarkMode ? '#78A7BF' : '#4A8CAF',
            }
          }
        }),
        ...sx
      }}
      onClick={onClick}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        position: 'relative', 
        zIndex: 1,
        width: '100%',
      }}>
        <Box
          className="card-icon"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            fontSize: { xs: 32, md: 36 },
            mr: 2.5,
            color: isDarkMode ? '#5D8CA1' : '#4A8CAF',
            opacity: 0.9,
            ...iconSx
          }}
        >
          {icon}
        </Box>
        <Typography
          className="card-title"
          variant="h6"
          sx={{
            fontWeight: 500,
            fontSize: { xs: '1.05rem', md: '1.2rem' },
            color: isDarkMode ? '#FFFFFF' : '#333333',
            transition: 'color 0.3s ease',
            letterSpacing: '0.01em',
          }}
        >
          {title}
        </Typography>
      </Box>

      {description && (
        <Typography
          variant="body2"
          sx={{
            color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
            position: 'relative',
            zIndex: 1,
            fontSize: { xs: '0.8rem', md: '0.85rem' },
            lineHeight: 1.4,
          }}
        >
          {description}
        </Typography>
      )}
    </Paper>
  );
};

export default NavigationCard; 