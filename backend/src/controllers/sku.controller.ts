import { Request, Response } from 'express';
import { SKU, Product } from '../models';
import sequelize from '../config/database';

export const getAllSKUs = async (req: Request, res: Response) => {
  try {
    const skus = await SKU.findAll({
      include: [{
        model: Product,
        as: 'product'
      }]
    });
    res.json(skus);
  } catch (error) {
    console.error('Error fetching SKUs:', error);
    res.status(500).json({ error: 'Error fetching SKUs' });
  }
};

export const createSKU = async (req: Request, res: Response) => {
  try {
    const { productId, quantity, minimumStock, reorderPoint } = req.body;
    
    // Verify product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const sku = await SKU.create({
      productId,
      quantity,
      minimumStock,
      reorderPoint
    });

    const skuWithProduct = await SKU.findByPk(sku.id, {
      include: [{
        model: Product,
        as: 'product'
      }]
    });

    res.status(201).json(skuWithProduct);
  } catch (error) {
    console.error('Error creating SKU:', error);
    res.status(500).json({ error: 'Error creating SKU' });
  }
};

export const updateSKU = async (req: Request, res: Response) => {
  try {
    const sku = await SKU.findByPk(req.params.id);
    if (!sku) {
      return res.status(404).json({ error: 'SKU not found' });
    }

    if (req.body.productId) {
      const product = await Product.findByPk(req.body.productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
    }

    await sku.update(req.body);

    const updatedSku = await SKU.findByPk(sku.id, {
      include: [{
        model: Product,
        as: 'product'
      }]
    });

    res.json(updatedSku);
  } catch (error) {
    console.error('Error updating SKU:', error);
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

export const getSKUById = async (req: Request, res: Response) => {
  try {
    const sku = await SKU.findByPk(req.params.id, {
      include: [{
        model: Product,
        as: 'product'
      }]
    });
    
    if (!sku) {
      return res.status(404).json({ error: 'SKU not found' });
    }
    
    res.json(sku);
  } catch (error) {
    console.error('Error fetching SKU:', error);
    res.status(500).json({ error: 'Error fetching SKU' });
  }
}; 