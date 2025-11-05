import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { UserRole } from '../models/User';

// Enhanced interface for JWT payload
interface JWTPayload {
  id: string;
  role: UserRole;
  exp?: number;
  iat?: number;
  version?: number;
}

// Enhanced request interface
interface AuthRequest extends Request {
  user?: JWTPayload;
  salesTeam?: any;
}

// Base authentication middleware
export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      // No auth header found
      return res.status(401).json({ error: 'No auth token' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as JWTPayload;

    req.user = decoded;
    
    next();
  } catch (error) {
    // Invalid token
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-specific middleware
export const adminAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(403).json({ error: 'Authentication required' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  // Admin access granted
  next();
};

// Sales hierarchy middleware - removed (sales functionality no longer needed)
export const salesAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  return res.status(403).json({ error: 'Sales functionality removed' });
};

// Hierarchical access middleware removed - sales functionality no longer needed
// const checkHierarchicalAccess = ...removed...

// Middleware for checking hierarchical access - removed (sales functionality no longer needed)
export const hierarchicalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  return res.status(403).json({ error: 'Sales functionality removed' });
};

// Sales role-specific middleware - all removed (sales functionality no longer needed)
export const countryHeadAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  return res.status(403).json({ error: 'Sales functionality removed' });
};

export const zonalHeadAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  return res.status(403).json({ error: 'Sales functionality removed' });
};

export const salesExecutiveAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  return res.status(403).json({ error: 'Sales functionality removed' });
};

export const performanceAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  return res.status(403).json({ error: 'Sales functionality removed' });
};

export const salesOrAdminAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  return res.status(403).json({ error: 'Sales functionality removed' });
}; 