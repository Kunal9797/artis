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
  
  // Attendance
  markAttendance,
  getTeamAttendance,
  getAttendanceReport,
  
  // Messaging
  sendMessage,
  getMessages,
  markMessageRead,
  
  // Analytics
  getSalesReport,
  getTeamPerformance,
  getVisitMetrics,
  getTeamMembers,
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

// Team Management Routes
router.get('/team/all', auth, adminAuth, getAllSalesTeam);
router.post('/team', auth, adminAuth, createSalesTeam);
router.put('/team/:id', auth, salesAuth, updateSalesTeam);
router.delete('/team/:id', auth, adminAuth, deleteSalesTeam);
router.get('/team/:id', auth, hierarchicalAuth, getSalesTeamDetails);
router.get('/team/hierarchy', auth, salesAuth, getTeamHierarchy);
router.get('/team/members/:role', auth, salesAuth, getTeamMembers);

// Dealer Visit Routes
router.post('/visits', salesExecutiveAuth, upload.single('photo'), recordDealerVisit);
router.get('/teams/:teamId/visits', salesAuth, getDealerVisits);
router.post('/visits/sync', salesExecutiveAuth, syncOfflineVisits);
router.put('/visits/:id', salesExecutiveAuth, updateDealerVisit);
router.delete('/visits/:id', salesExecutiveAuth, deleteDealerVisit);

// Lead Management Routes
router.post('/leads', salesAuth, createLead);
router.put('/leads/:id', salesAuth, updateLead);
router.put('/leads/:id/reassign', zonalHeadAuth, reassignLead);
router.get('/teams/:teamId/leads', salesAuth, getLeads);
router.get('/leads/:id', salesAuth, getLeadDetails);

// Attendance Routes
router.post('/attendance', salesExecutiveAuth, markAttendance);
router.get('/teams/:teamId/attendance', zonalHeadAuth, getTeamAttendance);
router.get('/attendance/report', countryHeadAuth, getAttendanceReport);

// Messaging Routes
router.post('/messages', salesAuth, sendMessage);
router.get('/messages', salesAuth, getMessages);
router.put('/messages/:id/read', salesAuth, markMessageRead);

// Analytics Routes
router.get('/reports/sales', zonalHeadAuth, getSalesReport);
router.get('/reports/performance', auth, performanceAuth, getTeamPerformance);
router.get('/reports/visits', zonalHeadAuth, getVisitMetrics);

export default router; 