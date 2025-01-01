import { Router } from 'express';
import { auth } from '../middleware/auth';
import multer from 'multer';
import {
  getAllProducts,
  updateProduct,
  deleteProduct
} from '../controllers/base.controller';
import { createProduct, bulkCreateProducts, getProductByArtisCode } from '../controllers/product.controller';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Base routes
router.get('/', auth, getAllProducts);
router.post('/', auth, createProduct);
router.put('/:id', auth, updateProduct);
router.delete('/:id', auth, deleteProduct);

// Bulk import
router.post('/bulk', auth, upload.single('file'), bulkCreateProducts);

router.get('/by-artis-code/:artisCode', getProductByArtisCode);

export default router; 