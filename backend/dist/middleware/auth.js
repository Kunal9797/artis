"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesOrAdminAuth = exports.performanceAuth = exports.salesExecutiveAuth = exports.zonalHeadAuth = exports.countryHeadAuth = exports.hierarchicalAuth = exports.salesAuth = exports.adminAuth = exports.auth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const SalesTeam_1 = __importDefault(require("../models/SalesTeam"));
// Base authentication middleware
const auth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
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
    }
    catch (error) {
        console.error('Error in auth middleware:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});
exports.auth = auth;
// Role-specific middleware
const adminAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
});
exports.adminAuth = adminAuth;
// Sales hierarchy middleware
const salesAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const userRole = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === null || _b === void 0 ? void 0 : _b.toLowerCase();
    if (!userRole || !['sales_executive', 'zonal_head', 'country_head', 'admin'].includes(userRole)) {
        return res.status(403).json({ error: 'Sales team access required' });
    }
    next();
});
exports.salesAuth = salesAuth;
// Hierarchical access middleware
const checkHierarchicalAccess = (req, teamId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === 'admin')
        return true;
    const targetTeam = yield SalesTeam_1.default.findByPk(teamId, {
        include: [{
                model: SalesTeam_1.default,
                as: 'manager'
            }]
    });
    if (!targetTeam)
        return false;
    switch ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) {
        case 'COUNTRY_HEAD':
            // Verify if the user is actually a country head
            const countryHead = yield SalesTeam_1.default.findOne({
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
});
// Middleware for checking hierarchical access
const hierarchicalAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
    const hasAccess = yield checkHierarchicalAccess(req, teamId);
    if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
    }
    next();
});
exports.hierarchicalAuth = hierarchicalAuth;
// Role-specific middleware
const countryHeadAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const userRole = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === null || _b === void 0 ? void 0 : _b.toLowerCase();
    if (!userRole || !['country_head', 'admin'].includes(userRole)) {
        return res.status(403).json({ error: 'Country head access required' });
    }
    next();
});
exports.countryHeadAuth = countryHeadAuth;
const zonalHeadAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const userRole = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === null || _b === void 0 ? void 0 : _b.toLowerCase();
    if (!userRole || !['zonal_head', 'country_head', 'admin'].includes(userRole)) {
        return res.status(403).json({ error: 'Zonal head access required' });
    }
    next();
});
exports.zonalHeadAuth = zonalHeadAuth;
const salesExecutiveAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        console.log('\n=== salesExecutiveAuth Debug ===');
        const userRole = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === null || _b === void 0 ? void 0 : _b.toLowerCase();
        if (!userRole || !['sales_executive', 'zonal_head', 'country_head', 'admin'].includes(userRole)) {
            console.log('Invalid role:', userRole);
            return res.status(403).json({ error: 'Sales team access required' });
        }
        // Fetch the sales team data
        if (!req.user) {
            console.log('User object is undefined');
            return res.status(403).json({ error: 'User object is undefined' });
        }
        const salesTeam = yield SalesTeam_1.default.findOne({
            where: { userId: req.user.id }
        });
        console.log('Found sales team:', salesTeam === null || salesTeam === void 0 ? void 0 : salesTeam.toJSON());
        if (!salesTeam) {
            console.log('No sales team found for user:', req.user.id);
            return res.status(403).json({ error: 'Sales team not found' });
        }
        // Attach sales team to request
        req.salesTeam = salesTeam;
        console.log('Attached sales team to request');
        next();
    }
    catch (error) {
        console.error('Error in salesExecutiveAuth:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.salesExecutiveAuth = salesExecutiveAuth;
// Add this new middleware
const performanceAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const view = req.query.view;
    const userRole = (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === null || _b === void 0 ? void 0 : _b.toLowerCase();
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
});
exports.performanceAuth = performanceAuth;
// Add this new middleware
const salesOrAdminAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        console.log('\n=== salesOrAdminAuth Debug START ===');
        console.log('Request path:', req.path);
        console.log('Request method:', req.method);
        console.log('Request user:', {
            id: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
            role: (_b = req.user) === null || _b === void 0 ? void 0 : _b.role,
            originalRole: (_c = req.user) === null || _c === void 0 ? void 0 : _c.role
        });
        if (!req.user) {
            console.log('No user object found in salesOrAdminAuth');
            return res.status(401).json({ error: 'Authentication required' });
        }
        const userRole = (_d = req.user.role) === null || _d === void 0 ? void 0 : _d.toLowerCase();
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
        const salesTeam = yield SalesTeam_1.default.findOne({
            where: { userId: req.user.id }
        });
        console.log('Sales team query result:', (salesTeam === null || salesTeam === void 0 ? void 0 : salesTeam.id) || 'No team found');
        if (!salesTeam) {
            console.log('No sales team found for user in salesOrAdminAuth');
            return res.status(403).json({ error: 'Sales team access required' });
        }
        req.salesTeam = salesTeam;
        console.log('Sales team attached:', salesTeam.id);
        console.log('=== salesOrAdminAuth Debug END ===');
        next();
    }
    catch (error) {
        console.error('Error in salesOrAdminAuth:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.salesOrAdminAuth = salesOrAdminAuth;
