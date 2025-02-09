import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { UserRole } from '../models/User';
import SalesTeam from '../models/SalesTeam';

// Enhanced interface for JWT payload
interface JWTPayload {
  id: string;
  role: UserRole;
  salesTeamId?: string;
}

// Enhanced request interface
interface AuthRequest extends Request {
  user?: JWTPayload;
  salesTeam?: any;
}

// Base authentication middleware
export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log('=== Auth Middleware Start ===');
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('Received Authorization header:', req.header('Authorization'));
    console.log('JWT_SECRET:', process.env.JWT_SECRET);
    
    if (!token) {
      console.log('No token found');
      throw new Error('Authentication required');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    console.log('Decoded token:', {
      userId: decoded.id,
      role: decoded.role
    });
    
    const user = await User.findByPk(decoded.id);
    console.log('Found user:', user ? `${user.id} (${user.role})` : 'No user found');
    
    if (!user) {
      throw new Error('User not found');
    }

    req.user = decoded;

    // If user is sales team member, attach sales team info
    if (['SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD'].includes(decoded.role)) {
      const salesTeam = await SalesTeam.findOne({ 
        where: { userId: decoded.id },
        include: [{
          model: SalesTeam,
          as: 'manager'
        }]
      });
      
      if (!salesTeam) {
        throw new Error('Sales team member not found');
      }
      req.salesTeam = salesTeam;
    }

    console.log('=== Auth Middleware End ===');
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Please authenticate' });
  }
};

// Role-specific middleware
export const adminAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  console.log('=== Admin Auth Middleware ===');
  if (!req.user) {
    console.log('No user object found in request');
    return res.status(403).json({ error: 'Authentication required' });
  }
  
  console.log('User from request:', req.user);
  console.log('User role:', req.user.role);
  
  if (req.user.role !== 'admin') {
    console.log('Access denied - Not admin role');
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  console.log('Admin access granted');
  next();
};

// Sales hierarchy middleware
export const salesAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!['SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD', 'admin'].includes(req.user?.role!)) {
    return res.status(403).json({ error: 'Sales team access required' });
  }
  next();
};

// Hierarchical access middleware
const checkHierarchicalAccess = async (req: AuthRequest, teamId: string): Promise<boolean> => {
  if (req.user?.role === 'admin') return true;
  
  const targetTeam = await SalesTeam.findByPk(teamId, {
    include: [{
      model: SalesTeam,
      as: 'manager'
    }]
  });
  
  if (!targetTeam) return false;

  switch (req.user?.role) {
    case 'COUNTRY_HEAD':
      // Verify if the user is actually a country head
      const countryHead = await SalesTeam.findOne({
        where: { 
          userId: req.user.id,
          role: 'COUNTRY_HEAD'
        }
      });
      return !!countryHead;
      
    case 'ZONAL_HEAD':
      // Check if target is under this zonal head
      return targetTeam.reportingTo === req.salesTeam.id;
      
    case 'SALES_EXECUTIVE':
      // Sales executive can only access their own data
      return teamId === req.salesTeam.id;
      
    default:
      return false;
  }
};

// Middleware for checking hierarchical access
export const hierarchicalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const teamId = req.params.teamId || req.body.teamId;
  
  if (!teamId) {
    return res.status(400).json({ error: 'Team ID required' });
  }

  const hasAccess = await checkHierarchicalAccess(req, teamId);
  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied' });
  }

  next();
};

// Role-specific middleware
export const countryHeadAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!['COUNTRY_HEAD', 'admin'].includes(req.user?.role!)) {
    return res.status(403).json({ error: 'Country head access required' });
  }
  next();
};

export const zonalHeadAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!['ZONAL_HEAD', 'COUNTRY_HEAD', 'admin'].includes(req.user?.role!)) {
    return res.status(403).json({ error: 'Zonal head access required' });
  }
  next();
};

export const salesExecutiveAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!['SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD', 'admin'].includes(req.user?.role!)) {
    return res.status(403).json({ error: 'Sales executive access required' });
  }
  next();
}; 