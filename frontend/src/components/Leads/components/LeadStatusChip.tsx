import React from 'react';
import { Chip, useTheme } from '@mui/material';

interface LeadStatusChipProps {
  status: 'NEW' | 'FOLLOWUP' | 'NEGOTIATION' | 'CLOSED';
  size?: 'small' | 'medium';
}

const LeadStatusChip: React.FC<LeadStatusChipProps> = ({ status, size = 'small' }) => {
  const theme = useTheme();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW':
        return theme.palette.info.main;
      case 'FOLLOWUP':
        return theme.palette.warning.main;
      case 'NEGOTIATION':
        return theme.palette.primary.main;
      case 'CLOSED':
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const colors = getStatusColor(status);

  return (
    <Chip
      label={getStatusLabel(status)}
      size={size}
      sx={{
        bgcolor: `${colors}15`,
        color: colors,
        '&:hover': {
          bgcolor: `${colors}25`,
        },
      }}
    />
  );
};

export default LeadStatusChip; 