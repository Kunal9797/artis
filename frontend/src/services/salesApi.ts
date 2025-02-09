import api from './api';

export const salesApi = {
  // Performance Metrics
  getPerformanceMetrics: (params: { 
    view: 'personal' | 'zone' | 'country',
    timeRange: 'week' | 'month' | 'quarter'
  }) => {
    return api.get('/api/sales/performance', { params });
  },

  // Team Management
  getTeamMembers: (params: { zoneId?: string }) => {
    return api.get('/api/sales/team', { params });
  },

  // Activity
  getActivities: (params: { 
    view: 'personal' | 'zone' | 'country',
    limit?: number 
  }) => {
    return api.get('/api/sales/activities', { params });
  },

  // Dealer Visits
  getDealerVisits: (params: { date: string }) => {
    return api.get('/api/sales/visits', { params });
  },

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