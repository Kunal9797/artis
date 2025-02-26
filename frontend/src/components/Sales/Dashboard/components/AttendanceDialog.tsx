import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { getAddressFromCoordinates } from '../../../../services/locationService';

interface ILocation {
  latitude: number;
  longitude: number;
}

interface AttendanceDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (location: ILocation) => Promise<void>;
  attendanceMarked?: boolean;
  attendanceData?: any;
}

const AttendanceDialog: React.FC<AttendanceDialogProps> = ({ 
  open, 
  onClose, 
  onSubmit,
  attendanceMarked,
  attendanceData 
}) => {
  const [location, setLocation] = useState<ILocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [formattedAddress, setFormattedAddress] = useState<string>('');

  const getCurrentLocation = () => {
    setLoading(true);
    setError('');
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLoading(false);
      },
      (error) => {
        setError('Unable to retrieve your location');
        setLoading(false);
      }
    );
  };

  const handleSubmit = async (location: ILocation) => {
    try {
      await onSubmit(location);
      onClose();
    } catch (error: any) {
      console.log('=== AttendanceDialog Error Debug ===');
      console.log('Error caught:', error);
      console.log('Error message:', error.message);
      
      // Show the actual error message from the API
      const message = error.message || 'Failed to mark attendance';
      alert(message);
    }
  };

  useEffect(() => {
    if (open) {
      getCurrentLocation();
    }
  }, [open]);

  useEffect(() => {
    if (attendanceMarked && attendanceData?.location) {
      const loc = attendanceData.location;
      if (typeof loc === 'object' && loc.latitude && loc.longitude) {
        getAddressFromCoordinates(loc.latitude, loc.longitude)
          .then(address => setFormattedAddress(address));
      }
    }
  }, [attendanceMarked, attendanceData]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {attendanceMarked ? 'Attendance Details' : 'Mark Today\'s Attendance'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2 }}>
          {attendanceMarked && attendanceData ? (
            <>
              <Typography variant="body1" gutterBottom>
                Date: {new Date(attendanceData.date).toLocaleDateString()}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Time: {new Date(attendanceData.createdAt).toLocaleTimeString()}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Location: {formattedAddress || 'Fetching location...'}
              </Typography>
              <Typography variant="body1" color="success.main">
                Attendance has been marked for today
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="body1" gutterBottom>
                Date: {new Date().toLocaleDateString()}
              </Typography>
              <Typography variant="body1" gutterBottom>
                Time: {new Date().toLocaleTimeString()}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <LocationOnIcon color="primary" sx={{ mr: 1 }} />
                {loading ? (
                  <CircularProgress size={20} />
                ) : location ? (
                  <Typography variant="body2" color="success.main">
                    Location captured successfully
                  </Typography>
                ) : (
                  <Typography variant="body2" color="error">
                    {error || 'Location not captured'}
                  </Typography>
                )}
              </Box>
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        {!attendanceMarked && (
          <Button 
            onClick={() => handleSubmit(location as ILocation)}
            disabled={!location || loading}
            variant="contained"
            color="primary"
          >
            Mark Attendance
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AttendanceDialog;
