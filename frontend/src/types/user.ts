export type UserRole = 'admin' | 'user';

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
  user: 'User'
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: '#d32f2f',
  user: '#1976d2'
};
