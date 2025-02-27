import { Router } from 'express';
import { upload } from '../middleware/upload';
import {
  // Team management
  createSalesTeam,
  getSalesTeamDetails,
  updateSalesTeam,
  deleteSalesTeam,
  getTeamHierarchy,
  getAllSalesTeam,
  
  // Dealer visits
  recordDealerVisit,
  getDealerVisits,
  syncOfflineVisits,
  updateDealerVisit,
  deleteDealerVisit,
  
  // Lead management
  createLead,
  updateLead,
  reassignLead,
  getLeads,
  getLeadDetails,
  deleteLead,
  addLeadNote,
  
  // Attendance
  markAttendance,
  getTeamAttendance,
  getAttendanceReport,
  getCurrentUserAttendance,
  
  // Messaging
  sendMessage,
  getMessages,
  markMessageRead,
  
  // Analytics
  getSalesReport,
  getTeamPerformance,
  getVisitMetrics,
  getTeamMembers,
  getAttendanceStatus,
} from '../controllers/sales.controller';

import {
  auth,
  adminAuth,
  salesAuth,
  countryHeadAuth,
  zonalHeadAuth,
  salesExecutiveAuth,
  performanceAuth,
  hierarchicalAuth,
  salesOrAdminAuth,
} from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     SalesTeam:
 *       type: object
 *       required:
 *         - userId
 *         - role
 *         - territory
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         userId:
 *           type: string
 *           format: uuid
 *         role:
 *           type: string
 *           enum: [SALES_EXECUTIVE, ZONAL_HEAD, COUNTRY_HEAD]
 *         territory:
 *           type: string
 *         reportingTo:
 *           type: string
 *           format: uuid
 *         targetQuarter:
 *           type: integer
 *           minimum: 1
 *           maximum: 4
 *         targetYear:
 *           type: integer
 *         targetAmount:
 *           type: number
 *           format: float
 */

/**
 * @swagger
 * /api/sales/teams:
 *   post:
 *     summary: Create a new sales team member
 *     tags: [Sales Team]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - territory
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the sales team member
 *               phone:
 *                 type: string
 *                 description: Phone number
 *               territory:
 *                 type: string
 *                 description: Assigned territory
 *     responses:
 *       201:
 *         description: Sales team member created successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 * 
 * /api/sales/teams/{id}:
 *   get:
 *     summary: Get sales team member details
 *     tags: [Sales Team]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Sales team member ID
 *     responses:
 *       200:
 *         description: Sales team member details
 *       404:
 *         description: Member not found
 */

// Team Management Routes - Order matters! Most specific first
router.get('/team/members', salesOrAdminAuth, getTeamMembers);
router.get('/team/hierarchy', auth, salesAuth, getTeamHierarchy);
router.get('/team/all', auth, adminAuth, getAllSalesTeam);

// Team CRUD operations
router.post('/team', salesOrAdminAuth, createSalesTeam);
router.get('/team/:id', auth, hierarchicalAuth, getSalesTeamDetails);
router.put('/team/:id', salesOrAdminAuth, updateSalesTeam);
router.delete('/team/:id', adminAuth, deleteSalesTeam);

// Dealer Visit Routes
router.post('/visits', salesExecutiveAuth, upload.single('photo'), recordDealerVisit);
router.get('/visits', salesExecutiveAuth, getDealerVisits);
router.get('/teams/:teamId/visits', salesAuth, getDealerVisits);
router.post('/visits/sync', salesExecutiveAuth, syncOfflineVisits);
router.put('/visits/:id', salesExecutiveAuth, updateDealerVisit);
router.delete('/visits/:id', salesExecutiveAuth, deleteDealerVisit);

// Lead Management Routes
router.post('/leads', salesOrAdminAuth, createLead);
router.get('/leads', salesOrAdminAuth, getLeads);
router.get('/leads/:id', salesOrAdminAuth, getLeadDetails);
router.put('/leads/:id', salesOrAdminAuth, updateLead);
router.delete('/leads/:id', salesOrAdminAuth, deleteLead);
router.put('/leads/:id/assign', salesAuth, reassignLead);
router.post('/leads/:id/notes', salesAuth, addLeadNote);

// Attendance Routes
router.post('/attendance', salesExecutiveAuth, markAttendance);
router.get('/teams/:teamId/attendance', zonalHeadAuth, getTeamAttendance);
router.get('/attendance/report', countryHeadAuth, getAttendanceReport);
router.get('/attendance/status', salesExecutiveAuth, getAttendanceStatus);
router.get('/attendance/history', auth, salesExecutiveAuth, getCurrentUserAttendance);
router.get('/attendance/team/:teamId', auth, adminAuth, getTeamAttendance);

// Messaging Routes
router.post('/messages', salesAuth, sendMessage);
router.get('/messages', salesAuth, getMessages);
router.put('/messages/:id/read', salesAuth, markMessageRead);

// Analytics Routes
router.get('/reports/sales', zonalHeadAuth, getSalesReport);
router.get('/reports/performance', auth, performanceAuth, getTeamPerformance);
router.get('/reports/visits', zonalHeadAuth, getVisitMetrics);

export default router; 