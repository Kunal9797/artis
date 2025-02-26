import api from './api';
import { 
  PerformanceMetric, 
  DealerVisit, 
  Lead, 
  Activity, 
  ISalesTeamMember,
  SalesTeamAttributes  // Import from local types instead
} from '../types/sales';

interface ProductSales {
  liner: number;
  artvio08: number;
  woodrica08: number;
  artis1: number;
}

interface DealerVisitData {
  dealerNames: string[];
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  visitDate: string;
  notes?: string;
  sales: ProductSales;
  isOfflineEntry?: boolean;
  offlineId?: string;
  photo?: File;
}

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
  }) => {
    return api.get<DealerVisit[]>('/api/sales/visits', { params });
  },

  recordDealerVisit: (data: DealerVisitData) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value);
        }
      }
    });
    return api.post('/api/sales/visits', formData);
  },

  syncOfflineVisits: (visits: DealerVisit[]) => 
    api.post<DealerVisit[]>('/api/sales/visits/sync', { visits }),

  updateVisitStatus: (visitId: string, status: 'completed' | 'pending' | 'cancelled') => {
    return api.put(`/api/sales/visits/${visitId}/status`, { status });
  },

  updateDealerVisit: (visitId: string, data: Partial<DealerVisitData>) => {
    const formData = new FormData();
    
    if (data.dealerNames) formData.append('dealerNames', JSON.stringify(data.dealerNames));
    if (data.location) formData.append('location', JSON.stringify(data.location));
    if (data.sales) formData.append('sales', JSON.stringify(data.sales));
    if (data.notes) formData.append('notes', data.notes);
    if (data.photo) formData.append('photo', data.photo);

    return api.put<DealerVisit>(`/api/sales/visits/${visitId}`, formData);
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