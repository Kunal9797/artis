import { Router } from 'express';
import { auth } from '../middleware/auth';
import multer from 'multer';
import { createDesignPaper } from '../controllers/designPaper.controller';
import { createLaminateSheet } from '../controllers/laminateSheet.controller';
import {
  getAllProducts,
  updateProduct,
  deleteProduct
} from '../controllers/base.controller';
import { bulkCreateProducts } from '../controllers/product.controller';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Base routes
router.get('/', auth, getAllProducts);
router.put('/:id', auth, updateProduct);
router.delete('/:id', auth, deleteProduct);

// Specific product type routes
router.post('/design-paper', auth, createDesignPaper);
router.post('/laminate', auth, createLaminateSheet);

// Bulk import
router.post('/bulk', auth, upload.single('file'), bulkCreateProducts);

export default router; 