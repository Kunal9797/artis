import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, styled, useTheme, useMediaQuery, LinearProgress, Badge, IconButton, Dialog, DialogTitle, DialogContent } from '@mui/material';
import { useAuth } from '../../../context/AuthContext';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AddIcon from '@mui/icons-material/Add';
import NavigationCard from '../../NavigationCard';
import AttendanceDialog from './components/AttendanceDialog';
import { attendanceApi } from '../../../services/attendanceApi';
import { ILocation, IAttendanceHistory } from '../../../types/attendance';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CloseIcon from '@mui/icons-material/Close';
import AttendanceHistory from './components/AttendanceHistory';
import { useNavigate } from 'react-router-dom';
import { leadApi } from '../../../services/leadApi';
import { format, subDays } from 'date-fns';

const WelcomeSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5)
}));

const RoleBadge = styled(Typography)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main + '15',
  padding: '4px 12px',
  borderRadius: '12px',
  fontSize: '0.8rem',
  color: theme.palette.primary.main,
  display: 'inline-block'
}));

const ActionCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== 'marked' && prop !== 'isAttendance'
})<{ marked?: boolean | null; isAttendance?: boolean }>(({ theme, marked, isAttendance }) => ({
  borderRadius: 16,
  padding: theme.spacing(2),
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  position: 'relative',
  borderLeft: `8px solid ${
    isAttendance 
      ? (marked ? theme.palette.success.main : theme.palette.warning.main)
      : theme.palette.primary.main
  }`,
  transition: 'all 0.3s ease',
  cursor: 'pointer',
  margin: '0 auto',
  maxWidth: '98%',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4]
  }
}));

const IconWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'marked'
})<{ marked?: boolean | null }>(({ theme, marked }) => ({
  width: 48,
  height: 48,
  borderRadius: '50%',
  backgroundColor: marked ? theme.palette.success.main : theme.palette.primary.main,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.primary.contrastText
}));

const ContentWrapper = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
});

const AddButton = styled(IconButton)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark
  }
}));

const ProgressSection = styled(Card)(({ theme }) => ({
  padding: theme.spacing(2.5),
  marginTop: theme.spacing(2),
  borderRadius: 16,
  maxWidth: '95%',
  margin: '16px auto 0'
}));

