import { Router } from 'express';
import { auth } from '../middleware/auth';
import multer from 'multer';
import {
  getAllInventory,
  createTransaction,
  getProductTransactions,
  bulkUploadInventory,
  bulkUploadPurchaseOrder,
  clearInventory,
  getInventoryReport,
  getRecentTransactions,
  getInventoryByProduct,
  getInventoryDetails
} from '../controllers/inventory.controller';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Base inventory routes
router.get('/', auth, getAllInventory);
router.post('/transaction', auth, createTransaction);
router.get('/transactions/:productId', auth, getProductTransactions);
router.get('/transactions', auth, getRecentTransactions);
router.get('/report', auth, getInventoryReport);
router.post('/bulk-upload', auth, upload.single('file'), bulkUploadInventory);
router.post('/purchase-order', auth, upload.single('file'), bulkUploadPurchaseOrder);
router.delete('/', auth, clearInventory);
router.get('/product/:productId', auth, getInventoryByProduct);
router.get('/:id/details', getInventoryDetails);

export default router; 