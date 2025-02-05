import { Router } from 'express';
import { 
  register, 
  login, 
  getAllUsers, 
  updateUser, 
  deleteUser 
} from '../controllers/auth.controller';
import { adminAuth } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/login', login);

// Admin only routes
router.post('/register', adminAuth, register);
router.get('/users', adminAuth, getAllUsers);
router.put('/users/:userId', adminAuth, updateUser);
router.delete('/users/:userId', adminAuth, deleteUser);

export default router; 