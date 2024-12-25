import { Router } from 'express';
import { auth } from '../middleware/auth';
import multer from 'multer';
import * as inventoryController from '../controllers/inventory.controller';
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
router.get('/transactions', auth, inventoryController.getRecentTransactions);
// Bulk upload route
router.post('/bulk-upload', auth, upload.single('file'), bulkUploadInventory);

router.delete('/', auth, clearInventory);

router.get('/product/:id', auth, inventoryController.getProductInventory);

export default router; 