import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Button,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {
  Store as StoreIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { salesApi } from '../../../../services/salesApi';
import { format } from 'date-fns';
import { DealerVisit } from '../../../../types/sales';
import DealerVisitDialog from '../../DealerVisit/DealerVisitDialog';

const DealerVisits: React.FC = () => {
  const theme = useTheme();
  const [visits, setVisits] = useState<DealerVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchVisits = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const response = await salesApi.getDealerVisits({
        startDate: today,
        endDate: today
      });
      setVisits(response.data);
    } catch (error) {
      console.error('Error fetching visits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  const handleVisitSubmit = () => {
    fetchVisits(); // Refresh the list after new visit
    setShowForm(false);
  };

  const getTotalSheets = (sales: DealerVisit['sales']) => {
    return Object.values(sales).reduce((sum, count) => sum + count, 0);
  };

  if (loading) {
    return <Typography>Loading visits...</Typography>;
  }

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
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowForm(true)}
        >
          New Visit
        </Button>
      </Box>

      {visits.length === 0 ? (
        <Typography color="text.secondary">No visits recorded today</Typography>
      ) : (
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
                <Avatar sx={{ bgcolor: theme.palette.primary.light }}>
                  <StoreIcon sx={{ color: theme.palette.primary.main }} />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2">
                      {visit.dealerNames.join(', ')}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${getTotalSheets(visit.sales)} sheets`}
                      sx={{
                        bgcolor: `${theme.palette.success.main}15`,
                        color: theme.palette.success.main,
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
                        {format(new Date(visit.visitDate), 'h:mm a')}
                      </Typography>
                    </Box>
                    {visit.location.address && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        <LocationIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {visit.location.address}
                        </Typography>
                      </Box>
                    )}
                    {visit.notes && (
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ mt: 0.5, fontStyle: 'italic' }}
                      >
                        {visit.notes}
                      </Typography>
                    )}
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      <DealerVisitDialog
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleVisitSubmit}
      />
    </Box>
  );
};

export default DealerVisits; 