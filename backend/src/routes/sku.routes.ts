import { Router } from 'express';
import { auth } from '../middleware/auth';
import {
  createSKU,
  getAllSKUs,
  getSKUById,
  updateSKU,
  deleteSKU
} from '../controllers/sku.controller';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { SKU } from '../models';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post('/', auth, createSKU);
router.get('/', auth, getAllSKUs);
router.get('/:id', auth, getSKUById);
router.put('/:id', auth, updateSKU);
router.delete('/:id', auth, deleteSKU);

// Bulk create route
router.post('/bulk', auth, upload.single('file'), async (req, res) => {
  try {
    const workbook = XLSX.read(req.file?.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    
    const skuData = (rawData as any[]).map(row => ({
      productId: row.productId,
      quantity: Number(row.quantity) || 0,
      minimumStock: row.minimumStock ? Number(row.minimumStock) : undefined,
      reorderPoint: row.reorderPoint ? Number(row.reorderPoint) : undefined
    }));

    await SKU.bulkCreate(skuData);
    res.status(201).json({ message: 'SKUs imported successfully' });
  } catch (error) {
    console.error('Bulk create error:', error);
    res.status(500).json({ error: 'Error importing SKUs. Please check your data format.' });
  }
});

export default router; 