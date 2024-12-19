import { Request, Response } from 'express';
import { SKU } from '../models';
import sequelize from '../config/database';
import { InventoryType, MeasurementUnit } from '../models/SKU';

export const createSKU = async (req: Request, res: Response) => {
  try {
    // Validate required fields
    const { code, name, category, inventoryType, measurementUnit } = req.body;
    
    if (!code || !name || !category || !inventoryType || !measurementUnit) {
      return res.status(400).json({ 
        error: 'Missing required fields: code, name, category, inventoryType, and measurementUnit are required' 
      });
    }

    // Check if SKU with same code already exists
    const existingSKU = await SKU.findOne({ where: { code } });
    if (existingSKU) {
      return res.status(400).json({ error: 'SKU with this code already exists' });
    }

    // Transform and validate the data
    const skuData = {
      code: String(code),
      name: String(name),
      description: req.body.description ? String(req.body.description) : '',
      category: String(category),
      inventoryType: inventoryType as InventoryType,
      measurementUnit: measurementUnit as MeasurementUnit,
      quantity: Number(req.body.quantity) || 0,
      minimumStock: req.body.minimumStock ? Number(req.body.minimumStock) : undefined,
      reorderPoint: req.body.reorderPoint ? Number(req.body.reorderPoint) : undefined
    };

    const sku = await SKU.create(skuData);
    res.status(201).json(sku);
  } catch (error) {
    console.error('Error creating SKU:', error);
    res.status(500).json({ error: 'Error creating SKU. Please check your input data.' });
  }
};

export const getAllSKUs = async (req: Request, res: Response) => {
  try {
    const skus = await SKU.findAll();
    res.json(skus);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching SKUs' });
  }
};

export const getSKUById = async (req: Request, res: Response) => {
  try {
    const sku = await SKU.findByPk(req.params.id);
    if (!sku) {
      return res.status(404).json({ error: 'SKU not found' });
    }
    res.json(sku);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching SKU' });
  }
};

export const updateSKU = async (req: Request, res: Response) => {
  try {
    const sku = await SKU.findByPk(req.params.id);
    if (!sku) {
      return res.status(404).json({ error: 'SKU not found' });
    }
    await sku.update(req.body);
    res.json(sku);
  } catch (error) {
    res.status(500).json({ error: 'Error updating SKU' });
  }
};

export const deleteSKU = async (req: Request, res: Response) => {
  try {
    const sku = await SKU.findByPk(req.params.id);
    if (!sku) {
      return res.status(404).json({ error: 'SKU not found' });
    }
    await sku.destroy();
    res.json({ message: 'SKU deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting SKU' });
  }
};

export const bulkCreateSKUs = async (req: Request, res: Response) => {
  const t = await sequelize.transaction();
  
  try {
    const { skus } = req.body;
    const createdSKUs = await SKU.bulkCreate(skus.map((sku: any) => ({
      code: sku.code,
      name: sku.name,
      description: sku.description,
      category: sku.category,
      inventoryType: sku.inventoryType,
      measurementUnit: sku.measurementUnit,
      quantity: sku.quantity || 0,
      minimumStock: sku.minimumStock,
      reorderPoint: sku.reorderPoint
    })), { transaction: t });

    await t.commit();
    res.status(201).json(createdSKUs);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: 'Error creating SKUs in bulk' });
  }
}; 