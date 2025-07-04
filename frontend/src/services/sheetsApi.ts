import api from './api';

interface PendingCounts {
  consumption: number;
  purchases: number;
  corrections: number;
  initialStock: number;
}

interface SyncResult {
  success: boolean;
  message: string;
  added?: number;
  errors?: string[];
}

const sheetsApi = {
  getPendingCounts: async (): Promise<{ success: boolean; data: PendingCounts }> => {
    const response = await api.get('/api/sheets/pending');
    return response.data;
  },

  syncConsumption: async (): Promise<SyncResult> => {
    const response = await api.post('/api/sheets/sync/consumption');
    return response.data;
  },

  syncPurchases: async (): Promise<SyncResult> => {
    const response = await api.post('/api/sheets/sync/purchases');
    return response.data;
  },

  syncCorrections: async (): Promise<SyncResult> => {
    const response = await api.post('/api/sheets/sync/corrections');
    return response.data;
  },

  syncInitialStock: async (): Promise<SyncResult> => {
    const response = await api.post('/api/sheets/sync/initial-stock');
    return response.data;
  },

  setupSheet: async (type: 'consumption' | 'purchases' | 'corrections' | 'initialStock'): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/api/sheets/setup/${type}`);
    return response.data;
  },

  getArchiveTabs: async (type: 'consumption' | 'purchases' | 'corrections' | 'initialStock'): Promise<{ success: boolean; data: string[] }> => {
    const response = await api.get(`/api/sheets/archives/${type}`);
    return response.data;
  },

  clearInventory: async (): Promise<{ success: boolean; message: string; details?: { transactionsDeleted: number; productsReset: number } }> => {
    const response = await api.post('/api/sheets/clear-inventory');
    return response.data;
  }
};

export default sheetsApi;