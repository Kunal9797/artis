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
  getLeads: (filters?: { 
    status?: string,
    page?: number,
    limit?: number,
    assignedTo?: string
  }) => api.get<ILead[]>('/api/sales/leads', { params: filters }),

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
    api.post<ILead>(`/api/sales/leads/${id}/notes`, { note }),

  // Delete lead
  deleteLead: (id: string) => 
    api.delete(`/api/sales/leads/${id}`),

  // Get lead statistics
  getLeadStats: () => 
    api.get('/api/sales/leads/stats'),
};

export default leadApi; 