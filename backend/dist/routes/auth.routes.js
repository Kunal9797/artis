"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_1 = require("../middleware/auth");
const auth_2 = require("../middleware/auth");
/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 *
 * /api/auth/login:
 *   post:
 *     summary: Login to the application
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: example@artis.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: example123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 *
 * /api/auth/register:
 *   post:
 *     summary: Register a new user (Admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - role
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               role:
 *                 type: string
 *                 enum: [admin, user]
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Email already registered
 *       401:
 *         description: Unauthorized
 */
const router = (0, express_1.Router)();
// Public routes
router.post('/login', auth_controller_1.login);
// Admin only routes
router.get('/users', auth_2.auth, auth_1.adminAuth, auth_controller_1.getAllUsers);
router.post('/register', auth_2.auth, auth_1.adminAuth, auth_controller_1.register);
router.post('/register-with-sales-team', auth_2.auth, auth_1.adminAuth, auth_controller_1.registerWithSalesTeam);
router.put('/users/:userId', auth_2.auth, auth_1.adminAuth, auth_controller_1.updateUser);
router.delete('/users/:userId', auth_2.auth, auth_1.adminAuth, auth_controller_1.deleteUser);
router.put('/users/:userId/with-sales-team', auth_2.auth, auth_1.adminAuth, auth_controller_1.updateUserWithSalesTeam);
router.get('/sales-team-members', auth_2.auth, auth_controller_1.getSalesTeamMembers);
exports.default = router;
