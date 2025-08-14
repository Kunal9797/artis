export enum ContactStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  CONVERTED = 'CONVERTED',
  LOST = 'LOST'
}

export interface Contact {
  id: string;
  submissionTime: string;
  name: string;
  phone: string;
  interestedIn?: string;
  address?: string;
  query?: string;
  status: ContactStatus;
  isNew: boolean;
  assignedTo?: string;
  notes?: string;
  source: string;
  syncBatchId?: string;
  createdAt: string;
  updatedAt: string;
  salesTeam?: {
    id: string;
    territory: string;
  };
}

export interface ContactsResponse {
  success: boolean;
  data: {
    contacts: Contact[];
    total: number;
    page: number;
    pages: number;
  };
}

export interface ContactFilters {
  page?: number;
  limit?: number;
  status?: ContactStatus;
  isNew?: boolean;
  search?: string;
}