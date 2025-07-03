import { Request, Response } from 'express';
import Product from '../models/Product';
import Transaction from '../models/Transaction';
import BulkOperation from '../models/BulkOperation';
import { Op } from 'sequelize';
import sequelize from '../config/sequelize';
import * as XLSX from 'xlsx';
import { batchUpdateProductStock } from '../utils/batchUpdateStock';

interface CorrectionRow {
  'Artis Code': string;
  'Date (MM/DD/YY)': string;
  'Correction Amount': string | number;
  'Reason': string;
}

// Optimized bulk corrections upload
export const bulkUploadCorrections = async (req: Request, res: Response) => {
  console.log('=== Optimized bulkUploadCorrections called ===');
  
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  console.log('File received:', req.file.originalname, 'Size:', req.file.size);
  const userId = (req as any).user?.id;

  const t = await sequelize.transaction();
  const skippedRows: { artisCode: string; reason: string }[] = [];
  const processedCorrections: string[] = [];

  try {
    // Create bulk operation record
    const operation = await BulkOperation.create({
      type: 'correction',
      uploadedBy: userId,
      fileName: req.file.originalname,
      status: 'processing',
      metadata: { fileSize: req.file.size }
    }, { transaction: t });

    // Parse Excel
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet) as CorrectionRow[];

    console.log('Parsed corrections:', data.length);

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
      // Skip any row that has "Instructions" or empty cells
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

      if (!artisCode || !rawDate || isNaN(correctionAmount)) {
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
            throw new Error('Invalid date format');
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
        console.log(`Date parsing failed for correction row: ${rawDate}, Error: ${errorMessage}`);
        skippedRows.push({
          artisCode,
          reason: `Invalid date: ${rawDate}. ${errorMessage}`
        });
        continue;
      }

      const product = productMap.get(artisCode);
      
      if (!product) {
        skippedRows.push({
          artisCode,
          reason: 'Product not found'
        });
        continue;
      }

      // Add to transactions
      transactionsToCreate.push({
        productId: product.id,
        type: 'CORRECTION',
        quantity: correctionAmount,
        date: parsedDate,
        notes: reason,
        includeInAvg: false,
        operationId: operation.id
      });

      affectedProductIds.add(product.id);
      processedCorrections.push(artisCode);
    }

    console.log('Creating corrections in bulk...');
    
    // Create all transactions in batches
    const batchSize = 100;
    for (let i = 0; i < transactionsToCreate.length; i += batchSize) {
      const batch = transactionsToCreate.slice(i, i + batchSize);
      await Transaction.bulkCreate(batch, { transaction: t });
      console.log(`Created ${Math.min(i + batchSize, transactionsToCreate.length)}/${transactionsToCreate.length} corrections`);
    }

    // Update operation status
    await operation.update({
      status: skippedRows.length > 0 ? 'partial' : 'completed',
      recordsTotal: processedCorrections.length + skippedRows.length,
      recordsProcessed: processedCorrections.length,
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
    
    console.log('=== Corrections upload completed ===');
    console.log(`Processed: ${processedCorrections.length} corrections`);
    console.log(`Created: ${transactionsToCreate.length} transactions`);
    console.log(`Updated stock for: ${affectedProductIds.size} products`);
    console.log(`Skipped: ${skippedRows.length} corrections`);
    
    // Send response
    res.json({
      message: 'Corrections processed successfully',
      processed: processedCorrections,
      skipped: skippedRows,
      operation: {
        id: operation.id,
        status: operation.status
      }
    });

  } catch (error) {
    await t.rollback();
    console.error('=== Corrections upload error ===', error);
    res.status(500).json({
      error: 'Failed to process corrections upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export default bulkUploadCorrections;