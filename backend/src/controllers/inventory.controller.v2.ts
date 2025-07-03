import { Request, Response } from 'express';
import Product from '../models/Product';
import Transaction from '../models/Transaction';
import BulkOperation from '../models/BulkOperation';
import { Op } from 'sequelize';
import sequelize from '../config/sequelize';
import * as XLSX from 'xlsx';
import { updateProductAverageConsumption } from './product.controller';

// Define TransactionType enum
enum TransactionType {
  IN = 'IN',
  OUT = 'OUT',
  CORRECTION = 'CORRECTION'
}

// Simplified bulk upload for consumption data
export const bulkUploadInventory = async (req: Request, res: Response) => {
  console.log('=== bulkUploadInventory V2 called ===');
  
  if (!req.file) {
    console.log('No file uploaded');
    return res.status(400).json({ error: 'No file uploaded' });
  }

  console.log('File received:', req.file.originalname, 'Size:', req.file.size);
  const userId = (req as any).user?.id;

  const t = await sequelize.transaction();
  const skippedRows: { artisCode: string; reason: string }[] = [];
  const processedProducts: string[] = [];
  let totalTransactions = 0;

  try {
    // Create bulk operation record
    const operation = await BulkOperation.create({
      type: 'consumption',
      uploadedBy: userId,
      fileName: req.file.originalname,
      status: 'processing',
      metadata: { fileSize: req.file.size }
    }, { transaction: t });

    console.log('Created BulkOperation:', operation.id);

    // Parse Excel
    console.log('Reading Excel file...');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    console.log('Excel file parsed successfully');
    
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      blankrows: false
    }) as Array<Array<string | number>>;

    console.log('Raw data rows:', rawData.length);
    console.log('First row:', rawData[0]);
    console.log('Second row:', rawData[1]);
    
    const [firstRow, secondRow] = rawData;
    
    // Map columns
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

    // Find consumption date columns
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
      .filter((date): date is { date: Date; column: string; index: number } => date !== null);

    console.log('Found consumption dates:', consumptionDates.length);

    // Process data rows
    const data = rawData.slice(2).map((row: Array<string | number>) => {
      return headers.reduce<Record<string, string | number>>((obj, header, index) => {
        obj[header.toString()] = row[index];
        return obj;
      }, {});
    });

    console.log('Processed data rows:', data.length);
    if (data.length > 0) {
      console.log('Sample data row:', data[0]);
    }

    // Process each product
    for (const row of data) {
      const artisCode = row['OUR CODE']?.toString();

      if (!artisCode) {
        skippedRows.push({
          artisCode: 'unknown',
          reason: 'Missing DESIGN CODE'
        });
        continue;
      }

      try {
        // Find product
        const product = await Product.findOne({
          where: sequelize.where(
            sequelize.fn('array_to_string', sequelize.col('artisCodes'), ','),
            { [Op.like]: `%${artisCode}%` }
          ),
          transaction: t
        });

        if (!product) {
          skippedRows.push({
            artisCode,
            reason: 'Product not found in database'
          });
          continue;
        }

        // Process consumption transactions only
        for (const { date, column } of consumptionDates) {
          const consumption = parseFloat(row[column]?.toString() || '0') || 0;
          
          if (consumption > 0) {
            await Transaction.create({
              productId: product.id,
              type: TransactionType.OUT,
              quantity: consumption,
              date,
              notes: `Bulk upload - ${date.toLocaleDateString()}`,
              includeInAvg: true,
              operationId: operation.id
            }, { transaction: t });
            
            totalTransactions++;
          }
        }

        // Process IN column if present (for initial inventory uploads)
        const initialStock = row['IN'] ? parseFloat(row['IN'].toString()) : 0;
        if (initialStock > 0) {
          await Transaction.create({
            productId: product.id,
            type: TransactionType.IN,
            quantity: initialStock,
            date: new Date(), // Use current date for initial stock
            notes: 'Initial Stock',
            includeInAvg: false,
            operationId: operation.id
          }, { transaction: t });
          
          totalTransactions++;
        }

        processedProducts.push(artisCode);
      } catch (error) {
        console.error(`Error processing ${artisCode}:`, error);
        skippedRows.push({
          artisCode,
          reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    // Update operation status
    await operation.update({
      status: skippedRows.length > 0 ? 'partial' : 'completed',
      recordsTotal: data.length,
      recordsProcessed: processedProducts.length,
      recordsFailed: skippedRows.length,
      errorLog: skippedRows.length > 0 ? JSON.stringify(skippedRows) : null,
      metadata: {
        ...operation.metadata,
        transactionsCreated: totalTransactions,
        consumptionDates: consumptionDates.map(d => d.date.toISOString())
      }
    }, { transaction: t });

    await t.commit();
    
    console.log('=== Upload completed ===');
    console.log(`Processed: ${processedProducts.length} products`);
    console.log(`Created: ${totalTransactions} transactions`);
    console.log(`Skipped: ${skippedRows.length} products`);
    
    const response = {
      success: true,
      operation: {
        id: operation.id,
        status: operation.status
      },
      summary: {
        totalRows: data.length,
        processed: processedProducts.length,
        skipped: skippedRows.length,
        transactionsCreated: totalTransactions
      },
      processed: processedProducts,
      skipped: skippedRows
    };
    
    console.log('Sending response...');
    res.json(response);
    console.log('Response sent');

  } catch (error) {
    await t.rollback();
    console.error('=== Upload error ===', error);
    res.status(500).json({
      error: 'Failed to process inventory upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get all inventory with calculated stock
export const getAllInventory = async (req: Request, res: Response) => {
  try {
    console.log('Fetching all products with calculated inventory...');
    
    // Use raw query to get products with calculated stock
    const products = await sequelize.query(`
      SELECT 
        p.id,
        p."artisCodes",
        p.name,
        p.supplier,
        p.category,
        p."supplierCode",
        p."minStockLevel",
        p.catalogs,
        COALESCE(
          (SELECT SUM(
            CASE 
              WHEN t.type = 'IN' THEN t.quantity
              WHEN t.type = 'OUT' THEN -t.quantity
              WHEN t.type = 'CORRECTION' THEN t.quantity
            END
          ) FROM "Transactions" t WHERE t."productId" = p.id), 
          0
        ) as "currentStock",
        COALESCE(
          (SELECT AVG(t.quantity) 
           FROM "Transactions" t 
           WHERE t."productId" = p.id 
           AND t.type = 'OUT' 
           AND t."includeInAvg" = true
           AND t.date >= CURRENT_DATE - INTERVAL '3 months'),
          0
        ) as "avgConsumption",
        (SELECT MAX(t.date) FROM "Transactions" t WHERE t."productId" = p.id) as "lastUpdated"
      FROM "Products" p
      ORDER BY p."artisCodes"[1]
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    console.log(`Found ${products.length} products`);
    res.json(products);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ 
      error: 'Failed to fetch inventory',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Export other functions from original controller
export {
  getInventory,
  createTransaction,
  getProductTransactions,
  clearInventory,
  getRecentTransactions,
  bulkUploadPurchaseOrder,
  getInventoryDetails,
  bulkUploadCorrections
} from './inventory.controller';