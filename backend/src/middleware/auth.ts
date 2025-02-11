import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { UserRole } from '../models/User';
import SalesTeam from '../models/SalesTeam';

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
    console.log('\n=== Detailed Auth Debug ===');
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('1. Token:', token ? token.substring(0, 20) + '...' : 'Missing');

    const decoded = jwt.verify(token!, process.env.JWT_SECRET!) as JWTPayload;
    console.log('2. Decoded token:', {
      userId: decoded.id,
      role: decoded.role,
      exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'No expiration'
    });

    const user = await User.findByPk(decoded.id);
    console.log('3. User lookup:', user ? {
      id: user.id,
      role: user.role,
      exists: true
    } : 'Not found');

    if (!user) {
      throw new Error('User not found');
    }

    req.user = decoded;
    console.log('4. User role check:', ['SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD'].includes(decoded.role));

    if (['SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD'].includes(decoded.role)) {
      console.log('5. Looking up sales team for userId:', decoded.id);
      const salesTeam = await SalesTeam.findOne({ 
        where: { userId: decoded.id },
        include: [{
          model: SalesTeam,
          as: 'manager'
        }]
      });
      
      console.log('6. SalesTeam lookup result:', salesTeam ? {
        id: salesTeam.id,
        userId: salesTeam.userId,
        role: salesTeam.role,
        exists: true,
        managerInfo: salesTeam.getManager ? await salesTeam.getManager() : null
      } : 'Not found');

      if (!salesTeam) {
        throw new Error('Sales team member not found');
      }
      req.salesTeam = salesTeam;
    }

    console.log('7. Auth successful');
    next();
  } catch (error: any) {
    console.error('\n=== Auth Error ===');
    console.error('Error type:', error?.constructor?.name || 'Unknown');
    console.error('Error message:', error?.message || 'Unknown error');
    console.error('Stack:', error?.stack || 'No stack trace');
    console.error('JWT Secret exists:', !!process.env.JWT_SECRET);
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

// Add this new middleware
export const performanceAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const view = req.query.view as string;
  
  switch (view) {
    case 'personal':
      // Allow all sales roles to access their own data
      if (!['SALES_EXECUTIVE', 'ZONAL_HEAD', 'COUNTRY_HEAD'].includes(req.user?.role!)) {
        return res.status(403).json({ error: 'Sales team access required' });
      }
      break;
      
    case 'zone':
      // Only allow zonal head and above
      if (!['ZONAL_HEAD', 'COUNTRY_HEAD', 'admin'].includes(req.user?.role!)) {
        return res.status(403).json({ error: 'Zonal head access required' });
      }
      break;
      
    case 'country':
      // Only allow country head and admin
      if (!['COUNTRY_HEAD', 'admin'].includes(req.user?.role!)) {
        return res.status(403).json({ error: 'Country head access required' });
      }
      break;
      
    default:
      return res.status(400).json({ error: 'Invalid view parameter' });
  }
  
  next();
}; 