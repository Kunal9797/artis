import { Request, Response } from 'express';
import Product from '../models/Product';
import Transaction from '../models/Transaction';
import BulkOperation from '../models/BulkOperation';
import { Op } from 'sequelize';
import sequelize from '../config/sequelize';
import * as XLSX from 'xlsx';
import { batchUpdateProductStock } from '../utils/batchUpdateStock';

// Define TransactionType enum
enum TransactionType {
  IN = 'IN',
  OUT = 'OUT',
  CORRECTION = 'CORRECTION'
}

// Optimized bulk upload that processes in batches
export const bulkUploadInventory = async (req: Request, res: Response) => {
  console.log('=== Optimized bulkUploadInventory called ===');
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  console.log('File received:', req.file.originalname, 'Size:', req.file.size);
  const userId = (req as any).user?.id;

  const t = await sequelize.transaction();
  const skippedRows: { artisCode: string; reason: string }[] = [];
  const processedProducts: string[] = [];

  try {
    // Create bulk operation record
    const operation = await BulkOperation.create({
      type: 'consumption',
      uploadedBy: userId,
      fileName: req.file.originalname,
      status: 'processing',
      metadata: { fileSize: req.file.size }
    }, { transaction: t });

    // Parse Excel
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false }) as Array<Array<string | number>>;

    console.log('Raw data rows:', rawData.length);
    
    const [firstRow, secondRow] = rawData as [Array<string | number>, Array<string | number>];
    
    // Map columns
    const columnMap: Record<string, string> = {
      'DESIGN CODE': 'OUR CODE',
      'OPEN': 'IN'
    };

    // Create header mapping
    const headers = firstRow.map((header, index) => {
      if (header === 'SNO') return 'SNO';
      if (typeof header === 'string' && columnMap[header]) {
        return columnMap[header];
      }
      return secondRow[index]?.toString() || header.toString();
    });

    // Find consumption date columns
    const consumptionDates = headers
      .map((header: string, index: number) => {
        if (typeof header === 'string' && header.includes('/')) {
          const [day, month, year] = header.split('/');
          const parsedDate = new Date(parseInt('20' + year), parseInt(month) - 1, parseInt(day));
          console.log(`Parsing date header "${header}": day=${day}, month=${month}, year=${year} => ${parsedDate.toISOString()}`);
          return {
            date: parsedDate,
            column: header,
            index
          };
        }
        return null;
      })
      .filter((date): date is { date: Date; column: string; index: number } => date !== null);

    // Process data rows
    const data = rawData.slice(2).map((row: Array<string | number>) => {
      return headers.reduce<Record<string, string | number>>((obj, header, index) => {
        obj[header.toString()] = row[index];
        return obj;
      }, {});
    });

    console.log('Processed data rows:', data.length);
    console.log('Consumption dates found:', consumptionDates.length);
    console.log('Headers:', headers);
    console.log('First data row:', data[0]);

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
    let processedCount = 0;

    // Process each row
    for (const row of data) {
      const artisCode = row['OUR CODE']?.toString();
      
      if (!artisCode) {
        skippedRows.push({ artisCode: 'unknown', reason: 'Missing DESIGN CODE' });
        continue;
      }

      const product = productMap.get(artisCode);
      
      if (!product) {
        skippedRows.push({ artisCode, reason: 'Product not found' });
        continue;
      }

      // Add consumption transactions
      for (const { date, column } of consumptionDates) {
        const consumption = parseFloat(row[column]?.toString() || '0') || 0;
        if (consumption > 0) {
          transactionsToCreate.push({
            productId: product.id,
            type: TransactionType.OUT,
            quantity: consumption,
            date,
            notes: `Bulk upload - ${date.toLocaleDateString()}`,
            includeInAvg: true,
            operationId: operation.id
          });
        }
      }

      // Add initial stock if present
      const initialStock = row['IN'] ? parseFloat(row['IN'].toString()) : 0;
      if (initialStock > 0) {
        // Use September 1, 2024 as the initial stock date
        // This ensures initial stock is before all consumption dates
        const initialStockDate = new Date(2024, 8, 1); // September 1, 2024
        transactionsToCreate.push({
          productId: product.id,
          type: TransactionType.IN,
          quantity: initialStock,
          date: initialStockDate,
          notes: 'Initial Stock',
          includeInAvg: false,
          operationId: operation.id
        });
      }

      processedProducts.push(artisCode);
      processedCount++;

      // Log progress every 25 products
      if (processedCount % 25 === 0) {
        console.log(`Processed ${processedCount}/${data.length} products...`);
      }
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
      recordsProcessed: processedProducts.length,
      recordsFailed: skippedRows.length,
      metadata: {
        ...operation.metadata,
        transactionsCreated: transactionsToCreate.length
      }
    }, { transaction: t });

    // Update product stock and consumption values using batch update
    console.log('Updating product stock values...');
    const uniqueProductIds = [...new Set(transactionsToCreate.map(t => t.productId))];
    
    // Use batch update for much better performance
    await batchUpdateProductStock(uniqueProductIds, t);
    
    await t.commit();
    
    console.log('=== Upload completed ===');
    console.log(`Processed: ${processedProducts.length} products`);
    console.log(`Created: ${transactionsToCreate.length} transactions`);
    console.log(`Updated stock for: ${uniqueProductIds.length} products`);
    console.log(`Skipped: ${skippedRows.length} products`);
    
    // Send response
    res.json({
      success: true,
      operation: {
        id: operation.id,
        status: operation.status
      },
      summary: {
        totalRows: data.length,
        processed: processedProducts.length,
        skipped: skippedRows.length,
        transactionsCreated: transactionsToCreate.length
      },
      processed: processedProducts,
      skipped: skippedRows
    });

  } catch (error) {
    await t.rollback();
    console.error('=== Upload error ===', error);
    res.status(500).json({
      error: 'Failed to process inventory upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export default bulkUploadInventory;