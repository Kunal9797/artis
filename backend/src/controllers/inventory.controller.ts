import { Request, Response } from 'express';
import { Product, Inventory, InventoryTransaction } from '../models';
import { TransactionType } from '../models/InventoryTransaction';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import * as XLSX from 'xlsx';

interface PurchaseOrderRow {
  'Artis Code': string;
  'Date': string;
  'Amount (Kgs)': string | number;
  'Notes'?: string;
}

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
    
    let inventory = await Inventory.findOne({ 
      where: { productId },
      transaction: t,
      lock: true
    });

    const stockChange = type === TransactionType.IN ? Number(quantity) : -Number(quantity);
    
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
        currentStock: Number(inventory.currentStock) + stockChange,
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

// Get transaction history and current stock for a product
export const getProductTransactions = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    console.log('Fetching transactions for productId:', productId);
    
    // First verify the product exists
    const mainProduct = await Product.findByPk(productId);
    if (!mainProduct) {
      throw new Error('Product not found');
    }

    // Find all related products (including the main product)
    const relatedProducts = await Product.findAll({
      where: {
        supplierCode: mainProduct.supplierCode,
        supplier: mainProduct.supplier
      }
    });

    const relatedProductIds = relatedProducts.map(p => p.id);
    console.log('Found related product IDs:', relatedProductIds);

    // Get transactions for all related products
    const transactions = await InventoryTransaction.findAll({
      where: {
        productId: {
          [Op.in]: relatedProductIds
        }
      },
      include: [{
        model: Product,
        as: 'product',
        attributes: ['artisCode', 'name', 'supplierCode', 'supplier', 'category']
      }],
      order: [['date', 'ASC']]
    });

    console.log('Found transactions:', {
      relatedProductIds,
      count: transactions.length,
      firstTransaction: transactions[0]?.toJSON(),
      lastTransaction: transactions[transactions.length - 1]?.toJSON()
    });

    let currentStock = 0;
    const transactionsWithBalance = transactions.map(t => {
      const quantity = Number(t.quantity);
      if (t.type === TransactionType.IN) {
        currentStock += quantity;
      } else {
        currentStock -= quantity;
      }
      
      return {
        ...t.toJSON(),
        balance: Number(currentStock.toFixed(2))
      };
    });

    res.json({
      currentStock: Number(currentStock.toFixed(2)),
      transactions: transactionsWithBalance.reverse()
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
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
      header: 1,
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
          const [day, month, year] = header.split('/');
          return {
            date: new Date(parseInt(year), parseInt(month) - 1, parseInt(day)),
            column: header,
            index
          };
        }
        return null;
      })
      .filter((date): date is { date: Date; column: string; index: number } => date !== null)
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
      const initialStock = parseFloat(row['IN']) || 0;

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
        await InventoryTransaction.create({
          productId: product.id,
          type: TransactionType.IN,
          quantity: initialStock,
          date: new Date('2024-08-01'), // Initial stock date
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
              notes: `Monthly Consumption - ${date.toLocaleDateString()}`
            }, { transaction: t });
          }
        }

        // Calculate current stock (Initial - Total Consumption)
        const totalConsumption = consumptionDates.reduce((sum, { column }) => {
          const consumption = parseFloat(row[column]) || 0;
          return sum + consumption;
        }, 0);

        // Update inventory record with precise decimal calculations
        await Inventory.upsert({
          productId: product.id,
          currentStock: Number((initialStock - totalConsumption).toFixed(2)), // Fix decimal precision
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

export const bulkUploadPurchaseOrder = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const t = await sequelize.transaction();
  const skippedRows: { artisCode: string; reason: string }[] = [];
  const processedOrders: string[] = [];
  const aggregatedAmounts = new Map<string, { 
    totalAmount: number, 
    transactions: Array<{ date: Date, amount: number, notes: string }> 
  }>();

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet) as PurchaseOrderRow[];

    // First pass: aggregate amounts and collect transactions
    for (const row of data) {
      const artisCode = row['Artis Code']?.toString();
      const rawDate = row['Date']?.toString();
      const amount = parseFloat(row['Amount (Kgs)'].toString());
      const notes = row['Notes']?.toString() || '';

      if (!artisCode || !rawDate || isNaN(amount)) {
        skippedRows.push({
          artisCode: artisCode || 'unknown',
          reason: `Missing or invalid fields`
        });
        continue;
      }

      // Parse date
      const [month, day, year] = rawDate.split('/');
      const fullYear = parseInt('20' + year);
      const parsedDate = new Date(fullYear, parseInt(month) - 1, parseInt(day));

      if (isNaN(parsedDate.getTime())) {
        skippedRows.push({
          artisCode: artisCode || 'unknown',
          reason: 'Invalid date'
        });
        continue;
      }

      // Aggregate amounts and store transaction details
      if (!aggregatedAmounts.has(artisCode)) {
        aggregatedAmounts.set(artisCode, { 
          totalAmount: amount,
          transactions: [{ date: parsedDate, amount, notes }]
        });
      } else {
        const current = aggregatedAmounts.get(artisCode)!;
        current.totalAmount += amount;
        current.transactions.push({ date: parsedDate, amount, notes });
      }
    }

    // Second pass: process aggregated data
    for (const [artisCode, data] of aggregatedAmounts) {
      const product = await Product.findOne({
        where: { artisCode },
        transaction: t
      });

      if (!product) {
        skippedRows.push({
          artisCode,
          reason: 'Product not found in database'
        });
        continue;
      }

      try {
        // Create individual transactions
        for (const trans of data.transactions) {
          await InventoryTransaction.create({
            productId: product.id,
            type: TransactionType.IN,
            quantity: trans.amount,
            date: trans.date,
            notes: trans.notes
          }, { transaction: t });
        }

        // Update inventory with total amount
        const inventory = await Inventory.findOne({
          where: { productId: product.id },
          transaction: t,
          lock: true
        });

        if (inventory) {
          const newStock = Number(inventory.currentStock) + Number(data.totalAmount);
          await inventory.update({
            currentStock: Number(newStock.toFixed(2)), // Fix decimal precision
            lastUpdated: new Date()
          }, { transaction: t });
        } else {
          await Inventory.create({
            productId: product.id,
            currentStock: Number(data.totalAmount.toFixed(2)), // Fix decimal precision
            lastUpdated: new Date()
          }, { transaction: t });
        }

        processedOrders.push(artisCode);
      } catch (error) {
        skippedRows.push({
          artisCode,
          reason: `Error processing: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    await t.commit();
    res.json({
      message: 'Purchase orders processed successfully',
      processed: processedOrders,
      skipped: skippedRows
    });

  } catch (error) {
    await t.rollback();
    res.status(500).json({
      error: 'Failed to process purchase order upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 

export const getInventoryReport = async (req: Request, res: Response) => {
  console.log('Received request for inventory report');
  try {
    console.log('Fetching inventory data...');
    const inventoryData = await Inventory.findAll({
      include: [{
        model: Product,
        as: 'product',
        required: true,
        attributes: ['artisCode', 'supplierCode']
      }],
      attributes: ['currentStock']
    }) as (Inventory & { product: Product })[];

    console.log('Raw inventory data:', JSON.stringify(inventoryData, null, 2));

    const artisCodes: string[] = [];
    const supplierCodes: string[] = [];
    const currentStocks: number[] = [];

    inventoryData.forEach(item => {
      console.log('Processing item:', item);
      artisCodes.push(item.product.artisCode);
      supplierCodes.push(item.product.supplierCode || '');
      currentStocks.push(Number(item.currentStock) || 0);
    });

    const response = {
      artisCodes,
      supplierCodes,
      currentStocks
    };

    console.log('Sending response:', response);
    res.json(response);
  } catch (error) {
    console.error('Error generating inventory report:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({ 
      error: 'Failed to generate inventory report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 