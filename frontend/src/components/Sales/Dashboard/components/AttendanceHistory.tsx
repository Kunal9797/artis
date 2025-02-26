import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography,
  CircularProgress,
  IconButton,
  Grid,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  Tooltip,
  Alert,
  ButtonGroup,
  Button
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { attendanceApi } from '../../../../services/attendanceApi';
import { IAttendanceHistory } from '../../../../types/attendance';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  addMonths,
  startOfWeek,
  endOfWeek,
  isToday,
  isSameMonth
} from 'date-fns';
import { getAddressFromCoordinates } from '../../../../services/locationService';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Custom color constants
const PRESENT_COLOR = 'rgba(76, 175, 80, 0.15)'; // Softer green
const ABSENT_COLOR = 'rgba(244, 67, 54, 0.15)';  // Softer red
const PRESENT_HOVER = 'rgba(76, 175, 80, 0.25)'; // Darker green on hover
const ABSENT_HOVER = 'rgba(244, 67, 54, 0.25)';  // Darker red on hover

const AttendanceHistory: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<IAttendanceHistory[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<IAttendanceHistory | null>(null);
  const [locationAddresses, setLocationAddresses] = useState<Record<string, string>>({});

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date();
      const firstDay = format(startOfMonth(today), 'yyyy-MM-dd');
      const lastDay = format(endOfMonth(today), 'yyyy-MM-dd');
      
      const data = await attendanceApi.getHistory(firstDay, lastDay);
      setHistory(data);
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      setError('Failed to load attendance history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open]);

  const formatLocation = async (location: { latitude: number; longitude: number } | string) => {
    if (typeof location === 'string') return location;
    if (!location) return 'Location not available';

    // Check if we already have the address cached
    const locationKey = `${location.latitude},${location.longitude}`;
    if (locationAddresses[locationKey]) {
      return locationAddresses[locationKey];
    }

    try {
      const address = await getAddressFromCoordinates(location.latitude, location.longitude);
      // Cache the address
      setLocationAddresses(prev => ({
        ...prev,
        [locationKey]: address
      }));
      return address;
    } catch (error) {
      console.error('Error formatting location:', error);
      return `${location.latitude}, ${location.longitude}`;
    }
  };

  const handleMonthChange = (increment: number) => {
    setCurrentDate(prev => addMonths(prev, increment));
  };

  const getDaysInMonth = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  };

  const getAttendanceForDate = (date: Date) => {
    return history.find(record => 
      format(new Date(record.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  const SelectedDateDetails = () => {
    const [formattedAddress, setFormattedAddress] = useState<string>('Loading location...');

    useEffect(() => {
      if (selectedDate && typeof selectedDate.location === 'object') {
        formatLocation(selectedDate.location).then(address => {
          setFormattedAddress(address);
        });
      }
    }, [selectedDate]);

    if (!selectedDate) return null;

    return (
      <Paper 
        sx={{ 
          p: { xs: 2, sm: 3 },
          mt: 2,
          borderRadius: 2,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          bgcolor: selectedDate.status === 'PRESENT' 
            ? 'success.50' 
            : 'error.50'
        }}
      >
        <Typography variant="h6" sx={{ mb: 1 }}>
          {format(new Date(selectedDate.date), 'EEEE, MMMM d, yyyy')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          Time: {format(new Date(selectedDate.date), 'hh:mm a')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Location: {formattedAddress}
        </Typography>
        <Typography
          variant="body2"
          color={selectedDate.status === 'PRESENT' ? 'success.main' : 'error.main'}
          sx={{ 
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}
        >
          {selectedDate.status === 'PRESENT' ? (
            <CheckCircleIcon sx={{ fontSize: 16 }} />
          ) : (
            <CancelIcon sx={{ fontSize: 16 }} />
          )}
          {selectedDate.status}
        </Typography>
      </Paper>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'divider',
        pb: 2
      }}>
        <Typography variant="h6">Attendance History</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ 
          mb: 2, 
          mt: 2,
          bgcolor: 'grey.50',
          borderRadius: 2,
          p: { xs: 1, sm: 3 },
          width: '100%'
        }}>
          {/* Elegant Month/Year Display */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            mb: 4,
            position: 'relative',
            width: '100%'
          }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              gap: 2
            }}>
              <IconButton 
                onClick={() => handleMonthChange(-1)}
                sx={{ 
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                }}
              >
                <ChevronLeftIcon />
              </IconButton>
              <Box sx={{ textAlign: 'center' }}>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 500,
                    letterSpacing: 1,
                    color: 'text.primary'
                  }}
                >
                  {format(currentDate, 'MMMM')}
                </Typography>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    color: 'text.secondary',
                    mt: 0.5
                  }}
                >
                  {format(currentDate, 'yyyy')}
                </Typography>
              </Box>
              <IconButton 
                onClick={() => handleMonthChange(1)}
                sx={{ 
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Weekday Headers with enhanced styling */}
          <Grid container spacing={1} sx={{ mb: 2 }}>
            {WEEKDAYS.map((day) => (
              <Grid item xs={12/7} key={day}>
                <Typography 
                  align="center" 
                  variant="subtitle2" 
                  sx={{ 
                    fontWeight: 600,
                    color: 'text.secondary',
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    letterSpacing: 0.5
                  }}
                >
                  {day}
                </Typography>
              </Grid>
            ))}
          </Grid>

          {/* Calendar Grid with enhanced date boxes */}
          <Grid container spacing={1}>
            {getDaysInMonth().map((date) => {
              const attendance = getAttendanceForDate(date);
              const isCurrentMonth = isSameMonth(date, currentDate);
              const isCurrentDate = isToday(date);

              return (
                <Grid item xs={12/7} key={date.toString()}>
                  <Paper
                    elevation={attendance ? 2 : 0}
                    sx={{
                      aspectRatio: '1',
                      textAlign: 'center',
                      cursor: attendance ? 'pointer' : 'default',
                      bgcolor: !isCurrentMonth 
                        ? 'grey.100'
                        : attendance 
                          ? attendance.status === 'PRESENT'
                            ? PRESENT_COLOR
                            : ABSENT_COLOR
                          : 'background.paper',
                      opacity: !isCurrentMonth ? 0.5 : 1,
                      borderRadius: 1,
                      border: isCurrentDate ? 2 : 1,
                      borderColor: isCurrentDate 
                        ? 'primary.main' 
                        : 'divider',
                      '&:hover': attendance ? {
                        bgcolor: attendance.status === 'PRESENT'
                          ? PRESENT_HOVER
                          : ABSENT_HOVER,
                        transform: 'scale(1.02)',
                        transition: 'all 0.2s ease'
                      } : {},
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      position: 'relative',
                      boxShadow: attendance 
                        ? attendance.status === 'PRESENT'
                          ? '0 2px 8px rgba(76, 175, 80, 0.2)'
                          : '0 2px 8px rgba(244, 67, 54, 0.2)'
                        : 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => attendance && setSelectedDate(attendance)}
                  >
                    <Typography 
                      variant="body2"
                      sx={{
                        color: !isCurrentMonth 
                          ? 'text.disabled' 
                          : attendance
                            ? attendance.status === 'PRESENT'
                              ? 'success.900'
                              : 'error.900'
                            : 'text.primary',
                        fontWeight: attendance || isCurrentDate ? 600 : 400,
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }}
                    >
                      {format(date, 'd')}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>

        <SelectedDateDetails />
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceHistory;
