import { Router } from 'express';
import multer from 'multer';
import { importDistributors, getAllDistributors, createTestDistributor, deleteAllDistributors } from '../controllers/distributor.controller';
import { auth, adminAuth } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// View routes (both admin and user)
router.get('/', auth, getAllDistributors);

// Admin only routes
router.get('/test', adminAuth, createTestDistributor);
router.post('/import', adminAuth, upload.single('file'), importDistributors);
router.delete('/', adminAuth, deleteAllDistributors);

export default router; 