"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upload_1 = require("../middleware/upload");
const sales_controller_1 = require("../controllers/sales.controller");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
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
router.get('/team/members', auth_1.salesOrAdminAuth, sales_controller_1.getTeamMembers);
router.get('/team/hierarchy', auth_1.auth, auth_1.salesAuth, sales_controller_1.getTeamHierarchy);
router.get('/team/all', auth_1.auth, auth_1.adminAuth, sales_controller_1.getAllSalesTeam);
// Team CRUD operations
router.post('/team', auth_1.salesOrAdminAuth, sales_controller_1.createSalesTeam);
router.get('/team/:id', auth_1.auth, auth_1.hierarchicalAuth, sales_controller_1.getSalesTeamDetails);
router.put('/team/:id', auth_1.salesOrAdminAuth, sales_controller_1.updateSalesTeam);
router.delete('/team/:id', auth_1.adminAuth, sales_controller_1.deleteSalesTeam);
// Dealer Visit Routes
router.post('/visits', auth_1.salesExecutiveAuth, upload_1.upload.single('photo'), sales_controller_1.recordDealerVisit);
router.get('/visits', auth_1.salesExecutiveAuth, sales_controller_1.getDealerVisits);
router.get('/teams/:teamId/visits', auth_1.salesAuth, sales_controller_1.getDealerVisits);
router.post('/visits/sync', auth_1.salesExecutiveAuth, sales_controller_1.syncOfflineVisits);
router.put('/visits/:id', auth_1.salesExecutiveAuth, sales_controller_1.updateDealerVisit);
router.delete('/visits/:id', auth_1.salesExecutiveAuth, sales_controller_1.deleteDealerVisit);
// Lead Management Routes
router.post('/leads', auth_1.salesOrAdminAuth, sales_controller_1.createLead);
router.get('/leads', auth_1.salesOrAdminAuth, sales_controller_1.getLeads);
router.get('/leads/:id', auth_1.salesOrAdminAuth, sales_controller_1.getLeadDetails);
router.put('/leads/:id', auth_1.salesOrAdminAuth, sales_controller_1.updateLead);
router.delete('/leads/:id', auth_1.salesOrAdminAuth, sales_controller_1.deleteLead);
router.put('/leads/:id/assign', auth_1.salesAuth, sales_controller_1.reassignLead);
router.post('/leads/:id/notes', auth_1.salesAuth, sales_controller_1.addLeadNote);
// Attendance Routes
router.post('/attendance', auth_1.salesExecutiveAuth, sales_controller_1.markAttendance);
router.get('/teams/:teamId/attendance', auth_1.zonalHeadAuth, sales_controller_1.getTeamAttendance);
router.get('/attendance/report', auth_1.countryHeadAuth, sales_controller_1.getAttendanceReport);
router.get('/attendance/status', auth_1.salesExecutiveAuth, sales_controller_1.getAttendanceStatus);
router.get('/attendance/history', auth_1.auth, auth_1.salesExecutiveAuth, sales_controller_1.getCurrentUserAttendance);
router.get('/attendance/team/:teamId', auth_1.auth, auth_1.adminAuth, sales_controller_1.getTeamAttendance);
// Messaging Routes
router.post('/messages', auth_1.salesAuth, sales_controller_1.sendMessage);
router.get('/messages', auth_1.salesAuth, sales_controller_1.getMessages);
router.put('/messages/:id/read', auth_1.salesAuth, sales_controller_1.markMessageRead);
// Analytics Routes
router.get('/reports/sales', auth_1.zonalHeadAuth, sales_controller_1.getSalesReport);
router.get('/reports/performance', auth_1.auth, auth_1.performanceAuth, sales_controller_1.getTeamPerformance);
router.get('/reports/visits', auth_1.zonalHeadAuth, sales_controller_1.getVisitMetrics);
exports.default = router;
