import { Router } from 'express';
import { 
  register, 
  login, 
  getAllUsers, 
  updateUser, 
  deleteUser,
  registerWithSalesTeam,
  updateUserWithSalesTeam,
  getSalesTeamMembers
} from '../controllers/auth.controller';
import { adminAuth } from '../middleware/auth';
import { auth } from '../middleware/auth';

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

const router = Router();

// Public routes
router.post('/login', login);

// Admin only routes
router.get('/users', auth, adminAuth, getAllUsers);
router.post('/register', auth, adminAuth, register);
router.post('/register-with-sales-team', auth, adminAuth, registerWithSalesTeam);
router.put('/users/:userId', auth, adminAuth, updateUser);
router.delete('/users/:userId', auth, adminAuth, deleteUser);
router.put('/users/:userId/with-sales-team', auth, adminAuth, updateUserWithSalesTeam);
router.get('/sales-team-members', auth, getSalesTeamMembers);

export default router; 