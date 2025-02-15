import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  IconButton,
  useTheme
} from '@mui/material';
import {
  Store as StoreIcon,
  Assignment as LeadIcon,
  AttachMoney as SaleIcon,
  Schedule as ScheduleIcon,
  OpenInNew as ViewIcon
} from '@mui/icons-material';

interface ActivitySummaryProps {
  zoneView?: boolean;
  personalView?: boolean;
}

const ActivitySummary: React.FC<ActivitySummaryProps> = ({ 
  zoneView = false,
  personalView = false 
}) => {
  const theme = useTheme();

  // Mock data - replace with API calls
  const activities = [
    {
      id: 1,
      type: 'visit',
      title: 'Dealer Visit Completed',
      description: 'ABC Paper Mart, Delhi',
      time: '2 hours ago',
      user: 'Rahul Kumar',
      status: 'completed'
    },
    {
      id: 2,
      type: 'lead',
      title: 'New Lead Created',
      description: 'XYZ Enterprises interested in bulk order',
      time: '4 hours ago',
      user: 'Priya Singh',
      status: 'pending'
    },
    {
      id: 3,
      type: 'sale',
      title: 'Sale Confirmed',
      description: '₹85,000 order from PQR Distributors',
      time: '6 hours ago',
      user: 'Amit Patel',
      status: 'completed'
    },
    {
      id: 4,
      type: 'schedule',
      title: 'Meeting Scheduled',
      description: 'Follow-up with LMN Trading',
      time: 'Tomorrow, 11:00 AM',
      user: 'Rahul Kumar',
      status: 'upcoming'
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'visit':
        return <StoreIcon color="primary" />;
      case 'lead':
        return <LeadIcon color="warning" />;
      case 'sale':
        return <SaleIcon color="success" />;
      case 'schedule':
        return <ScheduleIcon color="info" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.palette.success.main;
      case 'pending':
        return theme.palette.warning.main;
      case 'upcoming':
        return theme.palette.info.main;
      default:
        return theme.palette.grey[500];
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
        <Typography variant="h6">
          {personalView 
            ? 'My Activity' 
            : zoneView 
              ? 'Zone Activity' 
              : 'Team Activity'}
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ cursor: 'pointer' }}
        >
          View All
        </Typography>
      </Box>

      <List>
        {activities.map((activity, index) => (
          <React.Fragment key={activity.id}>
            <ListItem
              sx={{
                py: 2,
                px: 0,
                '&:hover': {
                  bgcolor: 'action.hover',
                  borderRadius: 1
                }
              }}
            >
              <ListItemIcon>
                {getActivityIcon(activity.type)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2">
                      {activity.title}
                    </Typography>
                    <Chip
                      label={activity.status}
                      size="small"
                      sx={{
                        bgcolor: `${getStatusColor(activity.status)}15`,
                        color: getStatusColor(activity.status),
                        fontWeight: 500
                      }}
                    />
                  </Box>
                }
                secondary={
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {activity.description}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ display: 'block', mt: 0.5 }}
                    >
                      {!personalView && `${activity.user} • `}{activity.time}
                    </Typography>
                  </Box>
                }
              />
              <IconButton size="small">
                <ViewIcon fontSize="small" />
              </IconButton>
            </ListItem>
            {index < activities.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default ActivitySummary; 