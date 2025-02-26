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
    console.log('\n=== Base Auth Debug ===');
    const authHeader = req.header('Authorization');
    console.log('Auth Header:', authHeader);
    
    if (!authHeader) {
      console.log('No auth header found');
      return res.status(401).json({ error: 'No auth token' });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token found:', token.substring(0, 20) + '...');

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as JWTPayload;
    console.log('Decoded token:', {
      id: decoded.id,
      role: decoded.role,
      exp: decoded.exp
    });

    req.user = decoded;
    console.log('User attached to request:', {
      id: req.user.id,
      role: req.user.role
    });
    
    next();
  } catch (error) {
    console.error('Error in auth middleware:', error);
    res.status(401).json({ error: 'Invalid token' });
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
  console.log('\n=== hierarchicalAuth Debug ===');
  console.log('Request path:', req.path);
  console.log('Request method:', req.method);
  console.log('Request params:', req.params);
  console.log('Request query:', req.query);
  console.log('Request body:', req.body);
  
  const teamId = req.params.teamId || req.body.teamId;
  console.log('Team ID from request:', teamId);
  
  if (!teamId) {
    console.log('No team ID found in request - sending 400');
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
    console.log('\n=== salesExecutiveAuth Debug ===');
    const userRole = req.user?.role?.toLowerCase();
    
    if (!userRole || !['sales_executive', 'zonal_head', 'country_head', 'admin'].includes(userRole)) {
      console.log('Invalid role:', userRole);
      return res.status(403).json({ error: 'Sales team access required' });
    }

    // Fetch the sales team data
    if (!req.user) {
      console.log('User object is undefined');
      return res.status(403).json({ error: 'User object is undefined' });
    }
    const salesTeam = await SalesTeam.findOne({
      where: { userId: req.user.id }
    });

    console.log('Found sales team:', salesTeam?.toJSON());

    if (!salesTeam) {
      console.log('No sales team found for user:', req.user.id);
      return res.status(403).json({ error: 'Sales team not found' });
    }

    // Attach sales team to request
    req.salesTeam = salesTeam;
    console.log('Attached sales team to request');
    
    next();
  } catch (error) {
    console.error('Error in salesExecutiveAuth:', error);
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
    console.log('\n=== salesOrAdminAuth Debug START ===');
    console.log('Request path:', req.path);
    console.log('Request method:', req.method);
    console.log('Request user:', {
      id: req.user?.id,
      role: req.user?.role,
      originalRole: req.user?.role
    });

    if (!req.user) {
      console.log('No user object found in salesOrAdminAuth');
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role?.toLowerCase();
    console.log('User role after toLowerCase:', userRole);
    
    if (userRole === 'admin') {
      console.log('Admin access granted in salesOrAdminAuth');
      return next();
    }

    console.log('Not admin, checking sales roles...');
    const salesRoles = ['sales_executive', 'zonal_head', 'country_head'];
    if (!salesRoles.includes(userRole)) {
      console.log('Invalid role in salesOrAdminAuth:', userRole);
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    console.log('Valid sales role, checking team...');
    const salesTeam = await SalesTeam.findOne({
      where: { userId: req.user.id }
    });

    console.log('Sales team query result:', salesTeam?.id || 'No team found');

    if (!salesTeam) {
      console.log('No sales team found for user in salesOrAdminAuth');
      return res.status(403).json({ error: 'Sales team access required' });
    }

    req.salesTeam = salesTeam;
    console.log('Sales team attached:', salesTeam.id);
    console.log('=== salesOrAdminAuth Debug END ===');
    next();
  } catch (error) {
    console.error('Error in salesOrAdminAuth:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 