const SalesHome: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const [showAttendanceDialog, setShowAttendanceDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const navigate = useNavigate();
  
  // Replace the hardcoded newLeadsCount with state
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [monthlyTarget] = useState({
    current: 500000,
    target: 1000000,
    daysRemaining: 12
  });

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const [recentHistory, setRecentHistory] = useState<IAttendanceHistory[]>([]);

  // Check attendance status on component mount
  useEffect(() => {
    checkAttendanceStatus();
  }, []);

  // Add useEffect to fetch and count NEW leads
  useEffect(() => {
    const fetchNewLeadsCount = async () => {
      try {
        if (user && ['SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD'].includes(user.role)) {
          const response = await leadApi.getLeads({ assignedTo: user.id });
          const newLeads = response.data.filter(lead => lead.status === 'NEW');
          setNewLeadsCount(newLeads.length);
        }
      } catch (error) {
        console.error('Error fetching new leads count:', error);
      }
    };

    fetchNewLeadsCount();
  }, [user]);

  // Add useEffect to fetch last 7 days history
  useEffect(() => {
    const fetchRecentHistory = async () => {
      try {
        const endDate = format(new Date(), 'yyyy-MM-dd');
        const startDate = format(subDays(new Date(), 6), 'yyyy-MM-dd');
        const history = await attendanceApi.getHistory(startDate, endDate);
        setRecentHistory(history);
      } catch (error) {
        console.error('Error fetching recent history:', error);
      }
    };

    fetchRecentHistory();
  }, []);

  const checkAttendanceStatus = async () => {
    try {
      const response = await attendanceApi.getTodayStatus();
      setAttendanceMarked(!!response.data);
      setAttendanceData(response.data);
    } catch (error) {
      console.error('Error checking attendance:', error);
      setAttendanceMarked(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceClick = () => {
    // If attendance is already marked, show history instead of attendance dialog
    if (attendanceMarked) {
      setShowHistoryDialog(true);
    } else {
      setShowAttendanceDialog(true);
    }
  };

  const handleAttendanceSubmit = async (location: { latitude: number; longitude: number }) => {
    console.log('Submitting attendance with location:', location);
    try {
      const response = await attendanceApi.markAttendance(location);
      setAttendanceMarked(true);
      setAttendanceData(response.data);
      setShowAttendanceDialog(false);
      // Refresh attendance status
      checkAttendanceStatus();
    } catch (error) {
      console.error('Error marking attendance:', error);
    }
  };

  const handleLeadsClick = () => {
    console.log('Leads card clicked');
    navigate('/sales/leads', { 
      state: { currentPage: 'leads' }  // Add this state
    });
  };

  const handleDealerVisitClick = () => {
    navigate('/sales/visits', { 
      state: { currentPage: 'visits' }
    });
  };

  // Style 2: Dynamic with colored name
  const WelcomeStyle2 = () => (
    <Box sx={{ 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      mb: 3,
      pb: 2,
      borderBottom: '1px solid rgba(0,0,0,0.1)'
    }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'baseline',
        gap: 1,
        mb: 1
      }}>
        <Typography variant="h5" sx={{ fontWeight: 500 }}>
          Welcome back,
        </Typography>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 600,
            color: 'primary.main',
            ml: 0.5
          }}
        >
          {user?.firstName || 'Sales'}
        </Typography>
      </Box>
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        alignItems: 'center' 
      }}>
        <RoleBadge>SALES EXECUTIVE</RoleBadge>
        <Typography variant="body2" color="text.secondary">
          {today}
        </Typography>
      </Box>
    </Box>
  );

  // Style 3: Minimal with subtle emphasis
  const WelcomeStyle3 = () => (
    <Box sx={{ 
      mb: 3,
      pb: 2,
      borderBottom: '1px solid rgba(0,0,0,0.1)',
      textAlign: 'center'
    }}>
      <Box sx={{ mb: 1 }}>
        <Typography 
          component="span" 
          variant="body1" 
          color="text.secondary"
        >
          Welcome back,{''}
        </Typography>
        <Typography 
          component="span" 
          variant="h6" 
          sx={{ 
            fontWeight: 600,
            color: 'primary.main'
          }}
        >
          {user?.firstName || 'Sales'}
        </Typography>
      </Box>
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <RoleBadge>SALES EXECUTIVE</RoleBadge>
        <Typography variant="body2" color="text.secondary">
          {today}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      {/* Comment out the one you don't want to use */}
      <WelcomeStyle2 />
      {/* <WelcomeStyle3 /> */}

      <Grid container spacing={2}>
        {/* Attendance Card */}
        <Grid item xs={12}>
          <ActionCard 
            marked={attendanceMarked}
            isAttendance={true}
            onClick={handleAttendanceClick}
          >
            <IconWrapper marked={attendanceMarked}>
              <AccessTimeIcon sx={{ fontSize: '1.4rem' }} />
            </IconWrapper>
            <ContentWrapper>
              <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 500 }}>
                Attendance
              </Typography>
              {loading ? (
                <Typography variant="caption" color="text.secondary">
                  Checking...
                </Typography>
              ) : (
                <Typography 
                  variant="caption" 
                  color={attendanceMarked ? "success.main" : "warning.main"}
                  sx={{ fontWeight: 500 }}
                >
                  {attendanceMarked 
                    ? `Marked • ${new Date(attendanceData?.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` 
                    : 'Mark attendance'}
                </Typography>
              )}
            </ContentWrapper>
          </ActionCard>
        </Grid>

        {/* Dealer Visit Card */}
        <Grid item xs={12}>
          <ActionCard onClick={handleDealerVisitClick}>
            <IconWrapper>
              <StorefrontIcon sx={{ fontSize: '1.4rem' }} />
            </IconWrapper>
            <ContentWrapper>
              <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 500 }}>
                Dealer Visit
              </Typography>
              <Typography variant="caption" color="text.secondary">
                View all visits
              </Typography>
            </ContentWrapper>
          </ActionCard>
        </Grid>

        {/* Leads Card */}
        <Grid item xs={12}>
          <ActionCard onClick={handleLeadsClick}>
            <Badge 
              badgeContent={newLeadsCount || undefined} 
              color="error"
              sx={{ 
                '& .MuiBadge-badge': {
                  fontSize: '0.7rem',
                  height: 16,
                  minWidth: 16,
                  padding: '0 4px'
                }
              }}
            >
              <IconWrapper>
                <AssignmentIcon sx={{ fontSize: '1.4rem' }} />
              </IconWrapper>
            </Badge>
            <ContentWrapper>
              <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 500 }}>
                Leads
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {newLeadsCount ? `${newLeadsCount} new` : 'No new leads'}
              </Typography>
            </ContentWrapper>
          </ActionCard>
        </Grid>
      </Grid>

      {/* Monthly Target Progress */}
      <ProgressSection sx={{ maxWidth: '98%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={500}>
            Monthly Target
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {monthlyTarget.daysRemaining} days remaining
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={(monthlyTarget.current / monthlyTarget.target) * 100}
          sx={{ height: 8, borderRadius: 4, mb: 1 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            {monthlyTarget.current} / {monthlyTarget.target} sheets
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {((monthlyTarget.current / monthlyTarget.target) * 100).toFixed(1)}%
          </Typography>
        </Box>
      </ProgressSection>

      {/* Attendance Dialog - only for marking attendance */}
      <AttendanceDialog
        open={showAttendanceDialog}
        onClose={() => setShowAttendanceDialog(false)}
        onSubmit={handleAttendanceSubmit}
        attendanceMarked={attendanceMarked ?? false}
        attendanceData={attendanceData}
      />

      {/* History Dialog - only for viewing history */}
      <AttendanceHistory 
        open={showHistoryDialog}
        onClose={() => setShowHistoryDialog(false)}
      />
    </Box>
  );
};

export default SalesHome;
