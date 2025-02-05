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
  deleteAllProducts
} from '../controllers/product.controller';
import { auth, adminAuth } from '../middleware/auth';

const router = Router();

// View routes (both admin and user)
router.get('/', auth, getAllProducts);
router.get('/:id', auth, getProduct);
router.get('/search/:query', auth, searchProducts);

// Modification routes (admin only)
router.post('/', adminAuth, createProduct);
router.put('/:id', adminAuth, updateProduct);
router.delete('/:id', adminAuth, deleteProduct);
router.post('/bulk', adminAuth, upload.single('file'), bulkCreateProducts);
router.delete('/all', adminAuth, deleteAllProducts);

export default router; 