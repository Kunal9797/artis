export interface ILocation {
    latitude: number;
    longitude: number;
  }
  
  export interface IAttendance {
    id: string;
    salesTeamId: string;
    date: string;
    location: string;
    status: 'PRESENT' | 'ABSENT' | 'LEAVE';
    createdAt: string;
    updatedAt: string;
  }
  
  export interface IAttendanceHistory {
    date: string;
    status: 'PRESENT' | 'ABSENT' | 'LEAVE';
    location: string;
    time: string;
  }