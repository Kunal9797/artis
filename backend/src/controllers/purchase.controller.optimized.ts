import { Request, Response } from 'express';
import Product from '../models/Product';
import Transaction from '../models/Transaction';
import BulkOperation from '../models/BulkOperation';
import { Op } from 'sequelize';
import sequelize from '../config/sequelize';
import * as XLSX from 'xlsx';
import { batchUpdateProductStock } from '../utils/batchUpdateStock';

interface PurchaseOrderRow {
  'Artis Code': string;
  'Date': string;
  'Amount (Kgs)': string | number;
  'Notes'?: string;
}

// Optimized bulk purchase order upload
export const bulkUploadPurchaseOrder = async (req: Request, res: Response) => {
  console.log('=== Optimized bulkUploadPurchaseOrder called ===');
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  console.log('File received:', req.file.originalname, 'Size:', req.file.size);
  const userId = (req as any).user?.id;

  const t = await sequelize.transaction();
  const skippedRows: { artisCode: string; reason: string }[] = [];
  const processedOrders: string[] = [];

  try {
    // Create bulk operation record
    const operation = await BulkOperation.create({
      type: 'purchase',
      uploadedBy: userId,
      fileName: req.file.originalname,
      status: 'processing',
      metadata: { fileSize: req.file.size }
    }, { transaction: t });

    // Parse Excel
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet) as PurchaseOrderRow[];

    console.log('Parsed purchase orders:', data.length);

    // Get all products at once for faster lookup
    const allProducts = await Product.findAll({
      attributes: ['id', 'artisCodes', 'currentStock'],
      transaction: t
    });

    // Create a map for faster product lookup
    const productMap = new Map();
    allProducts.forEach(product => {
      product.artisCodes.forEach(code => {
        productMap.set(code.toString(), product);
      });
    });

    // Prepare bulk transactions
    const transactionsToCreate: any[] = [];
    const affectedProductIds = new Set<string>();

    // Process each row
    for (const row of data) {
      const artisCode = row['Artis Code']?.toString();
      const rawDate = row['Date']?.toString();
      const amount = parseFloat(row['Amount (Kgs)'].toString());
      const notes = row['Notes']?.toString() || '';

      // Debug first row
      if (data.indexOf(row) === 0) {
        console.log('First row debug:', {
          artisCode,
          rawDate,
          amount,
          'Amount (Kgs) raw': row['Amount (Kgs)'],
          allKeys: Object.keys(row)
        });
      }

      if (!artisCode || !rawDate || isNaN(amount)) {
        skippedRows.push({
          artisCode: artisCode || 'unknown',
          reason: 'Missing or invalid fields'
        });
        continue;
      }

      // Parse date - accepts MM/DD/YY, M/D/YY, M/D/Y formats or Excel serial numbers
      let parsedDate: Date;
      try {
        // Check if it's an Excel serial number (numeric string)
        if (!isNaN(Number(rawDate)) && !rawDate.includes('/')) {
          // Excel serial number to date conversion
          const excelSerialNumber = parseInt(rawDate);
          // Excel dates start from 1900-01-01 (serial number 1)
          // JavaScript dates start from 1970-01-01
          // Excel incorrectly treats 1900 as a leap year, so we need to subtract 2
          const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
          parsedDate = new Date(excelEpoch.getTime() + excelSerialNumber * 24 * 60 * 60 * 1000);
          
          if (isNaN(parsedDate.getTime())) {
            throw new Error('Invalid Excel date');
          }
          
          // Debug log for first few rows
          if (data.indexOf(row) < 3) {
            console.log(`Excel serial ${excelSerialNumber} converted to: ${parsedDate.toISOString().split('T')[0]}`);
          }
        } else {
          // Parse as string date
          const dateParts = rawDate.split('/');
          if (dateParts.length !== 3) {
            throw new Error('Invalid date format');
          }
          
          const month = parseInt(dateParts[0]);
          const day = parseInt(dateParts[1]);
          const yearPart = dateParts[2];
          
          // Handle year: if 1 or 2 digits, assume 2000s
          let fullYear: number;
          if (yearPart.length <= 2) {
            fullYear = 2000 + parseInt(yearPart);
          } else {
            fullYear = parseInt(yearPart);
          }
          
          // Validate month and day
          if (month < 1 || month > 12 || day < 1 || day > 31) {
            throw new Error('Invalid date values');
          }
          
          parsedDate = new Date(fullYear, month - 1, day);

          if (isNaN(parsedDate.getTime())) {
            throw new Error('Invalid date');
          }
        }
        
        // IMPORTANT: Validate the parsed date is reasonable (not in far future or past)
        const currentYear = new Date().getFullYear();
        const parsedYear = parsedDate.getFullYear();
        if (parsedYear < 2020 || parsedYear > currentYear + 1) {
          throw new Error(`Date year ${parsedYear} is out of reasonable range (2020-${currentYear + 1})`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`Date parsing failed for row ${data.indexOf(row) + 1}: ${rawDate}, Error: ${errorMessage}`);
        skippedRows.push({
          artisCode,
          reason: `Invalid date: ${rawDate}. ${errorMessage}`
        });
        continue;
      }

      const product = productMap.get(artisCode);
      
      if (!product) {
        // Debug: show what codes are available
        if (data.indexOf(row) < 3) {
          console.log(`Product not found for code: ${artisCode}`);
          console.log('Available codes sample:', Array.from(productMap.keys()).slice(0, 5));
        }
        skippedRows.push({
          artisCode,
          reason: 'Product not found'
        });
        continue;
      }

      // Add to transactions
      transactionsToCreate.push({
        productId: product.id,
        type: 'IN',
        quantity: amount,
        date: parsedDate,
        notes,
        includeInAvg: false,
        operationId: operation.id
      });

      affectedProductIds.add(product.id);
      processedOrders.push(artisCode);
    }

    console.log('Creating transactions in bulk...');
    
    // Create all transactions in batches
    const batchSize = 100;
    for (let i = 0; i < transactionsToCreate.length; i += batchSize) {
      const batch = transactionsToCreate.slice(i, i + batchSize);
      await Transaction.bulkCreate(batch, { transaction: t });
      console.log(`Created ${Math.min(i + batchSize, transactionsToCreate.length)}/${transactionsToCreate.length} transactions`);
    }

    // Update operation status
    await operation.update({
      status: skippedRows.length > 0 ? 'partial' : 'completed',
      recordsTotal: data.length,
      recordsProcessed: processedOrders.length,
      recordsFailed: skippedRows.length,
      metadata: {
        ...operation.metadata,
        transactionsCreated: transactionsToCreate.length
      }
    }, { transaction: t });

    // Update product stock values using batch update
    if (affectedProductIds.size > 0) {
      console.log('Updating product stock values...');
      await batchUpdateProductStock(Array.from(affectedProductIds), t);
    }
    
    await t.commit();
    
    console.log('=== Purchase upload completed ===');
    console.log(`Processed: ${processedOrders.length} orders`);
    console.log(`Created: ${transactionsToCreate.length} transactions`);
    console.log(`Updated stock for: ${affectedProductIds.size} products`);
    console.log(`Skipped: ${skippedRows.length} orders`);
    
    // Send response
    res.json({
      message: 'Purchase orders processed successfully',
      processed: processedOrders,
      skipped: skippedRows,
      operation: {
        id: operation.id,
        status: operation.status
      }
    });

  } catch (error) {
    await t.rollback();
    console.error('=== Purchase upload error ===', error);
    res.status(500).json({
      error: 'Failed to process purchase order upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export default bulkUploadPurchaseOrder;