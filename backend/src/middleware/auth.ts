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

// Sales hierarchy middleware
export const salesAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userRole = req.user?.role?.toLowerCase();
  if (!userRole || !['sales_executive', 'zonal_head', 'country_head', 'admin'].includes(userRole)) {
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
    // No team ID found in request
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
  const userRole = req.user?.role?.toLowerCase();
  if (!userRole || !['country_head', 'admin'].includes(userRole)) {
    return res.status(403).json({ error: 'Country head access required' });
  }
  next();
};

export const zonalHeadAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userRole = req.user?.role?.toLowerCase();
  if (!userRole || !['zonal_head', 'country_head', 'admin'].includes(userRole)) {
    return res.status(403).json({ error: 'Zonal head access required' });
  }
  next();
};

export const salesExecutiveAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userRole = req.user?.role?.toLowerCase();
    
    if (!userRole || !['sales_executive', 'zonal_head', 'country_head', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Sales team access required' });
    }

    // Fetch the sales team data
    if (!req.user) {
      // User object is undefined
      return res.status(403).json({ error: 'User object is undefined' });
    }
    const salesTeam = await SalesTeam.findOne({
      where: { userId: req.user.id }
    });

    if (!salesTeam) {
      return res.status(403).json({ error: 'Sales team not found' });
    }

    // Attach sales team to request
    req.salesTeam = salesTeam;
    
    next();
  } catch (error) {
    // Error in salesExecutiveAuth
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add this new middleware
export const performanceAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const view = req.query.view as string;
  const userRole = req.user?.role?.toLowerCase();
  
  switch (view) {
    case 'personal':
      // Allow all sales roles to access their own data
      if (!userRole || !['sales_executive', 'zonal_head', 'country_head'].includes(userRole)) {
        return res.status(403).json({ error: 'Sales team access required' });
      }
      break;
      
    case 'zone':
      // Only allow zonal head and above
      if (!userRole || !['zonal_head', 'country_head', 'admin'].includes(userRole)) {
        return res.status(403).json({ error: 'Zonal head access required' });
      }
      break;
      
    case 'country':
      // Only allow country head and admin
      if (!userRole || !['country_head', 'admin'].includes(userRole)) {
        return res.status(403).json({ error: 'Country head access required' });
      }
      break;
      
    default:
      return res.status(400).json({ error: 'Invalid view parameter' });
  }
  
  next();
};

// Add this new middleware
export const salesOrAdminAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role?.toLowerCase();
    
    if (userRole === 'admin') {
      return next();
    }

    const salesRoles = ['sales_executive', 'zonal_head', 'country_head'];
    if (!salesRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const salesTeam = await SalesTeam.findOne({
      where: { userId: req.user.id }
    });

    if (!salesTeam) {
      return res.status(403).json({ error: 'Sales team access required' });
    }

    req.salesTeam = salesTeam;
    next();
  } catch (error) {
    // Error in salesOrAdminAuth
    res.status(500).json({ error: 'Internal server error' });
  }
}; 