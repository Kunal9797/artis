export interface PerformanceMetric {
  period: string;
  sales: number;
  target: number;
  lastYear: number;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  area: string;
  performance: number;
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