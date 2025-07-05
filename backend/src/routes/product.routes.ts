import { Router } from 'express';
import { upload } from '../middleware/upload';
import {
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkCreateProducts,
  searchProducts,
  deleteAllProducts,
  recoverProduct,
  getDeletedProducts
} from '../controllers/product.controller';
import { auth, adminAuth } from '../middleware/auth';

const router = Router();

// Special routes must come BEFORE parameter routes
router.delete('/delete-all', [auth, adminAuth], deleteAllProducts);
router.get('/search/:query', auth, searchProducts);
router.get('/deleted', [auth, adminAuth], getDeletedProducts);
router.post('/recover/:id', [auth, adminAuth], recoverProduct);

// View routes (both admin and user)
router.get('/', auth, getAllProducts);
router.get('/:id', auth, getProduct);

// Modification routes (admin only)
router.post('/', auth, adminAuth, createProduct);
router.put('/:id', auth, adminAuth, updateProduct);
router.delete('/:id', auth, adminAuth, deleteProduct);
router.post('/bulk', auth, adminAuth, upload.single('file'), bulkCreateProducts);

export default router; 