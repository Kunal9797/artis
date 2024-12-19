import { Router } from 'express';
import { auth } from '../middleware/auth';
import {
  createSKU,
  getAllSKUs,
  getSKUById,
  updateSKU,
  deleteSKU,
  bulkCreateSKUs
} from '../controllers/sku.controller';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { SKU } from '../models';
import { InventoryType, MeasurementUnit } from '../models/SKU';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.post('/', auth, createSKU);
router.get('/', auth, getAllSKUs);
router.get('/:id', auth, getSKUById);
router.put('/:id', auth, updateSKU);
router.delete('/:id', auth, deleteSKU);
router.post('/bulk', auth, upload.single('file'), async (req, res) => {
  try {
    const workbook = XLSX.read(req.file?.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    
    // Transform and validate the data
    const skuData = (rawData as any[]).map(row => {
      if (!row.code || !row.name || !row.category || !row.inventoryType || !row.measurementUnit) {
        throw new Error('Missing required fields');
      }

      return {
        code: String(row.code),
        name: String(row.name),
        description: row.description ? String(row.description) : '',
        category: String(row.category),
        inventoryType: row.inventoryType as InventoryType,
        measurementUnit: row.measurementUnit as MeasurementUnit,
        quantity: Number(row.quantity) || 0,
        minimumStock: row.minimumStock ? Number(row.minimumStock) : undefined,
        reorderPoint: row.reorderPoint ? Number(row.reorderPoint) : undefined
      };
    });

    await SKU.bulkCreate(skuData);
    res.status(201).json({ message: 'SKUs imported successfully' });
  } catch (error) {
    console.error('Bulk create error:', error);
    res.status(500).json({ error: 'Error importing SKUs. Please check your data format.' });
  }
});

export default router; 