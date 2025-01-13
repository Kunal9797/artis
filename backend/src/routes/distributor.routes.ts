import { Router } from 'express';
import multer from 'multer';
import { importDistributors, getAllDistributors, createTestDistributor, deleteAllDistributors } from '../controllers/distributor.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', getAllDistributors);
router.get('/test', createTestDistributor);
router.post('/import', upload.single('file'), importDistributors);
router.delete('/', deleteAllDistributors);

export default router; 