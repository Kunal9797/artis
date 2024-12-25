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
    console.log('Getting transactions for productId:', productId);
    
    const transactions = await InventoryTransaction.findAll({
      where: { productId },
      include: [{
        model: Product,
        as: 'product',
        attributes: ['artisCode', 'name']
      }],
      order: [['date', 'DESC']]
    });

    console.log('Found transactions:', {
      count: transactions.length,
      firstTransaction: transactions[0]?.toJSON()
    });

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', {
      error,
      productId: req.params.productId,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to fetch transactions' });
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
    
    // Get all data including headers
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,  // Get as array of arrays
      blankrows: false
    }) as Array<Array<string | number>>;

    // Extract headers from first two rows
    const [firstRow, secondRow] = rawData;
    
    // Create header mapping using first and second row
    const headers = (firstRow as Array<string>).map((header: string, index: number) => {
      if (header === 'SNO') return 'SNO';
      if (header === 'OUR CODE') return 'OUR CODE';
      if (header === 'IN') return 'IN';
      // For OUT columns, use the date from second row
      return secondRow[index];
    });

    // Convert dates to consumption date format
    const consumptionDates = headers
      .map((header: string | number, index: number) => {
        if (typeof header === 'string' && header.includes('/')) {
          return {
            date: new Date(header.split('/').reverse().join('-')),
            column: header
          };
        }
        return null;
      })
      .filter((date): date is { date: Date; column: string } => date !== null)
      .filter(({ column }) => column !== '1/8/24'); // Exclude initial stock date

    // Process remaining rows
    const data = rawData.slice(2).map((row: Array<string | number>) => {
      return headers.reduce<Record<string, string | number>>((obj, header, index) => {
        obj[header.toString()] = row[index];
        return obj;
      }, {});
    });

    await Promise.all(data.map(async (row: any) => {
      const artisCode = row['OUR CODE']?.toString();
      console.log('Processing row:', { artisCode, row });

      if (!artisCode) {
        skippedRows.push({
          artisCode: 'unknown',
          reason: 'Missing OUR CODE'
        });
        return;
      }

      const product = await Product.findOne({
        where: { artisCode },
        transaction: t
      });

      if (!product) {
        skippedRows.push({
          artisCode,
          reason: 'Product not found'
        });
        return;
      }

      try {
        // Record initial stock (IN transaction)
        const initialStock = parseFloat(row['IN']) || 0;
        const initialDate = new Date('2024-08-01');

        await InventoryTransaction.create({
          productId: product.id,
          type: TransactionType.IN,
          quantity: initialStock,
          date: initialDate,
          notes: 'Initial Stock'
        }, { transaction: t });

        // Record consumption transactions (OUT)
        for (const { date, column } of consumptionDates) {
          const consumption = parseFloat(row[column]) || 0;
          if (consumption > 0) {
            await InventoryTransaction.create({
              productId: product.id,
              type: TransactionType.OUT,
              quantity: consumption,
              date,
              notes: 'Monthly Consumption'
            }, { transaction: t });
          }
        }

        // Update current stock
        const totalConsumption = consumptionDates.reduce((sum, { column }) => 
          sum + (parseFloat(row[column]) || 0), 0);
        
        await Inventory.upsert({
          productId: product.id,
          currentStock: initialStock - totalConsumption,
          lastUpdated: new Date()
        }, { transaction: t });

        processedProducts.push(artisCode);
      } catch (error: unknown) {
        skippedRows.push({
          artisCode,
          reason: `Error processing: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }));

    await t.commit();
    
    res.json({
      message: 'Inventory updated successfully',
      processed: processedProducts,
      skipped: skippedRows
    });

  } catch (error: unknown) {
    console.error('Bulk upload error:', error);
    await t.rollback();
    res.status(500).json({
      error: 'Failed to process inventory upload',
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

export const getRecentTransactions = async (req: Request, res: Response) => {
  try {
    const transactions = await InventoryTransaction.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [{
        model: Product,
        as: 'product',
        attributes: ['artisCode', 'name']
      }]
    });
    
    console.log('Recent transactions:', transactions); // Debug log
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching recent transactions:', error);
    res.status(500).json({ error: 'Error fetching recent transactions' });
  }
}; 

// Get inventory details for a specific product
export const getProductInventory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const inventory = await Inventory.findOne({
      where: { productId: id },
      include: [{
        model: Product,
        as: 'product',
        attributes: ['artisCode', 'name']
      }]
    });
    res.json(inventory);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
}; 