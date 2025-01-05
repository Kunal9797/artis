import { Request, Response } from 'express';
import Product from '../models/Product';
import Transaction from '../models/Transaction';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import * as XLSX from 'xlsx';
import { updateProductAverageConsumption } from './product.controller';

// Define TransactionType enum since we removed InventoryTransaction model
enum TransactionType {
  IN = 'IN',
  OUT = 'OUT'
}

interface PurchaseOrderRow {
  'Artis Code': string;
  'Date': string;
  'Amount (Kgs)': string | number;
  'Notes'?: string;
}

// Get all inventory items with their associated products
export const getAllInventory = async (req: Request, res: Response) => {
  try {
    console.log('Fetching all products with inventory...');
    const products = await Product.findAll({
      attributes: [
        'id', 'artisCodes', 'name', 'supplier', 'category', 'supplierCode',
        'currentStock', 'lastUpdated', 'minStockLevel', 'avgConsumption'
      ],
      order: [['lastUpdated', 'DESC']]
    });
    
    // Log a few products to verify avgConsumption
    products.slice(0, 3).forEach(product => {
      console.log('Product details:', {
        artisCode: product.artisCodes[0],
        avgConsumption: product.avgConsumption
      });
    });

    res.json(products);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Error fetching inventory' });
  }
};

