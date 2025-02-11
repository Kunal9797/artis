import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import { ISalesTeamMember, Activity } from '../types/sales';
import { ROLE_LABELS } from '../types/user';

interface SalesTeamMemberDetailsProps {
  member: ISalesTeamMember;
  onClose: () => void;
}

const SalesTeamMemberDetails: React.FC<SalesTeamMemberDetailsProps> = ({
  member,
  onClose
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'visit':
        return <LocationIcon />;
      case 'lead':
        return <PersonIcon />;
      case 'sale':
        return <AssessmentIcon />;
      default:
        return <TimelineIcon />;
    }
  };

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">{member.name}</Typography>
          <Chip
            label={ROLE_LABELS[member.role as keyof typeof ROLE_LABELS]}
            size="small"
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Basic Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography>Territory: {member.territory}</Typography>
              <Typography>
                Reports To: {member.reportingTo || 'No Manager'}
              </Typography>
              <Typography>
                Target (Q{member.targetQuarter} {member.targetYear}): 
                ₹{member.targetAmount.toLocaleString()}
              </Typography>
            </Box>
          </Grid>

          {/* Performance Metrics */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Performance Metrics
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography>
                Current Sales: ₹{member.performance.currentSales.toLocaleString()}
              </Typography>
              <Typography>
                Target Achievement: {member.performance.targetAchievement}%
              </Typography>
              <Typography>
                Visits Completed: {member.performance.visitsCompleted}
              </Typography>
              <Typography>
                Average Deal Size: ₹{member.performance.avgDealSize.toLocaleString()}
              </Typography>
            </Box>
          </Grid>

          {/* Attendance */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Attendance
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography>
                Present Days: {member.attendance.present}
              </Typography>
              <Typography>
                Absent Days: {member.attendance.absent}
              </Typography>
              <Typography>
                Attendance Rate: {((member.attendance.present / member.attendance.total) * 100).toFixed(1)}%
              </Typography>
            </Box>
          </Grid>

          {/* Recent Activities */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Recent Activities
            </Typography>
            <List>
              {member.activities.map((activity) => (
                <ListItem key={activity.id}>
                  <ListItemIcon>
                    {getActivityIcon(activity.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={activity.title}
                    secondary={
                      <>
                        {activity.description}
                        <br />
                        {formatDate(activity.time)}
                      </>
                    }
                  />
                  <Chip
                    label={activity.status}
                    size="small"
                    color={
                      activity.status === 'completed'
                        ? 'success'
                        : activity.status === 'pending'
                        ? 'warning'
                        : 'info'
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SalesTeamMemberDetails; 