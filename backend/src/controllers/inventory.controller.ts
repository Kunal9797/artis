import { Request, Response } from 'express';
import Product from '../models/Product';
import Transaction from '../models/Transaction';
import { Op } from 'sequelize';
import sequelize from '../config/sequelize';
import * as XLSX from 'xlsx';
import { updateProductAverageConsumption } from './product.controller';

// Define TransactionType enum since we removed InventoryTransaction model
enum TransactionType {
  IN = 'IN',
  OUT = 'OUT',
  CORRECTION = 'CORRECTION'
}

interface PurchaseOrderRow {
  'Artis Code': string;
  'Date': string; // Supports both MM/DD/YY and MM/DD/YYYY formats
  'Amount (Kgs)': string | number;
  'Notes'?: string;
}

// Add this interface for correction bulk uploads
interface CorrectionRow {
  'Artis Code': string;
  'Date (MM/DD/YY)': string; // Supports both MM/DD/YY and MM/DD/YYYY formats
  'Correction Amount': string | number;
  'Reason': string;
}

// Get all inventory items with their associated products
export const getAllInventory = async (req: Request, res: Response) => {
  try {
    console.log('Fetching all products with inventory...');
    const products = await Product.findAll({
      attributes: [
        'id', 'artisCodes', 'name', 'supplier', 'category', 'supplierCode',
        'currentStock', 'lastUpdated', 'minStockLevel', 'avgConsumption', 'catalogs'
      ],
      include: [{
        model: Transaction,
        as: 'transactions',
        attributes: ['id', 'type', 'quantity', 'date', 'notes'],
        required: false
      }],
      order: [['lastUpdated', 'DESC']]
    });

    if (products.length > 0) {
      console.log('Sample product:', JSON.stringify(products[0], null, 2));
    }

    res.json(products);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    console.error('Detailed error:', JSON.stringify(error, null, 2));
    res.status(500).json({ 
      error: 'Error fetching inventory',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
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

    // Calculate new stock based on transaction type
    let stockChange = 0;
    if (type === TransactionType.IN) {
      stockChange = Number(quantity);
    } else if (type === TransactionType.OUT) {
      stockChange = -Number(quantity);
    } else if (type === TransactionType.CORRECTION) {
      // For corrections, the quantity represents the direct adjustment amount
      // Positive values increase stock, negative values decrease stock
      stockChange = Number(quantity);
    }

    const newStock = Number(product.currentStock) + stockChange;
    
    // Create transaction
    const transaction = await Transaction.create({
      productId,
      type,
      quantity: Number(quantity),
      notes,
      date: date || new Date(),
      // CORRECTION transactions should never affect consumption averages
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
      } else if (t.type === TransactionType.OUT) {
        currentStock -= quantity;
      } else if (t.type === TransactionType.CORRECTION) {
        // For CORRECTION, we directly add the quantity (which can be positive or negative)
        currentStock += quantity;
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
  const operationId = `bulk_inventory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
      const initialStock = row['IN'] ? parseFloat(row['IN']) : 0;

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

        const isInitialInventory = headers.some(h => h === 'IN' || h === 'OPEN');

        if (isInitialInventory) {
          // Reset current stock only for initial inventory upload
          await product.update({
            currentStock: 0,
            lastUpdated: new Date()
          }, { transaction: t });

          if (initialStock > 0) {
            await Transaction.create({
              productId: product.id,
              type: TransactionType.IN,
              quantity: initialStock,
              date: new Date('2024-01-09'),
              notes: 'Initial Stock',
              includeInAvg: false,
              operationId
            }, { transaction: t });
          }
        }

        // For consumption updates, don't reset current stock
        let newStock = isInitialInventory ? initialStock : product.currentStock;

        // Record consumption transactions (OUT)
        for (const { date, column } of consumptionDates) {
          const consumption = parseFloat(row[column]) || 0;
          await Transaction.create({
            productId: product.id,
            type: TransactionType.OUT,
            quantity: consumption,
            date,
            notes: `Monthly Consumption - ${date.toLocaleDateString()}`,
            includeInAvg: true,
            operationId
          }, { transaction: t });
        }

        // Calculate total consumption for current stock
        const totalConsumption = consumptionDates.reduce((sum, { column }) => {
          const consumption = parseFloat(row[column]) || 0;
          console.log(`Consumption for ${column}: ${consumption}`);
          return sum + consumption;
        }, 0);

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
  const operationId = `bulk_purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet) as PurchaseOrderRow[];

    for (const row of data) {
      const artisCode = row['Artis Code']?.toString();
      let rawDate = row['Date']?.toString();
      const amount = parseFloat(row['Amount (Kgs)'].toString());
      const notes = row['Notes']?.toString() || '';

      // Handle Excel date numbers (like 45045 which represents a date)
      if (rawDate && !isNaN(Number(rawDate)) && Number(rawDate) > 1000) {
        // This looks like an Excel date serial number
        const excelDate = new Date((Number(rawDate) - 25569) * 86400 * 1000);
        const month = excelDate.getMonth() + 1;
        const day = excelDate.getDate();
        const year = excelDate.getFullYear() % 100; // Get 2-digit year
        rawDate = `${month}/${day}/${year}`;
        console.log(`Converted Excel date ${row['Date']} to ${rawDate}`);
      }

      if (!artisCode || !rawDate || isNaN(amount)) {
        skippedRows.push({
          artisCode: artisCode || 'unknown',
          reason: 'Missing or invalid fields'
        });
        continue;
      }

      // Parse date - handle flexible formats: M/D/YY, MM/DD/YYYY, etc.
      let parsedDate: Date;
      try {
        // Debug logging to see what we're actually getting
        console.log(`Processing date for ${artisCode}: rawDate="${rawDate}", length=${rawDate.length}, charCodes=[${Array.from(rawDate).map(c => c.charCodeAt(0)).join(', ')}]`);
        
        const dateParts = rawDate.trim().split('/');
        console.log(`Date parts: [${dateParts.map(p => `"${p}"`).join(', ')}], count=${dateParts.length}`);
        
        if (dateParts.length !== 3) {
          throw new Error(`Date must have month, day, and year separated by / (got ${dateParts.length} parts: ${dateParts.join('|')})`);
        }
        
        const [monthStr, dayStr, yearStr] = dateParts;
        
        // Parse month (1-12)
        const month = parseInt(monthStr.trim());
        if (isNaN(month) || month < 1 || month > 12) {
          throw new Error('Invalid month - must be 1-12');
        }
        
        // Parse day (1-31)
        const day = parseInt(dayStr.trim());
        if (isNaN(day) || day < 1 || day > 31) {
          throw new Error('Invalid day - must be 1-31');
        }
        
        // Parse year - handle both 2-digit and 4-digit years
        const yearTrimmed = yearStr.trim();
        let fullYear: number;
        
        if (yearTrimmed.length === 2) {
          // Handle YY format (2-digit year)
          const yearNum = parseInt(yearTrimmed);
          if (isNaN(yearNum)) {
            throw new Error('Invalid 2-digit year');
          }
          // Assume years 00-30 are 2000-2030, 31-99 are 1931-1999
          fullYear = yearNum <= 30 ? 2000 + yearNum : 1900 + yearNum;
        } else if (yearTrimmed.length === 4) {
          // Handle YYYY format (4-digit year)
          fullYear = parseInt(yearTrimmed);
          if (isNaN(fullYear)) {
            throw new Error('Invalid 4-digit year');
          }
        } else {
          throw new Error('Year must be 2 or 4 digits');
        }
        
        // Create the date object
        parsedDate = new Date(fullYear, month - 1, day);
        
        // Validate the date is real (handles cases like Feb 30)
        if (isNaN(parsedDate.getTime()) || 
            parsedDate.getFullYear() !== fullYear ||
            parsedDate.getMonth() !== month - 1 ||
            parsedDate.getDate() !== day) {
          throw new Error('Invalid date - day does not exist in the specified month/year');
        }
      } catch (dateError) {
        skippedRows.push({
          artisCode: artisCode || 'unknown',
          reason: `Date parsing error: ${dateError instanceof Error ? dateError.message : 'Invalid date format'}`
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
        // Create transaction with consistent identifier for purchase orders
        await Transaction.create({
          productId: product.id,
          type: TransactionType.IN,
          quantity: amount,
          date: parsedDate,
          notes: notes ? `Bulk Purchase: ${notes}` : 'Bulk Purchase Order',
          operationId
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
      
      // Adjust balance based on transaction type
      if (t.type === 'OUT') {
        balance = balance + t.quantity; // Adding back what was consumed
      } else if (t.type === 'IN') {
        balance = balance - t.quantity; // Removing what was added
      } else if (t.type === 'CORRECTION') {
        balance = balance - t.quantity; // Removing the correction amount
      }
      
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

// Implementation of bulk corrections upload
export const bulkUploadCorrections = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const t = await sequelize.transaction();
  const skippedRows: { artisCode: string; reason: string }[] = [];
  const processedCorrections: string[] = [];
  const operationId = `bulk_corrections_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet) as CorrectionRow[];

    // Validate and process each row
    for (const row of data) {
      // Skip any row that has "Instructions" or empty cells (likely header or instructions)
      if (row['Artis Code']?.toString().includes('Instructions') || 
          !row['Artis Code'] || 
          !row['Date (MM/DD/YY)'] ||
          row['Correction Amount'] === undefined) {
        continue;
      }

      const artisCode = row['Artis Code']?.toString();
      const rawDate = row['Date (MM/DD/YY)']?.toString();
      const correctionAmount = parseFloat(row['Correction Amount'].toString());
      const reason = row['Reason']?.toString() || 'Bulk correction';

      // Validate required fields
      if (!artisCode || !rawDate || isNaN(correctionAmount)) {
        skippedRows.push({
          artisCode: artisCode || 'unknown',
          reason: 'Missing or invalid fields'
        });
        continue;
      }

      // Parse the date - handle flexible formats: M/D/YY, MM/DD/YYYY, etc.
      let parsedDate: Date;
      try {
        const dateParts = rawDate.trim().split('/');
        if (dateParts.length !== 3) {
          throw new Error('Date must have month, day, and year separated by /');
        }
        
        const [monthStr, dayStr, yearStr] = dateParts;
        
        // Parse month (1-12)
        const month = parseInt(monthStr.trim());
        if (isNaN(month) || month < 1 || month > 12) {
          throw new Error('Invalid month - must be 1-12');
        }
        
        // Parse day (1-31)
        const day = parseInt(dayStr.trim());
        if (isNaN(day) || day < 1 || day > 31) {
          throw new Error('Invalid day - must be 1-31');
        }
        
        // Parse year - handle both 2-digit and 4-digit years
        const yearTrimmed = yearStr.trim();
        let fullYear: number;
        
        if (yearTrimmed.length === 2) {
          // Handle YY format (2-digit year)
          const yearNum = parseInt(yearTrimmed);
          if (isNaN(yearNum)) {
            throw new Error('Invalid 2-digit year');
          }
          // Assume years 00-30 are 2000-2030, 31-99 are 1931-1999
          fullYear = yearNum <= 30 ? 2000 + yearNum : 1900 + yearNum;
        } else if (yearTrimmed.length === 4) {
          // Handle YYYY format (4-digit year)
          fullYear = parseInt(yearTrimmed);
          if (isNaN(fullYear)) {
            throw new Error('Invalid 4-digit year');
          }
        } else {
          throw new Error('Year must be 2 or 4 digits');
        }
        
        // Create the date object
        parsedDate = new Date(fullYear, month - 1, day);
        
        // Validate the date is real (handles cases like Feb 30)
        if (isNaN(parsedDate.getTime()) || 
            parsedDate.getFullYear() !== fullYear ||
            parsedDate.getMonth() !== month - 1 ||
            parsedDate.getDate() !== day) {
          throw new Error('Invalid date - day does not exist in the specified month/year');
        }
      } catch (dateError) {
        skippedRows.push({
          artisCode,
          reason: `Date parsing error: ${dateError instanceof Error ? dateError.message : 'Invalid date format'}`
        });
        continue;
      }

      // Find the product by artisCode
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
        // Create CORRECTION transaction - note we directly use the positive/negative amount
        await Transaction.create({
          productId: product.id,
          type: TransactionType.CORRECTION,
          quantity: correctionAmount,
          date: parsedDate,
          notes: reason,
          includeInAvg: false, // Corrections should never affect consumption averages
          operationId
        }, { transaction: t });

        // Update product stock - add the correction amount (positive or negative)
        await product.update({
          currentStock: Number((Number(product.currentStock) + correctionAmount).toFixed(2)),
          lastUpdated: new Date()
        }, { transaction: t });

        processedCorrections.push(artisCode);
      } catch (error) {
        skippedRows.push({
          artisCode,
          reason: `Error processing: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    await t.commit();
    res.json({
      message: 'Corrections processed successfully',
      processed: processedCorrections,
      skipped: skippedRows
    });

  } catch (error) {
    await t.rollback();
    console.error('Error processing corrections upload:', error);
    res.status(500).json({
      error: 'Failed to process corrections upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 

// Helper function to determine if a transaction is compatible with an existing operation
// Stricter compatibility checking for legacy transactions without operationId
const isLegacyTransactionStrictlyCompatible = (transaction: any, existingOperation: any): boolean => {
  const existingTxns = existingOperation.transactions;
  if (!existingTxns || existingTxns.length === 0) return true;
  
  const firstExistingTxn = existingTxns[0];
  
  // Must be exact same transaction type
  if (transaction.type !== firstExistingTxn.type) return false;
  
  // Must have very similar notes or both be null/empty
  const transactionNotes = transaction.notes || '';
  const existingNotes = firstExistingTxn.notes || '';
  
  // If both have notes, they must be identical patterns
  if (transactionNotes && existingNotes) {
    return transactionNotes === existingNotes;
  }
  
  // If one has notes and other doesn't, they're incompatible
  if (!!transactionNotes !== !!existingNotes) return false;
  
  return true;
};

const isTransactionCompatibleWithOperation = (transaction: any, existingOperation: any): boolean => {
  if (existingOperation.transactions.length === 0) {
    return true; // Empty operation, always compatible
  }

  // Get the first transaction to understand the operation type
  const firstTransaction = existingOperation.transactions[0];
  
  // Check for specific operation patterns based on notes
  const transactionNotes = transaction.notes || '';
  const firstTransactionNotes = firstTransaction.notes || '';
  
  // Initial Stock operations - only group with other Initial Stock
  if (transactionNotes.includes('Initial Stock') || firstTransactionNotes.includes('Initial Stock')) {
    return transactionNotes.includes('Initial Stock') && firstTransactionNotes.includes('Initial Stock');
  }
  
  // Monthly Consumption operations - only group with other Monthly Consumption
  if (transactionNotes.includes('Monthly Consumption') || firstTransactionNotes.includes('Monthly Consumption')) {
    return transactionNotes.includes('Monthly Consumption') && firstTransactionNotes.includes('Monthly Consumption');
  }
  
  // Bulk Purchase operations - only group with other Bulk Purchase
  if (transactionNotes.includes('Bulk Purchase') || firstTransactionNotes.includes('Bulk Purchase')) {
    return transactionNotes.includes('Bulk Purchase') && firstTransactionNotes.includes('Bulk Purchase');
  }
  
  // Correction operations - only group with other corrections
  if (transaction.type === 'CORRECTION' || firstTransaction.type === 'CORRECTION') {
    return transaction.type === 'CORRECTION' && firstTransaction.type === 'CORRECTION';
  }
  
  // For other individual transactions, be more restrictive
  // Only group if they're the same type (IN with IN, OUT with OUT) and have similar notes patterns
  if (transaction.type !== firstTransaction.type) {
    return false;
  }
  
  // If they're both individual transactions (no special notes), allow grouping
  const hasSpecialNotes = (notes: string) => 
    notes.includes('Initial Stock') || 
    notes.includes('Monthly Consumption') || 
    notes.includes('Bulk Purchase') ||
    notes.includes('Bulk');
    
  if (!hasSpecialNotes(transactionNotes) && !hasSpecialNotes(firstTransactionNotes)) {
    return true;
  }
  
  return false;
};

export const getOperationsHistory = async (req: Request, res: Response) => {
  try {
    // Get transactions grouped by operationId first, then by creation time for individual transactions
    const transactions = await Transaction.findAll({
      include: [{
        model: Product,
        attributes: ['artisCodes', 'name', 'supplier']
      }],
      order: [['createdAt', 'DESC']],
      limit: 1000 // Get last 1000 transactions
    });

    const operations: { [key: string]: any } = {};
    const timeWindow = 3 * 60 * 1000; // 3 minutes for individual transactions only

    transactions.forEach(transaction => {
      let operationKey: string;
      
      // If transaction has an operationId, use that for perfect grouping
      if (transaction.operationId) {
        operationKey = transaction.operationId;
      } else {
        // For individual transactions without operationId (legacy or manual transactions)
        const createdAt = new Date(transaction.createdAt).getTime();
        
        // For legacy transactions, use stricter grouping to prevent cross-contamination
        // Only group transactions if they have identical notes pattern and are very close in time
        let foundKey = null;
        for (const key in operations) {
          if (key.startsWith('individual_')) {
            const operationTime = parseInt(key.split('_')[1]);
            const timeDiff = Math.abs(createdAt - operationTime);
            
            // Reduce time window for legacy transactions to prevent mixing
            if (timeDiff <= 30000) { // 30 seconds instead of 3 minutes
              const existingOp = operations[key];
              
              // Much stricter compatibility checking for legacy transactions
              const isVeryCompatible = isLegacyTransactionStrictlyCompatible(transaction, existingOp);
              if (isVeryCompatible) {
                foundKey = key;
                break;
              }
            }
          }
        }
        
        operationKey = foundKey || `individual_${createdAt}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Create operation if it doesn't exist
      if (!operations[operationKey]) {
        operations[operationKey] = {
          id: operationKey,
          timestamp: new Date(transaction.createdAt),
          type: 'individual',
          transactions: [],
          summary: {
            totalTransactions: 0,
            productsAffected: new Set(),
            totalQuantityIn: 0,
            totalQuantityOut: 0,
            totalCorrections: 0
          }
        };
      }
      
      // Add transaction to operation
      operations[operationKey].transactions.push(transaction);
      operations[operationKey].summary.totalTransactions++;
      operations[operationKey].summary.productsAffected.add(transaction.productId);
      
      if (transaction.type === 'IN') {
        operations[operationKey].summary.totalQuantityIn += transaction.quantity;
      } else if (transaction.type === 'OUT') {
        operations[operationKey].summary.totalQuantityOut += transaction.quantity;
      } else if (transaction.type === 'CORRECTION') {
        operations[operationKey].summary.totalCorrections += Math.abs(transaction.quantity);
      }
    });

    // Determine operation types and create final response
    const operationsArray = Object.values(operations).map(op => {
      // Convert Set to number for response
      op.summary.productsAffected = op.summary.productsAffected.size;
      
      // Determine operation type based on operationId pattern first, then fallback to content analysis
      if (op.id.startsWith('bulk_inventory_')) {
        op.type = 'bulk_inventory';
        op.description = 'Bulk Inventory Upload';
      } else if (op.id.startsWith('bulk_purchase_')) {
        op.type = 'bulk_purchase';
        op.description = 'Bulk Purchase Order';
      } else if (op.id.startsWith('bulk_corrections_')) {
        op.type = 'bulk_corrections';
        op.description = 'Bulk Stock Corrections';
      } else if (op.summary.totalTransactions >= 2) { // Legacy detection for transactions without operationId
        if (op.transactions.some((t: any) => t.notes?.includes('Initial Stock'))) {
          op.type = 'bulk_inventory';
          op.description = 'Bulk Inventory Upload';
        } else if (op.transactions.some((t: any) => t.notes?.includes('Monthly Consumption'))) {
          op.type = 'bulk_consumption';
          op.description = 'Bulk Consumption Update';
        } else if (op.transactions.some((t: any) => t.notes?.includes('Bulk Purchase'))) {
          op.type = 'bulk_purchase';
          op.description = 'Bulk Purchase Order';
        } else if (op.transactions.every((t: any) => t.type === 'CORRECTION')) {
          op.type = 'bulk_corrections';
          op.description = 'Bulk Stock Corrections';
        } else if (op.transactions.every((t: any) => t.type === 'IN')) {
          op.type = 'bulk_purchase';
          op.description = 'Bulk Purchase Operations';
        } else {
          op.type = 'bulk_mixed';
          op.description = 'Bulk Mixed Operations';
        }
      } else {
        op.type = 'individual';
        if (op.summary.totalTransactions === 1) {
          const txn = op.transactions[0];
          if (txn.notes?.includes('Bulk Purchase')) {
            op.type = 'individual_purchase';
            op.description = `Purchase Order - ${txn.Product?.name || 'Unknown Product'}`;
          } else {
            op.description = `${txn.type === 'IN' ? 'Stock In' : txn.type === 'OUT' ? 'Stock Out' : 'Stock Correction'} - ${txn.Product?.name || 'Unknown Product'}`;
          }
        } else {
          op.description = `${op.summary.totalTransactions} Individual Transactions`;
        }
      }
      
      return op;
    });

    // Sort by timestamp (newest first) and limit to recent operations
    operationsArray.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    res.json({
      operations: operationsArray.slice(0, 50) // Return last 50 operations
    });
  } catch (error) {
    console.error('Error fetching operations history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch operations history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteOperation = async (req: Request, res: Response) => {
  const { operationId } = req.params;
  const t = await sequelize.transaction();
  
  try {
    let transactions;
    
    // If operationId starts with a known pattern, use exact operationId matching
    if (operationId.startsWith('bulk_inventory_') || 
        operationId.startsWith('bulk_purchase_') || 
        operationId.startsWith('bulk_corrections_') ||
        operationId.startsWith('individual_')) {
      
      // For operations with operationId, find all transactions with that exact operationId
      if (operationId.startsWith('individual_')) {
        // For individual operations, use time-based approach as fallback
        const operationTime = parseInt(operationId.split('_')[1]);
        const timeWindow = 3 * 60 * 1000; // 3 minutes
        
        transactions = await Transaction.findAll({
          where: {
            createdAt: {
              [Op.between]: [
                new Date(operationTime - timeWindow),
                new Date(operationTime + timeWindow)
              ]
            }
          },
          include: [{
            model: Product,
            attributes: ['id', 'currentStock']
          }],
          transaction: t
        });
      } else {
        // For bulk operations, use exact operationId match
        transactions = await Transaction.findAll({
          where: {
            operationId: operationId
          },
          include: [{
            model: Product,
            attributes: ['id', 'currentStock']
          }],
          transaction: t
        });
      }
    } else {
      // Legacy: For old timestamp-based operationIds
      const operationTime = parseInt(operationId);
      const timeWindow = 3 * 60 * 1000; // 3 minutes
      
      transactions = await Transaction.findAll({
        where: {
          createdAt: {
            [Op.between]: [
              new Date(operationTime - timeWindow),
              new Date(operationTime + timeWindow)
            ]
          }
        },
        include: [{
          model: Product,
          attributes: ['id', 'currentStock']
        }],
        transaction: t
      });
    }

    if (transactions.length === 0) {
      await t.rollback();
      return res.status(404).json({ error: 'Operation not found' });
    }

    // Group transactions by product to reverse their effects
    const productUpdates: { [productId: string]: number } = {};
    
    transactions.forEach(txn => {
      if (!productUpdates[txn.productId]) {
        productUpdates[txn.productId] = 0;
      }
      
      // Reverse the transaction effect
      if (txn.type === 'IN') {
        productUpdates[txn.productId] -= txn.quantity; // Remove the added stock
      } else if (txn.type === 'OUT') {
        productUpdates[txn.productId] += txn.quantity; // Add back the consumed stock
      } else if (txn.type === 'CORRECTION') {
        productUpdates[txn.productId] -= txn.quantity; // Reverse the correction
      }
    });

    // Update product stocks
    for (const [productId, stockChange] of Object.entries(productUpdates)) {
      const product = await Product.findByPk(productId, { transaction: t });
      if (product) {
        await product.update({
          currentStock: Number((Number(product.currentStock) + stockChange).toFixed(2)),
          lastUpdated: new Date()
        }, { transaction: t });
        
        // Recalculate average consumption for affected products
        await updateProductAverageConsumption(productId, t);
      }
    }

    // Delete the transactions - use same logic as finding them
    if (operationId.startsWith('bulk_inventory_') || 
        operationId.startsWith('bulk_purchase_') || 
        operationId.startsWith('bulk_corrections_')) {
      // For bulk operations, delete by exact operationId
      await Transaction.destroy({
        where: {
          operationId: operationId
        },
        transaction: t
      });
    } else if (operationId.startsWith('individual_')) {
      // For individual operations, use time-based deletion
      const operationTime = parseInt(operationId.split('_')[1]);
      const timeWindow = 3 * 60 * 1000; // 3 minutes
      
      await Transaction.destroy({
        where: {
          createdAt: {
            [Op.between]: [
              new Date(operationTime - timeWindow),
              new Date(operationTime + timeWindow)
            ]
          }
        },
        transaction: t
      });
    } else {
      // Legacy: For old timestamp-based operationIds
      const operationTime = parseInt(operationId);
      const timeWindow = 3 * 60 * 1000; // 3 minutes
      
      await Transaction.destroy({
        where: {
          createdAt: {
            [Op.between]: [
              new Date(operationTime - timeWindow),
              new Date(operationTime + timeWindow)
            ]
          }
        },
        transaction: t
      });
    }

    await t.commit();
    
    res.json({
      message: 'Operation deleted successfully',
      deletedTransactions: transactions.length,
      affectedProducts: Object.keys(productUpdates).length
    });
  } catch (error) {
    await t.rollback();
    console.error('Error deleting operation:', error);
    res.status(500).json({
      error: 'Failed to delete operation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 

export const deleteAllOperations = async (req: Request, res: Response) => {
  const t = await sequelize.transaction();
  
  try {
    // Get count of operations for response
    const transactionCount = await Transaction.count();
    const productCount = await Product.count();
    
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
    
    res.json({ 
      message: 'All operations deleted successfully',
      deletedTransactions: transactionCount,
      affectedProducts: productCount
    });
  } catch (error) {
    await t.rollback();
    console.error('Error deleting all operations:', error);
    res.status(500).json({
      error: 'Failed to delete all operations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 