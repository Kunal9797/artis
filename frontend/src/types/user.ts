export type UserRole = 'admin' | 'user' | 'SALES_EXECUTIVE' | 'ZONAL_HEAD' | 'COUNTRY_HEAD';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
}

export interface UserFormData {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  user: 'User',
  SALES_EXECUTIVE: 'Sales Executive',
  ZONAL_HEAD: 'Zonal Head',
  COUNTRY_HEAD: 'Country Head'
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: '#d32f2f',
  user: '#1976d2',
  SALES_EXECUTIVE: '#2e7d32',
  ZONAL_HEAD: '#ed6c02',
  COUNTRY_HEAD: '#9c27b0'
};