// Record a new inventory transaction and update current stock
export const createTransaction = async (req: Request, res: Response) => {
  const t = await sequelize.transaction();
  try {
    const { productId, type, quantity, notes, date, includeInAvg } = req.body;
    
    const product = await Product.findByPk(productId, {
      transaction: t,
      lock: true
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Calculate new stock
    const stockChange = type === TransactionType.IN ? Number(quantity) : -Number(quantity);
    const newStock = Number(product.currentStock) + stockChange;
    
    // Create transaction
    const transaction = await Transaction.create({
      productId,
      type,
      quantity: Number(quantity),
      notes,
      date: date || new Date(),
      includeInAvg: type === TransactionType.OUT ? (includeInAvg || false) : false
    }, { transaction: t });

    // Update product stock
    await product.update({
      currentStock: Number(newStock.toFixed(2)),
      lastUpdated: new Date()
    }, { transaction: t });

    // Update average consumption if it's an OUT transaction with includeInAvg
    if (type === TransactionType.OUT && includeInAvg) {
      await updateProductAverageConsumption(product.id, t);
    }

    await t.commit();
    res.status(201).json(transaction);

  } catch (error) {
    await t.rollback();
    console.error('Transaction error:', error);
    res.status(400).json({
      error: 'Error creating transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get transaction history and current stock for a product
export const getProductTransactions = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    
    const product = await Product.findByPk(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const transactions = await Transaction.findAll({
      where: { productId },
      include: [{
        model: Product,
        attributes: ['artisCodes', 'name', 'supplierCode', 'supplier', 'category']
      }],
      order: [['date', 'ASC']]
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
    
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      blankrows: false
    }) as Array<Array<string | number>>;

    const [firstRow, secondRow] = rawData;
    
    // Map your Excel columns to the expected format
    const columnMap: Record<string, string> = {
      'DESIGN CODE': 'OUR CODE',
      'OPEN': 'IN'
    };

    // Create header mapping
    const headers = firstRow.map((header: string | number, index: number) => {
      if (header === 'SNO') return 'SNO';
      if (typeof header === 'string' && columnMap[header]) {
        return columnMap[header];
      }
      // Use the date from second row for consumption columns
      return secondRow[index]?.toString() || header.toString();
    });

    // Convert dates to consumption date format
    const consumptionDates = headers
      .map((header: string, index: number) => {
        if (typeof header === 'string' && header.includes('/')) {
          const [day, month, year] = header.split('/');
          return {
            date: new Date(parseInt('20' + year), parseInt(month) - 1, parseInt(day)),
            column: header,
            index
          };
        }
        return null;
      })
      .filter((date): date is { date: Date; column: string; index: number } => date !== null)
      .filter(({ column }) => !column.includes('09/01/24')); // Exclude initial stock date

    // Process data rows
    const data = rawData.slice(2).map((row: Array<string | number>) => {
      return headers.reduce<Record<string, string | number>>((obj, header, index) => {
        obj[header.toString()] = row[index];
        return obj;
      }, {});
    });

    // Process each row
    await Promise.all(data.map(async (row: any) => {
      const artisCode = row['OUR CODE']?.toString();
      const initialStock = parseFloat(row['IN']) || 0;

      if (!artisCode) {
        skippedRows.push({
          artisCode: 'unknown',
          reason: 'Missing DESIGN CODE'
        });
        return;
      }

      try {
        const product = await Product.findOne({
          where: {
            artisCodes: {
              [Op.contains]: [artisCode]
            }
          },
          transaction: t,
          lock: true
        });

        if (!product) {
          skippedRows.push({
            artisCode,
            reason: 'Product not found'
          });
          return;
        }

        // Record initial stock (IN transaction)
        await Transaction.create({
          productId: product.id,
          type: TransactionType.IN,
          quantity: initialStock,
          date: new Date('2024-01-09'),
          notes: 'Initial Stock',
          includeInAvg: false
        }, { transaction: t });

        // Record consumption transactions (OUT)
        for (const { date, column } of consumptionDates) {
          const consumption = parseFloat(row[column]) || 0;
          await Transaction.create({
            productId: product.id,
            type: TransactionType.OUT,
            quantity: consumption,
            date,
            notes: `Monthly Consumption - ${date.toLocaleDateString()}`,
            includeInAvg: true
          }, { transaction: t });
        }

        // Calculate total consumption for current stock
        const totalConsumption = consumptionDates.reduce((sum, { column }) => {
          const consumption = parseFloat(row[column]) || 0;
          console.log(`Consumption for ${column}: ${consumption}`);
          return sum + consumption;
        }, 0);

        // Reset current stock before calculating new value
        await product.update({
          currentStock: 0,
          lastUpdated: new Date()
        }, { transaction: t });

        // Calculate new stock considering all transactions
        let newStock = initialStock;

        // Add existing IN transactions
        const existingTransactions = await Transaction.findAll({
          where: { 
            productId: product.id,
            date: {
              [Op.gt]: new Date('2024-01-09') // After initial stock date
            }
          },
          transaction: t
        });

        existingTransactions.forEach(transaction => {
          if (transaction.type === TransactionType.IN) {
            newStock += Number(transaction.quantity);
          }
        });

        newStock = Number((newStock - totalConsumption).toFixed(2));
        console.log(`Initial stock: ${initialStock}, Total consumption: ${totalConsumption}, Final stock: ${newStock}`);

        // Update product's current stock
        await product.update({
          currentStock: newStock,
          lastUpdated: new Date()
        }, { transaction: t });
        
        // Always update average consumption for bulk imports
        await updateProductAverageConsumption(product.id, t);
        
        processedProducts.push(artisCode);
      } catch (error) {
        console.error(`Error processing ${artisCode}:`, error);
        skippedRows.push({
          artisCode,
          reason: `Error processing: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }));

    await t.commit();
    res.json({
      success: true,
      processed: processedProducts,
      skipped: skippedRows
    });

  } catch (error) {
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
    const product = await Product.findByPk(productId, {
      attributes: ['id', 'artisCodes', 'name', 'currentStock', 'lastUpdated', 'minStockLevel']
    });
    res.json(product);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Error fetching inventory' });
  }
}; 


export const clearInventory = async (req: Request, res: Response) => {
  const t = await sequelize.transaction();
  try {
    // Delete all transactions
    await Transaction.destroy({
      where: {},
      transaction: t
    });

    // Reset all products' current stock and avgConsumption to 0
    await Product.update({
      currentStock: 0,
      avgConsumption: 0,
      lastUpdated: new Date()
    }, {
      where: {},
      transaction: t
    });

    await t.commit();
    res.json({ message: 'All inventory data cleared successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Error clearing inventory:', error);
    res.status(500).json({ 
      error: 'Failed to clear inventory',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 

export const getRecentTransactions = async (req: Request, res: Response) => {
  try {
    const transactions = await Transaction.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [{
        model: Product,
        attributes: ['artisCodes', 'name']
      }]
    });
    
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching recent transactions:', error);
    res.status(500).json({ error: 'Error fetching recent transactions' });
  }
}; 

// Get inventory details for a specific product
export const bulkUploadPurchaseOrder = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const t = await sequelize.transaction();
  const skippedRows: { artisCode: string; reason: string }[] = [];
  const processedOrders: string[] = [];

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet) as PurchaseOrderRow[];

    for (const row of data) {
      const artisCode = row['Artis Code']?.toString();
      const rawDate = row['Date']?.toString();
      const amount = parseFloat(row['Amount (Kgs)'].toString());
      const notes = row['Notes']?.toString() || '';

      if (!artisCode || !rawDate || isNaN(amount)) {
        skippedRows.push({
          artisCode: artisCode || 'unknown',
          reason: 'Missing or invalid fields'
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

      const product = await Product.findOne({
        where: {
          artisCodes: {
            [Op.contains]: [artisCode]
          }
        },
        transaction: t,
        lock: true
      });

      if (!product) {
        skippedRows.push({
          artisCode,
          reason: 'Product not found'
        });
        continue;
      }

      try {
        // Create transaction
        await Transaction.create({
          productId: product.id,
          type: TransactionType.IN,
          quantity: amount,
          date: parsedDate,
          notes
        }, { transaction: t });

        // Update product stock and lastUpdated
        await product.update({
          currentStock: Number((Number(product.currentStock) + amount).toFixed(2)),
          lastUpdated: new Date()
        }, { transaction: t });

        // Recalculate average consumption
        await updateProductAverageConsumption(product.id, t);

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


export const getInventoryDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const transactions = await Transaction.findAll({
      where: { productId: id },
      order: [['date', 'DESC']],
      include: [{
        model: Product,
        attributes: ['artisCodes', 'name', 'supplierCode', 'supplier']
      }]
    });

    // Calculate running balance for each transaction
    let balance = product.currentStock;
    const transactionsWithBalance = transactions.map(t => {
      const transaction = t.toJSON();
      balance = balance + (t.type === 'OUT' ? t.quantity : -t.quantity);
      return {
        ...transaction,
        balance: Number(balance.toFixed(2))
      };
    }).reverse(); // Reverse to show oldest first

    res.json({
      product: {
        id: product.id,
        artisCodes: product.artisCodes,
        name: product.name,
        supplierCode: product.supplierCode,
        supplier: product.supplier,
        currentStock: product.currentStock,
        lastUpdated: product.lastUpdated
      },
      transactions: transactionsWithBalance
    });
  } catch (error) {
    console.error('Error fetching inventory details:', error);
    res.status(500).json({ error: 'Failed to fetch inventory details' });
  }
}; 