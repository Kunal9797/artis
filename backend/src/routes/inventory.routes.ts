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

const router = Router();

// Inventory management
router.get('/', getAllInventory);
router.get('/product/:productId', getInventory);
router.get('/details/:id', getInventoryDetails);
router.get('/transactions/recent', getRecentTransactions);
router.get('/transactions/:productId', getProductTransactions);

// Bulk operations
router.post('/upload', upload.single('file'), bulkUploadInventory);
router.post('/purchase-order/upload', upload.single('file'), bulkUploadPurchaseOrder);
router.post('/clear', clearInventory);

// Individual transactions
router.post('/transaction', createTransaction);

export default router; 