import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  IconButton,
  Button,
  useTheme
} from '@mui/material';
import {
  Assignment as LeadIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  Timeline as TimelineIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';

const LeadManagement: React.FC = () => {
  const theme = useTheme();

  // Mock data - replace with API calls
  const leadStats = [
    {
      title: 'Total Leads',
      value: '24',
      change: '+3',
      icon: <LeadIcon />,
      color: theme.palette.primary.main
    },
    {
      title: 'Conversion Rate',
      value: '32%',
      change: '+5%',
      icon: <TimelineIcon />,
      color: theme.palette.success.main
    },
    {
      title: 'Potential Value',
      value: '₹2.4M',
      change: '+₹200K',
      icon: <MoneyIcon />,
      color: theme.palette.warning.main
    }
  ];

  const recentLeads = [
    {
      id: 1,
      name: 'Modern Enterprises',
      contact: 'Rajesh Kumar',
      value: '₹85,000',
      status: 'new',
      probability: 75
    },
    {
      id: 2,
      name: 'City Distributors',
      contact: 'Amit Shah',
      value: '₹120,000',
      status: 'followup',
      probability: 60
    },
    {
      id: 3,
      name: 'Metro Traders',
      contact: 'Priya Verma',
      value: '₹250,000',
      status: 'negotiation',
      probability: 85
    }
  ];

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
      default:
        return {
          main: theme.palette.grey[500],
          light: theme.palette.grey[200]
        };
    }
  };

  // Update the Chip styling to use the new color structure
  const getChipStyling = (status: string) => ({
    bgcolor: `${getStatusColor(status).main}15`,
    color: getStatusColor(status).main
  });

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3 
      }}>
        <Typography variant="h6">Lead Management</Typography>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          size="small"
        >
          Add Lead
        </Button>
      </Box>

      {/* Lead Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {leadStats.map((stat) => (
          <Grid item xs={12} md={4} key={stat.title}>
            <Card>
              <CardContent sx={{ 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Box>
                  <Typography color="textSecondary" variant="subtitle2">
                    {stat.title}
                  </Typography>
                  <Typography variant="h4" sx={{ my: 1 }}>
                    {stat.value}
                  </Typography>
                  <Typography 
                    variant="body2"
                    color="success.main"
                  >
                    {stat.change} this month
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: `${stat.color}15`, color: stat.color }}>
                  {stat.icon}
                </Avatar>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Leads */}
      <Typography variant="subtitle1" sx={{ mb: 2 }}>
        Recent Leads
      </Typography>
      <List>
        {recentLeads.map((lead) => (
          <ListItem
            key={lead.id}
            sx={{
              mb: 2,
              bgcolor: 'background.paper',
              borderRadius: 1,
              boxShadow: 1
            }}
          >
            <ListItemAvatar>
              <Avatar>
                <PersonIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2">
                    {lead.name}
                  </Typography>
                  <Chip
                    size="small"
                    label={lead.status}
                    sx={getChipStyling(lead.status)}
                  />
                </Box>
              }
              secondary={
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Contact: {lead.contact}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Value: {lead.value}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={lead.probability}
                      sx={{ 
                        flexGrow: 1,
                        height: 6,
                        borderRadius: 1
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {lead.probability}%
                    </Typography>
                  </Box>
                </Box>
              }
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton size="small">
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default LeadManagement; 