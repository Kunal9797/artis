import { Request, Response } from 'express';
import Product from '../models/Product';
import Transaction from '../models/Transaction';
import BulkOperation from '../models/BulkOperation';
import { Op } from 'sequelize';
import sequelize from '../config/sequelize';
import * as XLSX from 'xlsx';

// Simplified bulk upload that only creates transactions
export const bulkUploadInventorySimplified = async (req: Request, res: Response) => {
  console.log('=== Simplified Bulk Upload Started ===');
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const userId = (req as any).user?.id;
  const t = await sequelize.transaction();
  
  try {
    // Create bulk operation record
    const operation = await BulkOperation.create({
      type: 'consumption',
      uploadedBy: userId,
      fileName: req.file.originalname,
      status: 'processing',
      metadata: { fileSize: req.file.size }
    }, { transaction: t });

    console.log('Created operation:', operation.id);

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });

    console.log('Excel parsed, rows:', rawData.length);

    // Process headers
    const [headerRow, dateRow] = rawData;
    const dataRows = rawData.slice(2);

    // Find consumption columns (those with dates)
    const consumptionColumns: Array<{index: number, date: Date}> = [];
    headerRow.forEach((header: any, index: number) => {
      const dateStr = dateRow[index];
      if (dateStr && typeof dateStr === 'string' && dateStr.includes('/')) {
        // Parse date format DD/MM/YY
        const [day, month, year] = dateStr.split('/');
        const fullYear = parseInt('20' + year);
        const date = new Date(fullYear, parseInt(month) - 1, parseInt(day));
        consumptionColumns.push({ index, date });
      }
    });

    console.log('Found consumption columns:', consumptionColumns.length);

    // Track processing
    const processed: string[] = [];
    const skipped: Array<{artisCode: string, reason: string}> = [];
    let totalTransactions = 0;

    // Process each product row
    for (const row of dataRows) {
      const artisCode = row[1]?.toString(); // Assuming DESIGN CODE is column 1
      
      if (!artisCode) {
        skipped.push({ artisCode: 'unknown', reason: 'Missing design code' });
        continue;
      }

      // Find product by artis code
      const product = await Product.findOne({
        where: sequelize.where(
          sequelize.fn('array_to_string', sequelize.col('artisCodes'), ','),
          { [Op.like]: `%${artisCode}%` }
        ),
        transaction: t
      });

      if (!product) {
        skipped.push({ artisCode, reason: 'Product not found' });
        continue;
      }

      // Create consumption transactions
      for (const { index, date } of consumptionColumns) {
        const quantity = parseFloat(row[index]) || 0;
        
        if (quantity > 0) {
          await Transaction.create({
            productId: product.id,
            type: 'OUT',
            quantity,
            date,
            notes: `Bulk upload - ${date.toLocaleDateString()}`,
            includeInAvg: true,
            operationId: operation.id
          }, { transaction: t });
          
          totalTransactions++;
        }
      }

      processed.push(artisCode);
    }

    // Update operation status
    await operation.update({
      status: skipped.length > 0 ? 'partial' : 'completed',
      recordsTotal: dataRows.length,
      recordsProcessed: processed.length,
      recordsFailed: skipped.length,
      errorLog: skipped.length > 0 ? JSON.stringify(skipped) : null
    }, { transaction: t });

    await t.commit();

    console.log('=== Upload Completed ===');
    console.log(`Processed: ${processed.length} products`);
    console.log(`Created: ${totalTransactions} transactions`);
    console.log(`Skipped: ${skipped.length} products`);

    // Send response
    res.json({
      success: true,
      operation: {
        id: operation.id,
        status: operation.status
      },
      summary: {
        totalProducts: dataRows.length,
        processed: processed.length,
        skipped: skipped.length,
        transactionsCreated: totalTransactions
      },
      processed,
      skipped
    });

  } catch (error) {
    await t.rollback();
    console.error('Upload error:', error);
    
    res.status(500).json({
      error: 'Failed to process upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get current stock by calculating from transactions
export const getProductStock = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    
    const result = await sequelize.query(`
      SELECT 
        COALESCE(SUM(
          CASE 
            WHEN type = 'IN' THEN quantity
            WHEN type = 'OUT' THEN -quantity
            WHEN type = 'CORRECTION' THEN quantity
          END
        ), 0) as current_stock
      FROM "Transactions"
      WHERE "productId" = :productId
    `, {
      replacements: { productId },
      type: sequelize.QueryTypes.SELECT
    });

    const currentStock = result[0]?.current_stock || 0;
    
    res.json({ productId, currentStock });
  } catch (error) {
    console.error('Error calculating stock:', error);
    res.status(500).json({ error: 'Failed to calculate stock' });
  }
};