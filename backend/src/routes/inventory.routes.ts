import { Router } from 'express';
import { auth } from '../middleware/auth';
import multer from 'multer';
import {
  getAllInventory,
  createTransaction,
  getProductTransactions,
  bulkUploadInventory,
  clearInventory
} from '../controllers/inventory.controller';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Base inventory routes
router.get('/', auth, getAllInventory);
router.post('/transaction', auth, createTransaction);
router.get('/transactions/:productId', auth, getProductTransactions);

// Bulk upload route
router.post('/bulk', auth, upload.single('file'), bulkUploadInventory);

router.delete('/', auth, clearInventory);

export default router; 