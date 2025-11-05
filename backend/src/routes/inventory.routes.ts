import { Router } from 'express';
import { upload } from '../middleware/upload';
import {
  getAllInventory,
  getInventory,
  createTransaction,
  getProductTransactions,
  clearInventory,
  getRecentTransactions,
  bulkUploadPurchaseOrder,
  getInventoryDetails,
  bulkUploadCorrections,
  bulkUploadInventory
} from '../controllers/inventory.controller';
import {
  getOperationsHistory,
  deleteOperation,
  getOperationDetails,
  clearAllOperations
} from '../controllers/bulkOperations.controller';
import { auth, adminAuth } from '../middleware/auth';

const router = Router();

// Inventory management
router.get('/', auth, getAllInventory);
router.get('/product/:productId', getInventory);
router.get('/details/:id', auth, getInventoryDetails);
router.get('/recent', auth, getRecentTransactions);
router.get('/transactions/:productId', auth, getProductTransactions);

// Add test endpoint
router.post('/bulk-test', auth, (req, res) => {
  console.log('Bulk test endpoint hit');
  res.json({ message: 'Test successful' });
});

// Bulk operations - Add auth middleware before adminAuth
router.post('/bulk', [auth, adminAuth], upload.single('file'), bulkUploadInventory);
router.post('/purchase', [auth, adminAuth], upload.single('file'), bulkUploadPurchaseOrder);
router.post('/corrections', [auth, adminAuth], upload.single('file'), bulkUploadCorrections);
router.delete('/clear', [auth, adminAuth], clearInventory);

// Individual transactions
router.post('/transaction', [auth, adminAuth], createTransaction);

// Bulk operations management
router.get('/operations', auth, getOperationsHistory);
router.get('/operations/:id', auth, getOperationDetails);
router.delete('/operations/:id', [auth, adminAuth], deleteOperation);
router.delete('/operations', [auth, adminAuth], clearAllOperations);

export default router; 