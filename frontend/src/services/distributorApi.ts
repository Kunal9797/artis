import api from './api';
import { Distributor } from '../types/distributor';
import * as XLSX from 'xlsx';

export const distributorApi = {
  getAllDistributors: async () => {
    const response = await api.get<Distributor[]>('/api/distributors');
    return response.data;
  },

  importDistributors: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/distributors/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  importFromExcel: async (file: File): Promise<Distributor[]> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await distributorApi.importDistributors(file);
    if (response.success > 0) {
      return distributorApi.getAllDistributors();
    }
    throw new Error(response.error || 'Import failed');
  },

  deleteAllDistributors: async () => {
    const response = await api.delete('/api/distributors');
    return response.data;
  }
}; 