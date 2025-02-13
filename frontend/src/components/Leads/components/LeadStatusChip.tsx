import React from 'react';
import { Chip, useTheme } from '@mui/material';

interface LeadStatusChipProps {
  status: 'new' | 'followup' | 'negotiation' | 'closed';
  size?: 'small' | 'medium';
}

const LeadStatusChip: React.FC<LeadStatusChipProps> = ({ status, size = 'small' }) => {
  const theme = useTheme();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return {
          main: theme.palette.info.main,
          light: theme.palette.info.light
        };
      case 'followup':
        return {
          main: theme.palette.warning.main,
          light: theme.palette.warning.light
        };
      case 'negotiation':
        return {
          main: theme.palette.success.main,
          light: theme.palette.success.light
        };
      case 'closed':
        return {
          main: theme.palette.grey[500],
          light: theme.palette.grey[200]
        };
      default:
        return {
          main: theme.palette.grey[500],
          light: theme.palette.grey[200]
        };
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
        bgcolor: `${colors.main}15`,
        color: colors.main,
        '&:hover': {
          bgcolor: `${colors.main}25`,
        },
      }}
    />
  );
};

export default LeadStatusChip; 