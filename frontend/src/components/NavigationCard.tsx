import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface NavigationCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

const NavigationCard: React.FC<NavigationCardProps> = ({ 
  title, 
  description, 
  icon, 
  onClick 
}) => {
  return (
    <Card 
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        height: '100%',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6
        }
      }}
    >
      <CardContent sx={{ height: '100%', p: 3 }}>
        <Box sx={{ mb: 2 }}>
          {icon}
        </Box>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default NavigationCard; 