import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
  PaletteColor
} from '@mui/material';
import {
  Store as StoreIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  DirectionsCar as CarIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';

const DealerVisits: React.FC = () => {
  const theme = useTheme();

  // Mock data - replace with API calls
  const visits = [
    {
      id: 1,
      dealer: 'ABC Paper Mart',
      time: '10:00 AM',
      status: 'completed',
      location: 'Karol Bagh, Delhi',
      notes: 'Monthly review meeting'
    },
    {
      id: 2,
      dealer: 'XYZ Enterprises',
      time: '2:00 PM',
      status: 'upcoming',
      location: 'Lajpat Nagar, Delhi',
      notes: 'New product presentation'
    },
    {
      id: 3,
      dealer: 'PQR Distributors',
      time: '4:30 PM',
      status: 'pending',
      location: 'Rohini, Delhi',
      notes: 'Payment collection'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          main: theme.palette.success.main,
          light: theme.palette.success.light
        };
      case 'upcoming':
        return {
          main: theme.palette.info.main,
          light: theme.palette.info.light
        };
      case 'pending':
        return {
          main: theme.palette.warning.main,
          light: theme.palette.warning.light
        };
      default:
        return {
          main: theme.palette.grey[500],
          light: theme.palette.grey[200]
        };
    }
  };

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3 
      }}>
        <Typography variant="h6">Today's Visits</Typography>
        <Button
          startIcon={<ScheduleIcon />}
          size="small"
          variant="outlined"
        >
          Schedule Visit
        </Button>
      </Box>

      <List sx={{ width: '100%' }}>
        {visits.map((visit) => (
          <ListItem
            key={visit.id}
            sx={{
              mb: 2,
              bgcolor: 'background.paper',
              borderRadius: 1,
              boxShadow: 1,
              '&:hover': {
                bgcolor: 'action.hover'
              }
            }}
          >
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: getStatusColor(visit.status).light }}>
                <StoreIcon sx={{ color: getStatusColor(visit.status).main }} />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2">
                    {visit.dealer}
                  </Typography>
                  <Chip
                    size="small"
                    label={visit.status}
                    sx={{
                      bgcolor: `${getStatusColor(visit.status).main}15`,
                      color: getStatusColor(visit.status).main,
                      fontWeight: 500
                    }}
                  />
                </Box>
              }
              secondary={
                <Box sx={{ mt: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ScheduleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {visit.time}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <LocationIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {visit.location}
                    </Typography>
                  </Box>
                </Box>
              }
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              {visit.status === 'upcoming' && (
                <>
                  <Tooltip title="Start Visit">
                    <IconButton size="small" color="primary">
                      <CarIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Call Dealer">
                    <IconButton size="small">
                      <PhoneIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              {visit.status === 'pending' && (
                <Tooltip title="Mark Complete">
                  <IconButton size="small" color="success">
                    <CheckCircleIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default DealerVisits; 