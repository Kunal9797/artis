import api from './api';
import { PerformanceMetric, DealerVisit, Lead, Activity, ISalesTeamMember } from '../types/sales';

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

  getAllSalesTeam: () => {
    return api.get<ISalesTeamMember[]>('/api/sales/team/all');
  },

  updateTeamMember: (id: string, data: {
    targetQuarter?: number;
    targetYear?: number;
    targetAmount?: number;
    territory?: string;
  }) => {
    return api.put(`/api/sales/team/${id}`, data);
  },

  // Activity
  getActivities: (params: { 
    view: 'personal' | 'zone' | 'country',
    limit?: number 
  }) => {
    return api.get('/api/sales/activities', { params });
  },

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
    name: string;
    contact: string;
    value: string;
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
  }
};

export default salesApi; 