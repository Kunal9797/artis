import api from './api';
import { Contact, ContactsResponse, ContactFilters } from '../types/contact';

export const contactApi = {
  // Get all contacts with filters and pagination
  getContacts: async (filters?: ContactFilters): Promise<ContactsResponse> => {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await api.get(`/api/contacts?${params.toString()}`);
    return response.data;
  },

  // Get single contact by ID
  getContact: async (id: string): Promise<{ success: boolean; data: Contact }> => {
    const response = await api.get(`/api/contacts/${id}`);
    return response.data;
  },

  // Get count of new contacts
  getNewContactsCount: async (): Promise<{ success: boolean; count: number }> => {
    const response = await api.get('/api/contacts/new-count');
    return response.data;
  },

  // Get latest contacts for home screen
  getLatestContacts: async (limit: number = 5): Promise<{ success: boolean; data: Contact[] }> => {
    const response = await api.get(`/api/contacts/latest?limit=${limit}`);
    return response.data;
  },

  // Update contact
  updateContact: async (
    id: string, 
    data: { status?: string; assignedTo?: string; notes?: string }
  ): Promise<{ success: boolean; data: Contact }> => {
    const response = await api.put(`/api/contacts/${id}`, data);
    return response.data;
  },

  // Mark contact as read
  markAsRead: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/api/contacts/${id}/mark-read`);
    return response.data;
  },

  // Mark all contacts as read
  markAllAsRead: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/api/contacts/mark-all-read');
    return response.data;
  },

  // Sync contacts from Google Sheets
  syncContacts: async (): Promise<{ 
    success: boolean; 
    message: string; 
    added: number; 
    skipped: number; 
    errors: string[]; 
    warnings: string[] 
  }> => {
    const response = await api.post('/api/contacts/sync');
    return response.data;
  }
};