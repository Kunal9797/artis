import { Request, Response } from 'express';
import { SKU, InventoryMovement } from '../models';
import { MovementType } from '../models/InventoryMovement';
import sequelize from '../config/database';

export const createMovement = async (req: Request, res: Response) => {
  const t = await sequelize.transaction();
  
  try {
    const { skuId, movementType, quantity, fromSkuId, notes } = req.body;
    
    const sku = await SKU.findByPk(skuId);
    if (!sku) {
      await t.rollback();
      return res.status(404).json({ error: 'SKU not found' });
    }

    switch (movementType) {
      case MovementType.STOCK_IN:
        await sku.increment('quantity', { by: quantity, transaction: t });
        break;
      
      case MovementType.STOCK_OUT:
        if (sku.quantity < quantity) {
          await t.rollback();
          return res.status(400).json({ error: 'Insufficient stock' });
        }
        await sku.decrement('quantity', { by: quantity, transaction: t });
        break;
      
      case MovementType.CONVERSION:
        if (!fromSkuId) {
          await t.rollback();
          return res.status(400).json({ error: 'Source SKU required for conversion' });
        }
        
        const sourceRoll = await SKU.findByPk(fromSkuId);
        if (!sourceRoll || sourceRoll.inventoryType !== 'DESIGN_PAPER_ROLL') {
          await t.rollback();
          return res.status(400).json({ error: 'Invalid source roll' });
        }
        
        if (sourceRoll.quantity < quantity) {
          await t.rollback();
          return res.status(400).json({ error: 'Insufficient roll quantity' });
        }
        
        await sourceRoll.decrement('quantity', { by: quantity, transaction: t });
        await sku.increment('quantity', { by: quantity, transaction: t });
        break;
    }

    const movement = await InventoryMovement.create({
      skuId,
      movementType,
      quantity,
      fromSkuId,
      notes,
      date: new Date()
    }, { transaction: t });

    await t.commit();
    res.status(201).json(movement);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: 'Error creating movement' });
  }
};

export const getMovements = async (req: Request, res: Response) => {
  try {
    const movements = await InventoryMovement.findAll({
      include: [{ model: SKU, as: 'sku' }],
      order: [['date', 'DESC']]
    });
    res.json(movements);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching movements' });
  }
}; 