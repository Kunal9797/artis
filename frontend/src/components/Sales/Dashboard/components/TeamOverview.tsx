import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  Message as MessageIcon,
  Phone as PhoneIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from '@mui/icons-material';

interface TeamOverviewProps {
  zoneView?: boolean;
}

const TeamOverview: React.FC<TeamOverviewProps> = ({ zoneView = false }) => {
  const theme = useTheme();

  // Mock data - replace with API calls
  const teamMembers = [
    {
      id: 1,
      name: 'Rahul Kumar',
      role: zoneView ? 'Sales Executive' : 'Zonal Head',
      area: zoneView ? 'North Delhi' : 'North Zone',
      performance: 115,
      status: 'online',
      avatar: 'RK'
    },
    {
      id: 2,
      name: 'Priya Singh',
      role: zoneView ? 'Sales Executive' : 'Zonal Head',
      area: zoneView ? 'South Delhi' : 'South Zone',
      performance: 98,
      status: 'offline',
      avatar: 'PS'
    },
    {
      id: 3,
      name: 'Amit Patel',
      role: zoneView ? 'Sales Executive' : 'Zonal Head',
      area: zoneView ? 'Gurgaon' : 'East Zone',
      performance: 105,
      status: 'online',
      avatar: 'AP'
    }
  ];

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>
        {zoneView ? 'Sales Team' : 'Zonal Heads'}
      </Typography>

      <List sx={{ width: '100%' }}>
        {teamMembers.map((member) => (
          <ListItem
            key={member.id}
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
              <Avatar
                sx={{
                  bgcolor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText
                }}
              >
                {member.avatar}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {member.name}
                  <Chip
                    size="small"
                    label={member.status}
                    sx={{
                      bgcolor: member.status === 'online' 
                        ? 'success.main' 
                        : 'grey.500',
                      color: 'white',
                      height: 20,
                      fontSize: '0.75rem'
                    }}
                  />
                </Box>
              }
              secondary={
                <Box sx={{ mt: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {member.role} • {member.area}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    {member.performance > 100 ? (
                      <TrendingUpIcon sx={{ color: 'success.main', fontSize: 16 }} />
                    ) : (
                      <TrendingDownIcon sx={{ color: 'error.main', fontSize: 16 }} />
                    )}
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        ml: 0.5,
                        color: member.performance > 100 ? 'success.main' : 'error.main'
                      }}
                    >
                      {member.performance}% of target
                    </Typography>
                  </Box>
                </Box>
              }
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Message">
                <IconButton size="small">
                  <MessageIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Call">
                <IconButton size="small">
                  <PhoneIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default TeamOverview; 