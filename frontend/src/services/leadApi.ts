import api from './api';
import { ILead, ILeadFormData, ILeadFilters, ILeadAssignment } from '../types/sales';

export const leadApi = {
  // Create new lead
  createLead: (data: ILeadFormData) => 
    api.post<ILead>('/api/sales/leads', data, {
      headers: {
        'Content-Type': 'application/json'
      }
    }),

  // Get all leads with optional filters
  getLeads: (filters?: ILeadFilters) => {
    const params: Record<string, string | number | undefined> = {
      status: filters?.status,
      page: filters?.page,
      limit: filters?.limit,
      assignedTo: filters?.assignedTo,
      searchTerm: filters?.searchTerm,
      startDate: filters?.dateRange?.start,
      endDate: filters?.dateRange?.end
    };
    
    // Remove undefined values
    Object.keys(params).forEach(key => {
      if (params[key] === undefined) {
        delete params[key];
      }
    });
    
    return api.get<ILead[]>('/api/sales/leads', { params });
  },

  // Get single lead details
  getLead: (id: string) => 
    api.get<ILead>(`/api/sales/leads/${id}`),

  // Update lead status and notes
  updateLead: (id: string, data: Partial<ILead>) => 
    api.put<ILead>(`/api/sales/leads/${id}`, data),

  // Assign lead to sales team member
  assignLead: (data: ILeadAssignment) => {
    if (!data.leadId) {
        throw new Error('Lead ID is required');
    }
    return api.put<ILead>(`/api/sales/leads/${data.leadId}/assign`, {
        assignedTo: data.assignedTo,
        notes: data.notes
    });
  },

  // Add note to lead
  addNote: (id: string, note: string) => 
    api.post<ILead>(`/api/sales/leads/${id}/notes`, { 
      note,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    }),

  // Delete lead
  deleteLead: (id: string) => 
    api.delete(`/api/sales/leads/${id}`),

  // Get lead statistics
  getLeadStats: () => 
    api.get('/api/sales/leads/stats'),
};

export default leadApi; 