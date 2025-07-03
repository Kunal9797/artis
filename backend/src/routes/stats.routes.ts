import { Router } from 'express';
import { getDashboardStats, getSupplierStats, getCategoryStats } from '../controllers/stats.controller';
import { auth } from '../middleware/auth';

const router = Router();

// Dashboard statistics endpoints using database views
router.get('/dashboard', auth, getDashboardStats);
router.get('/suppliers', auth, getSupplierStats);
router.get('/categories', auth, getCategoryStats);

export default router;