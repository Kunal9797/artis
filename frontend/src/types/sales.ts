export interface PerformanceMetric {
  timeSeriesData: {
    date: string;
    sales: number;
  }[];
  comparisonData: {
    name: string;
    current: number;
    target: number;
  }[];
  metrics: {
    targetAchievement: number;
    targetAchievementTrend: string;
    visitsCompleted: number;
    visitsCompletedTrend: string;
    avgDealSize: number;
    avgDealSizeTrend: string;
  };
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  area: string;
  performance: {
    currentSales: number;
    targetAchievement: number;
    visitsCompleted: number;
    avgDealSize: number;
  };
  status: 'online' | 'offline';
}

export interface Activity {
  id: string;
  type: 'visit' | 'lead' | 'sale' | 'schedule';
  title: string;
  description: string;
  time: string;
  user: string;
  status: 'completed' | 'pending' | 'upcoming';
}

export interface DealerVisit {
  id: string;
  dealer: string;
  time: string;
  status: 'completed' | 'upcoming' | 'pending';
  location: string;
  notes?: string;
}

export interface Lead {
  id: string;
  name: string;
  contact: string;
  value: string;
  status: 'new' | 'followup' | 'negotiation' | 'closed';
  probability: number;
}

export interface ISalesTeamMember extends TeamMember {
  userId: string;
  territory: string;
  reportingTo: string | null;
  targetQuarter: number;
  targetYear: number;
  targetAmount: number;
  performance: {
    currentSales: number;
    targetAchievement: number;
    visitsCompleted: number;
    avgDealSize: number;
  };
  attendance: {
    present: number;
    absent: number;
    total: number;
  };
  activities: Activity[];
}

export interface ILeadFormData {
  customerName: string;
  phoneNumber: string;
  location: string;
  notes: string;
  assignedTo: string;
  enquiryDetails: string;
}

export interface ILead extends ILeadFormData {
  id: string;
  status: 'new' | 'followup' | 'negotiation' | 'closed';
  createdAt: string;
  updatedAt: string;
  assignedBy: string;
  assignee?: {
    id: string;
    User: {
      firstName: string;
      lastName: string;
    };
    role: string;
  };
  notesHistory: {
    timestamp: string;
    note: string;
    author: string;
  }[];
}

export interface ILeadFilters {
  status?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  assignedTo?: string;
  page?: number;
  limit?: number;
  searchTerm?: string;
}

export interface ILeadAssignment {
  leadId: string;
  assignedTo: string;
  notes?: string;
} 