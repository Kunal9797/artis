import { Router } from 'express';
import { upload } from '../middleware/upload';
import {
  getAllInventory,
  getInventory,
  createTransaction,
  getProductTransactions,
  bulkUploadInventory,
  clearInventory,
  getRecentTransactions,
  bulkUploadPurchaseOrder,
  getInventoryDetails
} from '../controllers/inventory.controller';
import { auth, adminAuth } from '../middleware/auth';

const router = Router();

// Inventory management
router.get('/', auth, getAllInventory);
router.get('/product/:productId', getInventory);
router.get('/details/:id', auth, getInventoryDetails);
router.get('/recent', auth, getRecentTransactions);
router.get('/transactions/:productId', auth, getProductTransactions);

// Bulk operations - Add auth middleware before adminAuth
router.post('/bulk', [auth, adminAuth], upload.single('file'), bulkUploadInventory);
router.post('/purchase', [auth, adminAuth], upload.single('file'), bulkUploadPurchaseOrder);
router.delete('/clear', [auth, adminAuth], clearInventory);

// Individual transactions
router.post('/transaction', [auth, adminAuth], createTransaction);

export default router; 