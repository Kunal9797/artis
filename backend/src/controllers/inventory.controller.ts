import { Request, Response } from 'express';
import { Product, Inventory, InventoryTransaction } from '../models';
import { TransactionType } from '../models/InventoryTransaction';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import * as XLSX from 'xlsx';

// Get all inventory items with their associated products
export const getAllInventory = async (req: Request, res: Response) => {
  try {
    console.log('Fetching all inventory...');
    const inventory = await Inventory.findAll({
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'artisCode', 'name', 'supplier', 'category', 'supplierCode']
      }]
    });
    console.log('Found inventory items:', inventory.length);
    console.log('First item:', inventory[0]?.toJSON());
    res.json(inventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Error fetching inventory' });
  }
};

// Record a new inventory transaction and update current stock
export const createTransaction = async (req: Request, res: Response) => {
  const t = await sequelize.transaction();
  
  try {
    const { productId, type, quantity, notes, date } = req.body;
    console.log('Creating transaction:', { productId, type, quantity, notes, date });
    
    let inventory = await Inventory.findOne({ 
      where: { productId },
      transaction: t,
      lock: true
    });

    const currentStock = inventory ? Number(inventory.currentStock) : 0;
    const stockChange = type === TransactionType.IN ? Number(quantity) : -Number(quantity);
    
    if (type === TransactionType.OUT && currentStock + stockChange < 0) {
      await t.rollback();
      return res.status(400).json({
        error: 'Insufficient stock',
        message: `Cannot remove ${quantity} units. Current stock is ${currentStock}.`
      });
    }

    const transaction = await InventoryTransaction.create({
      productId,
      type,
      quantity: Number(quantity),
      notes,
      date: date || new Date()
    }, { transaction: t });

    if (!inventory) {
      inventory = await Inventory.create({
        productId,
        currentStock: stockChange,
        lastUpdated: new Date()
      }, { transaction: t });
    } else {
      await inventory.update({
        currentStock: currentStock + stockChange,
        lastUpdated: new Date()
      }, { transaction: t });
    }

    await t.commit();
    res.status(201).json(transaction);

  } catch (error) {
    await t.rollback();
    console.error('Transaction error:', error);
    res.status(500).json({
      error: 'Error creating transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get transaction history for a product
export const getProductTransactions = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const transactions = await InventoryTransaction.findAll({
      where: { productId },
      include: [{
        model: Product,
        as: 'product',
        attributes: ['artisCode', 'name']
      }],
      order: [['date', 'DESC']]
    });
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Error fetching transactions' });
  }
};

export const bulkUploadInventory = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const t = await sequelize.transaction();
  const skippedRows: { artisCode: string; reason: string }[] = [];
  const processedProducts: string[] = [];

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Process each row
    await Promise.all(data.map(async (row: any) => {
      const artisCode = row['DESIGN CODE']?.toString();
      const supplierCode = row['SUPPLIER CODE']?.toString();

      // Find product
      const product = await Product.findOne({
        where: {
          [Op.or]: [
            { artisCode },
            { supplierCode }
          ]
        },
        transaction: t
      });

      if (!product) {
        skippedRows.push({
          artisCode,
          reason: 'Product not found'
        });
        return;
      }

      // Process monthly data
      const months = ['OCT', 'NOV', 'DEC'];
      let currentStock = parseFloat(row[`OCT_OPENING`]) || 0;

      for (const month of months) {
        const opening = parseFloat(row[`${month}_OPENING`]) || 0;
        const consumption = parseFloat(row[`${month}_CONS`]) || 0;
        const date = new Date(`2023-${month === 'OCT' ? '10' : month === 'NOV' ? '11' : '12'}-01`);

        // Create/Update inventory record
        await Inventory.upsert({
          productId: product.id,
          currentStock: opening,
          lastUpdated: date
        }, { transaction: t });

        // Create consumption transaction
        if (consumption > 0) {
          await InventoryTransaction.create({
            productId: product.id,
            type: TransactionType.OUT,
            quantity: consumption,
            date,
            notes: `${month} Consumption`
          }, { transaction: t });
        }

        currentStock = opening - consumption;
      }

      processedProducts.push(artisCode);
    }));

    await t.commit();

    res.status(200).json({
      message: 'Import completed',
      processed: {
        count: processedProducts.length,
        products: processedProducts
      },
      skipped: {
        count: skippedRows.length,
        rows: skippedRows
      }
    });

  } catch (error) {
    await t.rollback();
    console.error('Error importing inventory:', error);
    res.status(500).json({
      error: 'Error importing inventory',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 

export const getInventory = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const inventory = await Inventory.findOne({
      where: { productId },
      include: [{
        model: Product,
        as: 'product',
        attributes: ['artisCode', 'name']
      }]
    });
    res.json(inventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Error fetching inventory' });
  }
}; 

export const getInventoryByProduct = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const inventory = await Inventory.findOne({
      where: { productId }
    });
    
    if (!inventory) {
      return res.status(404).json({ error: 'Inventory not found' });
    }
    
    res.json(inventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Error fetching inventory' });
  }
}; 

export const clearInventory = async (req: Request, res: Response) => {
  const t = await sequelize.transaction();
  
  try {
    // First delete all transactions
    await InventoryTransaction.destroy({ 
      where: {},
      transaction: t 
    });

    // Then delete all inventory records
    await Inventory.destroy({
      where: {},
      transaction: t
    });

    await t.commit();
    res.json({ message: 'Inventory cleared successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Error clearing inventory:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error
    });
    res.status(500).json({ 
      error: 'Failed to clear inventory',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 