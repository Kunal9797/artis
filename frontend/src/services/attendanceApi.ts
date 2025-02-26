import api from './api';
import { ILocation, IAttendance } from '../types/attendance';

export const attendanceApi = {
  // Mark attendance
  markAttendance: async (location: ILocation) => {
    const payload = {
      location: {
        latitude: Number(location.latitude),
        longitude: Number(location.longitude)
      },
      status: 'PRESENT',
      date: new Date().toISOString().split('T')[0]
    };
    
    console.log('Marking attendance with payload:', payload);
    
    try {
      const response = await api.post<IAttendance>('/api/sales/attendance', payload);
      return response;
    } catch (error: any) {
      // Detailed error logging
      console.log('=== Attendance Error Debug ===');
      console.log('Error response data:', error.response?.data);
      console.log('Error message:', error.message);
      console.log('Full error object:', error);
      
      const errorMessage = error.response?.data?.error;
      if (errorMessage && errorMessage.includes('already marked')) {
        throw new Error(errorMessage);
      }
      throw new Error(errorMessage || 'Failed to mark attendance');
    }
  },

  // Get today's attendance status
  getTodayStatus: async () => {
    const today = new Date().toISOString().split('T')[0];
    return api.get<IAttendance>(`/api/sales/attendance/status?date=${today}`);
  },

  // Get attendance history
  getHistory: async (startDate: string, endDate: string) => {
    try {
      console.log('Attempting to fetch attendance history:', {
        endpoint: '/api/sales/attendance/history',
        params: { startDate, endDate }
      });

      const response = await api.get(
        '/api/sales/attendance/history', 
        { 
          params: { 
            startDate, 
            endDate 
          } 
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Detailed attendance history error:', {
        error,
        config: (error as any)?.config,
        response: (error as any)?.response
      });
      throw error;
    }
  },

  // Add a new method for admin to get team attendance
  getTeamAttendance: async (teamId: string, startDate: string, endDate: string) => {
    const response = await api.get(
      `/api/sales/attendance/team/${teamId}`,
      {
        params: {
          startDate,
          endDate
        }
      }
    );
    return response.data;
  },
};

export default attendanceApi; 