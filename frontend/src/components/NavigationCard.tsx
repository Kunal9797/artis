import React from 'react';
import { Card, CardContent, Typography, Box, Paper, SxProps } from '@mui/material';
import { useTheme } from '../context/ThemeContext';

interface NavigationCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  sx?: SxProps;
}

const NavigationCard: React.FC<NavigationCardProps> = ({ 
  title, 
  description, 
  icon, 
  onClick,
  sx 
}) => {
  const { isDarkMode } = useTheme();
  
  return (
    <Paper
      elevation={2}
      onClick={onClick}
      sx={{
        borderRadius: 2,
        bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'background.paper',
        cursor: 'pointer',
        ...sx
      }}
    >
      {icon}
      <Typography
        variant="h6"
        sx={{
          fontSize: { xs: '1.25rem', md: '1.5rem' },
          fontWeight: 600,
          mb: { xs: 1, md: 2 },
          color: isDarkMode ? '#fff' : '#2C3E50'
        }}
      >
        {title}
      </Typography>
      <Typography
        variant="body1"
        sx={{
          color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
          fontSize: { xs: '0.9rem', md: '1rem' },
          lineHeight: 1.5
        }}
      >
        {description}
      </Typography>
    </Paper>
  );
};

export default NavigationCard; 