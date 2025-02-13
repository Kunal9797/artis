import api from './api';
import { PerformanceMetric, DealerVisit, Lead, Activity, ISalesTeamMember } from '../types/sales';
import { SalesTeamAttributes } from '../../../backend/src/models/SalesTeam';

export const salesApi = {
  // Performance Metrics
  getPerformanceMetrics: (params: { 
    view: 'personal' | 'zone' | 'country',
    timeRange: 'week' | 'month' | 'quarter'
  }) => api.get<PerformanceMetric>('/api/sales/reports/performance', { params }),

  // Team Management
  getTeamMembers: (params: { zoneId?: string }) => {
    return api.get('/api/sales/team', { params });
  },

  getAllSalesTeam: async () => {
    console.log('Fetching all sales team members...');
    const response = await api.get('/api/sales/team/members');
    console.log('Sales team response:', response.data);
    return response;
  },
  
  createSalesTeamMember: (data: Omit<SalesTeamAttributes, 'id' | 'role'>) => 
    api.post('/api/sales/team', data),

  updateTeamMember: (memberId: string, data: Partial<Omit<SalesTeamAttributes, 'id' | 'userId' | 'role'>>) => 
    api.put(`/api/sales/team/${memberId}`, data),

  getTeamDetails: (id: string) => api.get(`/api/sales/team/${id}`),

  // Activity
  getActivities: (params: { 
    view: 'personal' | 'zone' | 'country',
    limit?: number 
  }) => api.get('/api/sales/activities', { params }),

  // Dealer Visits
  getDealerVisits: (params?: { 
    startDate?: string, 
    endDate?: string 
  }) => api.get<DealerVisit[]>('/api/sales/visits', { params }),

  recordDealerVisit: (data: {
    dealerName: string,
    location: string,
    visitDate: string,
    notes?: string,
    salesAmount: number,
    isOfflineEntry?: boolean,
    offlineId?: string,
    photo?: File
  }) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        if (value instanceof File) {
          formData.append(key, value);
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          formData.append(key, value.toString());
        } else {
          formData.append(key, value);
        }
      }
    });
    return api.post<DealerVisit>('/api/sales/visits', formData);
  },

  syncOfflineVisits: (visits: DealerVisit[]) => 
    api.post<DealerVisit[]>('/api/sales/visits/sync', { visits }),

  updateVisitStatus: (visitId: string, status: 'completed' | 'pending' | 'cancelled') => {
    return api.put(`/api/sales/visits/${visitId}/status`, { status });
  },

  // Leads
  getLeads: (params: { status?: string }) => {
    return api.get('/api/sales/leads', { params });
  },

  createLead: (data: {
    customerName: string;
    phoneNumber: string;
    enquiryDetails?: string;
    assignedTo: string;
    location: string;
    notes?: string;
  }) => {
    return api.post('/api/sales/leads', data);
  },

  updateLead: (leadId: string, data: {
    status?: string;
    probability?: number;
    notes?: string;
  }) => {
    return api.put(`/api/sales/leads/${leadId}`, data);
  },

  // Add this new endpoint
  deleteSalesTeamMemberByUserId: (userId: string) => 
    api.delete(`/api/sales/team/user/${userId}`),
};

export default salesApi; 