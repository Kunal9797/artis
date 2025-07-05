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
  warnings?: string[];
}

interface SyncHistoryRecord {
  id: string;
  syncBatchId: string;
  syncType: 'consumption' | 'purchases' | 'corrections' | 'initialStock';
  syncDate: string;
  itemCount: number;
  status: 'completed' | 'failed' | 'undone';
  errors?: string;
  warnings?: string;
  metadata?: any;
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

interface SyncHistoryResponse {
  success: boolean;
  data: {
    total: number;
    records: SyncHistoryRecord[];
  };
}

interface UndoSyncResponse {
  success: boolean;
  message: string;
  details: {
    syncType: string;
    syncDate: string;
    transactionsDeleted: number;
    productsRecalculated: number;
  };
}

const sheetsApi = {
  getPendingCounts: async (): Promise<{ success: boolean; data: PendingCounts }> => {
    const response = await api.get('/api/sheets/pending');
    return response.data;
  },

  syncConsumption: async (archiveName?: string): Promise<SyncResult> => {
    const response = await api.post('/api/sheets/sync/consumption', { archiveName });
    return response.data;
  },

  syncPurchases: async (archiveName?: string): Promise<SyncResult> => {
    const response = await api.post('/api/sheets/sync/purchases', { archiveName });
    return response.data;
  },

  syncCorrections: async (archiveName?: string): Promise<SyncResult> => {
    const response = await api.post('/api/sheets/sync/corrections', { archiveName });
    return response.data;
  },

  syncInitialStock: async (archiveName?: string): Promise<SyncResult> => {
    const response = await api.post('/api/sheets/sync/initial-stock', { archiveName });
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
  },

  getSyncHistory: async (limit: number = 10, offset: number = 0): Promise<SyncHistoryResponse> => {
    const response = await api.get('/api/sheets/sync-history', {
      params: { limit, offset }
    });
    return response.data;
  },

  undoLastSync: async (): Promise<UndoSyncResponse> => {
    const response = await api.post('/api/sheets/undo-last-sync');
    return response.data;
  },

  undoSync: async (syncBatchId: string): Promise<UndoSyncResponse> => {
    const response = await api.post(`/api/sheets/undo-sync/${syncBatchId}`);
    return response.data;
  }
};

export default sheetsApi;