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

const router = Router();

// Basic CRUD routes
router.get('/', getAllProducts);
router.get('/:id', getProduct);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

// Bulk operations
router.post('/bulk', upload.single('file'), bulkCreateProducts);

// Search
router.get('/search/:query', searchProducts);

// Delete all products
router.delete('/all', deleteAllProducts);

export default router; 