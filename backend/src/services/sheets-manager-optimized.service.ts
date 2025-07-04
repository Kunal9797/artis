import { google, sheets_v4 } from 'googleapis';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { Product, Transaction } from '../models';
import { Op, QueryTypes } from 'sequelize';
import sequelize from '../config/sequelize';

dotenv.config();

interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

export class SheetsManagerOptimizedService {
  private initialStockSheetId = process.env.GOOGLE_SHEETS_INITIAL_STOCK_ID;
  private sheets: sheets_v4.Sheets;
  private auth: any;
  private productCache: Map<string, Product> = new Map();
  
  // Validation thresholds
  private readonly MAX_CONSUMPTION_PER_MONTH = 10000; // kg
  private readonly MAX_PURCHASE_AMOUNT = 50000; // kg
  private readonly MAX_CORRECTION_AMOUNT = 5000; // kg
  private readonly MIN_DATE = new Date('2020-01-01');
  private readonly MAX_DATE = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year in future

  constructor() {
    const credentials = JSON.parse(
      fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH!, 'utf8')
    );
    
    this.auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  /**
   * Load all products into cache for fast lookup
   */
  private async loadProductCache(): Promise<void> {
    const products = await Product.findAll();
    
    this.productCache.clear();
    products.forEach(product => {
      product.artisCodes.forEach(code => {
        this.productCache.set(code, product);
      });
    });
  }

  /**
   * Get product from cache
   */
  private getProductFromCache(artisCode: string): Product | undefined {
    return this.productCache.get(artisCode);
  }

  /**
   * Validate consumption data
   */
  private validateConsumptionData(
    artisCode: string, 
    consumption: string | number, 
    month: string
  ): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Validate consumption amount
    const amount = parseFloat(consumption.toString());
    if (isNaN(amount)) {
      errors.push(`Invalid consumption amount: ${consumption}`);
    } else {
      if (amount < 0) {
        errors.push(`Negative consumption not allowed: ${amount} kg`);
      }
      if (amount > this.MAX_CONSUMPTION_PER_MONTH) {
        warnings.push(`Unusually high consumption: ${amount} kg (max expected: ${this.MAX_CONSUMPTION_PER_MONTH} kg)`);
      }
      if (amount === 0) {
        warnings.push(`Zero consumption recorded`);
      }
    }
    
    // Validate month format
    if (!month || !month.match(/(\w+)\s+(\d{4})/)) {
      warnings.push(`Invalid month format: ${month}`);
    }
    
    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Validate purchase data
   */
  private validatePurchaseData(
    artisCode: string,
    date: string,
    amount: string | number
  ): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Validate amount
    const purchaseAmount = parseFloat(amount.toString());
    if (isNaN(purchaseAmount)) {
      errors.push(`Invalid purchase amount: ${amount}`);
    } else {
      if (purchaseAmount <= 0) {
        errors.push(`Purchase amount must be positive: ${purchaseAmount} kg`);
      }
      if (purchaseAmount > this.MAX_PURCHASE_AMOUNT) {
        warnings.push(`Unusually large purchase: ${purchaseAmount} kg (max expected: ${this.MAX_PURCHASE_AMOUNT} kg)`);
      }
    }
    
    // Validate date
    const purchaseDate = new Date(date);
    if (isNaN(purchaseDate.getTime())) {
      errors.push(`Invalid date format: ${date}`);
    } else {
      if (purchaseDate < this.MIN_DATE) {
        warnings.push(`Date is very old: ${date}`);
      }
      if (purchaseDate > this.MAX_DATE) {
        errors.push(`Date is in the future: ${date}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Validate correction data
   */
  private validateCorrectionData(
    artisCode: string,
    correction: string | number,
    date: string
  ): ValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Extract number from correction string
    const correctionMatch = correction.toString().match(/^([+-]?\d+\.?\d*)/);
    if (!correctionMatch) {
      errors.push(`Invalid correction format: ${correction}`);
    } else {
      const correctionAmount = parseFloat(correctionMatch[1]);
      if (isNaN(correctionAmount)) {
        errors.push(`Invalid correction amount: ${correction}`);
      } else {
        if (Math.abs(correctionAmount) > this.MAX_CORRECTION_AMOUNT) {
          warnings.push(`Large correction amount: ${correctionAmount} kg (max expected: ±${this.MAX_CORRECTION_AMOUNT} kg)`);
        }
        if (correctionAmount === 0) {
          warnings.push(`Zero correction amount`);
        }
      }
    }
    
    // Validate date if provided
    if (date) {
      const correctionDate = new Date(date);
      if (!isNaN(correctionDate.getTime())) {
        if (correctionDate > this.MAX_DATE) {
          errors.push(`Date is in the future: ${date}`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }

  /**
   * Optimized sync consumption data with batch processing
   */
  async syncConsumptionOptimized(): Promise<{ added: number; errors: string[]; warnings: string[] }> {
    // Starting optimized consumption sync
    
    // Load product cache first
    await this.loadProductCache();
    
    // Get all rows by specifying a very large range
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_CONSUMPTION_ID!,
      range: 'Sheet1!A2:D10000', // Explicitly set large range to avoid limits
    });

    const rows = response.data.values || [];
    const errors: string[] = [];
    const warnings: string[] = [];
    const transactionsToCreate: any[] = [];
    const productUpdates: Map<string, number> = new Map();

    // Processing consumption rows

    // Process all rows in memory first
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const [artisCode, consumption, month, notes] = row;
      
      try {
        if (!artisCode || !consumption) continue;

        // Validate data
        const validation = this.validateConsumptionData(artisCode, consumption, month);
        if (!validation.isValid) {
          errors.push(`Row ${i + 2} (${artisCode}): ${validation.errors.join(', ')}`);
          continue;
        }
        if (validation.warnings.length > 0) {
          warnings.push(`Row ${i + 2} (${artisCode}): ${validation.warnings.join(', ')}`);
        }

        const product = this.getProductFromCache(artisCode);
        if (!product) {
          errors.push(`Row ${i + 2}: Product not found: ${artisCode}`);
          continue;
        }

        const quantity = parseFloat(consumption);
        
        // Parse date from month column (e.g., "September 2024")
        let transactionDate = new Date();
        if (month) {
          // Try to parse month and year
          const monthMatch = month.match(/(\w+)\s+(\d{4})/);
          if (monthMatch) {
            const monthName = monthMatch[1];
            const year = parseInt(monthMatch[2]);
            
            // Convert month name to month number
            const monthMap: { [key: string]: number } = {
              'january': 0, 'february': 1, 'march': 2, 'april': 3,
              'may': 4, 'june': 5, 'july': 6, 'august': 7,
              'september': 8, 'october': 9, 'november': 10, 'december': 11
            };
            
            const monthNum = monthMap[monthName.toLowerCase()];
            if (monthNum !== undefined) {
              // Set to last day of the month for consumption
              transactionDate = new Date(year, monthNum + 1, 0);
            }
          }
        }
        
        // Prepare transaction data
        transactionsToCreate.push({
          productId: product.id,
          type: 'OUT',
          quantity: quantity,
          date: transactionDate,
          notes: notes || `Monthly consumption for ${month || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          includeInAvg: true // Important for average calculation
        });

        // Track products that need stock recalculation
        if (!productUpdates.has(product.id)) {
          productUpdates.set(product.id, 0);
        }

      } catch (error: any) {
        errors.push(`Error processing row ${artisCode || 'unknown'}: ${error.message}`);
      }
    }

    // Bulk create all transactions
    // Bulk creating transactions
    const t = await sequelize.transaction();
    
    try {
      // Bulk insert transactions
      await Transaction.bulkCreate(transactionsToCreate, { transaction: t });

      // Recalculate stock and average consumption for affected products
      console.log(`📊 Recalculating stock for ${productUpdates.size} products...`);
      
      for (const productId of productUpdates.keys()) {
        // Calculate current stock from all transactions
        const stockResult = await sequelize.query(
          `SELECT COALESCE(SUM(
            CASE 
              WHEN type = 'IN' THEN quantity
              WHEN type = 'OUT' THEN -quantity
              WHEN type = 'CORRECTION' THEN quantity
            END
          ), 0) as total_stock
          FROM "Transactions"
          WHERE "productId" = :productId`,
          {
            replacements: { productId },
            type: QueryTypes.SELECT,
            transaction: t
          }
        );
        
        const currentStock = parseFloat((stockResult as any)[0].total_stock) || 0;
        
        // Calculate average monthly consumption (from transactions marked includeInAvg)
        const avgResult = await sequelize.query(
          `SELECT 
            COUNT(DISTINCT DATE_TRUNC('month', date)) as months,
            COALESCE(SUM(quantity), 0) as total_consumption
          FROM "Transactions"
          WHERE "productId" = :productId
            AND type = 'OUT'
            AND "includeInAvg" = true`,
          {
            replacements: { productId },
            type: QueryTypes.SELECT,
            transaction: t
          }
        );
        
        const months = parseInt((avgResult as any)[0].months) || 1;
        const totalConsumption = parseFloat((avgResult as any)[0].total_consumption) || 0;
        const avgConsumption = totalConsumption / months;
        
        // Update product
        await sequelize.query(
          `UPDATE "Products" 
           SET "currentStock" = :currentStock,
               "avgConsumption" = :avgConsumption,
               "updatedAt" = NOW()
           WHERE "id" = :productId`,
          {
            replacements: { currentStock, avgConsumption, productId },
            transaction: t
          }
        );
      }

      await t.commit();
      // Successfully processed consumption records
      
      return { added: transactionsToCreate.length, errors, warnings };

    } catch (error: any) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Optimized sync purchases with batch processing
   */
  async syncPurchasesOptimized(): Promise<{ added: number; errors: string[]; warnings: string[] }> {
    // Starting optimized purchases sync
    
    await this.loadProductCache();
    
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID!,
      range: 'Sheet1!A2:E10000', // Explicitly set large range
    });

    const rows = response.data.values || [];
    const errors: string[] = [];
    const warnings: string[] = [];
    const transactionsToCreate: any[] = [];

    console.log(`📊 Processing ${rows.length} purchase rows...`);

    // Process all rows in memory
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const [artisCode, date, amount, supplier, notes] = row;
      
      try {
        if (!artisCode || artisCode.includes('Example:') || artisCode.includes('Instructions:')) continue;
        if (!amount || !date) continue;

        // Validate data
        const validation = this.validatePurchaseData(artisCode, date, amount);
        if (!validation.isValid) {
          errors.push(`Row ${i + 2} (${artisCode}): ${validation.errors.join(', ')}`);
          continue;
        }
        if (validation.warnings.length > 0) {
          warnings.push(`Row ${i + 2} (${artisCode}): ${validation.warnings.join(', ')}`);
        }

        const product = this.getProductFromCache(artisCode);
        if (!product) {
          errors.push(`Row ${i + 2}: Product not found: ${artisCode}`);
          continue;
        }

        transactionsToCreate.push({
          productId: product.id,
          type: 'IN',
          quantity: parseFloat(amount),
          date: new Date(date),
          notes: `${supplier ? `Supplier: ${supplier}. ` : ''}${notes || ''}`
        });

      } catch (error: any) {
        errors.push(`Error processing purchase row ${artisCode || 'unknown'}: ${error.message}`);
      }
    }

    // Bulk create transactions with stock recalculation
    // Bulk creating transactions
    const t = await sequelize.transaction();
    
    try {
      await Transaction.bulkCreate(transactionsToCreate, { transaction: t });
      
      // Get unique product IDs
      const productIds = new Set(transactionsToCreate.map(t => t.productId));
      
      // Recalculate stock for affected products
      // Recalculating stock for affected products
      for (const productId of productIds) {
        const stockResult = await sequelize.query(
          `SELECT COALESCE(SUM(
            CASE 
              WHEN type = 'IN' THEN quantity
              WHEN type = 'OUT' THEN -quantity
              WHEN type = 'CORRECTION' THEN quantity
            END
          ), 0) as total_stock
          FROM "Transactions"
          WHERE "productId" = :productId`,
          {
            replacements: { productId },
            type: QueryTypes.SELECT,
            transaction: t
          }
        );
        
        const currentStock = parseFloat((stockResult as any)[0].total_stock) || 0;
        
        await sequelize.query(
          `UPDATE "Products" 
           SET "currentStock" = :currentStock,
               "updatedAt" = NOW()
           WHERE "id" = :productId`,
          {
            replacements: { currentStock, productId },
            transaction: t
          }
        );
      }
      
      await t.commit();
      // Successfully processed purchase records
      
      return { added: transactionsToCreate.length, errors, warnings };

    } catch (error: any) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Optimized sync corrections with batch processing
   */
  async syncCorrectionsOptimized(): Promise<{ added: number; errors: string[]; warnings: string[] }> {
    // Starting optimized corrections sync
    
    await this.loadProductCache();
    
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_CORRECTIONS_ID!,
      range: 'Sheet1!A2:E10000', // Updated to include column E for reason
    });

    const rows = response.data.values || [];
    const errors: string[] = [];
    const warnings: string[] = [];
    const transactionsToCreate: any[] = [];

    console.log(`📊 Processing ${rows.length} correction rows...`);

    // Process all rows in memory
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Updated column mapping based on actual sheet structure:
      // A: Artis Code, B: Correction Amount, C: Type (not used), D: Date Applied, E: Reason
      const [artisCode, correction, type, date, reason] = row;
      
      try {
        if (!artisCode || artisCode.includes('Instructions:') || !correction) {
          continue;
        }

        // Validate data
        const validation = this.validateCorrectionData(artisCode, correction, date);
        if (!validation.isValid) {
          errors.push(`Row ${i + 2} (${artisCode}): ${validation.errors.join(', ')}`);
          continue;
        }
        if (validation.warnings.length > 0) {
          warnings.push(`Row ${i + 2} (${artisCode}): ${validation.warnings.join(', ')}`);
        }

        const product = this.getProductFromCache(artisCode);
        if (!product) {
          errors.push(`Row ${i + 2}: Product not found: ${artisCode}`);
          continue;
        }

        // Extract number from correction string (e.g., "16 Stock Adjustment" -> 16)
        const correctionMatch = correction.toString().match(/^([+-]?\d+\.?\d*)/);
        if (!correctionMatch) {
          errors.push(`Invalid correction amount for ${artisCode}: ${correction}`);
          continue;
        }
        
        const correctionAmount = parseFloat(correctionMatch[1]);
        
        if (correctionAmount === 0 || isNaN(correctionAmount)) {
          continue;
        }

        // Validate date
        let transactionDate = new Date();
        if (date) {
          const parsedDate = new Date(date);
          if (!isNaN(parsedDate.getTime())) {
            transactionDate = parsedDate;
          }
        }
        
        transactionsToCreate.push({
          productId: product.id,
          type: 'CORRECTION',
          quantity: correctionAmount, // Keep positive/negative for CORRECTION type
          date: transactionDate,
          notes: `CORRECTION: ${correctionAmount > 0 ? '+' : ''}${correctionAmount} kg. ${reason || ''}`
          // operationId removed - not needed for Google Sheets sync
        });

      } catch (error: any) {
        errors.push(`Error processing correction row ${artisCode || 'unknown'}: ${error.message}`);
      }
    }

    // Bulk create transactions with stock recalculation
    const t = await sequelize.transaction();
    
    try {
      await Transaction.bulkCreate(transactionsToCreate, { transaction: t });
      
      // Get unique product IDs
      const productIds = new Set(transactionsToCreate.map(t => t.productId));
      
      // Recalculate stock for affected products
      for (const productId of productIds) {
        const stockResult = await sequelize.query(
          `SELECT COALESCE(SUM(
            CASE 
              WHEN type = 'IN' THEN quantity
              WHEN type = 'OUT' THEN -quantity
              WHEN type = 'CORRECTION' THEN quantity
            END
          ), 0) as total_stock
          FROM "Transactions"
          WHERE "productId" = :productId`,
          {
            replacements: { productId },
            type: QueryTypes.SELECT,
            transaction: t
          }
        );
        
        const currentStock = parseFloat((stockResult as any)[0].total_stock) || 0;
        
        await sequelize.query(
          `UPDATE "Products" 
           SET "currentStock" = :currentStock,
               "updatedAt" = NOW()
           WHERE "id" = :productId`,
          {
            replacements: { currentStock, productId },
            transaction: t
          }
        );
      }
      
      await t.commit();
      // Successfully processed corrections
      
      return { added: transactionsToCreate.length, errors, warnings };

    } catch (error: any) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * Optimized initial stock sync
   */
  async syncInitialStockOptimized(): Promise<{ added: number; errors: string[] }> {
    // Starting optimized initial stock sync
    
    await this.loadProductCache();
    
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.initialStockSheetId!,
      range: 'Sheet1!A2:D10000', // Explicitly set large range
    });

    const rows = response.data.values || [];
    const errors: string[] = [];
    const transactionsToCreate: any[] = [];
    const productUpdates: Array<{ id: string; stock: number }> = [];

    // Processing initial stock rows

    // Process all rows in memory
    for (const row of rows) {
      const [artisCode, initialStock, date, notes] = row;
      
      try {
        if (!artisCode || artisCode.includes('Instructions:') || !initialStock) continue;

        const product = this.getProductFromCache(artisCode);
        if (!product) {
          errors.push(`Product not found: ${artisCode}`);
          continue;
        }

        const initialStockValue = parseFloat(initialStock);
        const currentStockValue = product.currentStock || 0;
        const difference = initialStockValue - currentStockValue;

        if (difference !== 0) {
          transactionsToCreate.push({
            productId: product.id,
            type: difference > 0 ? 'IN' : 'OUT',
            quantity: Math.abs(difference),
            date: date ? new Date(date) : new Date(),
            notes: `INITIAL STOCK: Set to ${initialStockValue} kg. ${notes || ''}`,
            operationId: `INIT-BATCH-${Date.now()}`
          });

          productUpdates.push({
            id: product.id,
            stock: initialStockValue
          });
        }

      } catch (error: any) {
        errors.push(`Error processing initial stock row ${artisCode || 'unknown'}: ${error.message}`);
      }
    }

    // Bulk operations in transaction
    const t = await sequelize.transaction();
    
    try {
      // Bulk create transactions
      if (transactionsToCreate.length > 0) {
        await Transaction.bulkCreate(transactionsToCreate, { transaction: t });
      }

      // Bulk update product stocks using raw query for speed
      if (productUpdates.length > 0) {
        const updateCases = productUpdates.map(p => 
          `WHEN '${p.id}' THEN ${p.stock}`
        ).join(' ');
        
        const productIds = productUpdates.map(p => `'${p.id}'`).join(',');
        
        await sequelize.query(
          `UPDATE "Products" 
           SET "currentStock" = CASE "id" ${updateCases} END,
               "updatedAt" = NOW()
           WHERE "id" IN (${productIds})`,
          { transaction: t }
        );
      }

      await t.commit();
      // Successfully set initial stock
      
      return { added: productUpdates.length, errors };

    } catch (error: any) {
      await t.rollback();
      throw error;
    }
  }

  // Keep the original methods but redirect to optimized versions
  async syncConsumption() { return this.syncConsumptionOptimized(); }
  async syncPurchases() { return this.syncPurchasesOptimized(); }
  async syncCorrections() { return this.syncCorrectionsOptimized(); }
  async syncInitialStock() { return this.syncInitialStockOptimized(); }

  // Copy other methods from original service...
  async getPendingSummary() {
    const summary = {
      consumption: 0,
      purchases: 0,
      corrections: 0,
      initialStock: 0
    };

    try {
      // Check consumption sheet with large range
      const consumptionResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEETS_CONSUMPTION_ID!,
        range: 'Sheet1!A2:B10000',
      });
      const consumptionRows = consumptionResponse.data.values || [];
      summary.consumption = consumptionRows.filter(row => row[0] && row[1]).length;

      // Check purchases sheet with large range
      const purchasesResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID!,
        range: 'Sheet1!A2:C10000',
      });
      const purchaseRows = purchasesResponse.data.values || [];
      summary.purchases = purchaseRows.filter(row => 
        row[0] && row[1] && row[2] && 
        !row[0].includes('Example:') && 
        !row[0].includes('Instructions:')
      ).length;

      // Check corrections sheet with large range
      const correctionsResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEETS_CORRECTIONS_ID!,
        range: 'Sheet1!A2:C10000',
      });
      const correctionRows = correctionsResponse.data.values || [];
      summary.corrections = correctionRows.filter(row => 
        row[0] && row[2] && !row[0].includes('Instructions:')
      ).length;

      // Check initial stock sheet with large range
      if (this.initialStockSheetId) {
        const initialStockResponse = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.initialStockSheetId!,
          range: 'Sheet1!A2:B10000',
        });
        const initialStockRows = initialStockResponse.data.values || [];
        summary.initialStock = initialStockRows.filter(row => 
          row[0] && row[1] && !row[0].includes('Instructions:')
        ).length;
      }

    } catch (error: any) {
      // Error getting pending summary
    }

    return summary;
  }

  async clearSheet(type: 'consumption' | 'purchases' | 'corrections' | 'initialStock'): Promise<void> {
    const sheetId = {
      consumption: process.env.GOOGLE_SHEETS_CONSUMPTION_ID,
      purchases: process.env.GOOGLE_SHEETS_PURCHASES_ID,
      corrections: process.env.GOOGLE_SHEETS_CORRECTIONS_ID,
      initialStock: this.initialStockSheetId
    }[type];

    if (!sheetId) return;

    // Archive current data
    await this.archiveSheet(type);

    // Clear the main sheet (keep headers) with large range
    await this.sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: 'Sheet1!A2:Z10000',
    });
  }

  private async archiveSheet(type: string): Promise<void> {
    const sheetId = {
      consumption: process.env.GOOGLE_SHEETS_CONSUMPTION_ID,
      purchases: process.env.GOOGLE_SHEETS_PURCHASES_ID,
      corrections: process.env.GOOGLE_SHEETS_CORRECTIONS_ID,
      initialStock: this.initialStockSheetId
    }[type];

    if (!sheetId) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 16);
    const archiveName = `Archive_${timestamp}`;

    try {
      // Get current data with large range
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Sheet1!A1:Z10000',
      });

      const values = response.data.values;
      if (!values || values.length <= 1) return;

      // Create new sheet
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: archiveName
              }
            }
          }]
        }
      });

      // Copy data to archive
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${archiveName}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values }
      });

    } catch (error) {
      // Error archiving sheet
    }
  }

  async getArchiveTabs(type: 'consumption' | 'purchases' | 'corrections' | 'initialStock'): Promise<string[]> {
    const sheetId = {
      consumption: process.env.GOOGLE_SHEETS_CONSUMPTION_ID,
      purchases: process.env.GOOGLE_SHEETS_PURCHASES_ID,
      corrections: process.env.GOOGLE_SHEETS_CORRECTIONS_ID,
      initialStock: this.initialStockSheetId
    }[type];

    if (!sheetId) return [];

    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: sheetId,
        fields: 'sheets.properties.title'
      });

      const sheets = response.data.sheets || [];
      return sheets
        .map(sheet => sheet.properties?.title || '')
        .filter(title => title.startsWith('Archive_'))
        .sort()
        .reverse();
    } catch (error) {
      // Error getting archive tabs
      return [];
    }
  }

  // Setup methods remain the same
  async setupConsumptionSheet(): Promise<void> {
    // Setting up Consumption sheet
    
    const products = await Product.findAll({
      order: [['artisCodes', 'ASC']],
      attributes: ['artisCodes']
    });

    const currentMonth = new Date().toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });

    const template = [
      ['Artis Code', 'Consumption (kg)', 'Month', 'Notes'],
      ...products.map(p => [
        p.artisCodes[0] || '',
        '', // Empty for user to fill
        currentMonth,
        ''
      ])
    ];

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEETS_CONSUMPTION_ID!,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: template },
    });

    // Consumption sheet ready
  }

  async setupPurchasesSheet(): Promise<void> {
    // Setting up Purchases sheet

    const template = [
      ['Artis Code', 'Date', 'Amount (kg)', 'Notes'],
      ['Example: 101', '2025-01-15', '500', 'PO #123'],
      ['', '', '', ''],
      ['Instructions:', '', '', ''],
      ['1. Enter date as YYYY-MM-DD', '', '', ''],
      ['2. One row per purchase transaction', '', '', ''],
      ['3. Multiple purchases for same product are OK', '', '', '']
    ];

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID!,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: template },
    });

    // Purchases sheet ready
  }

  async setupCorrectionsSheet(): Promise<void> {
    // Setting up Corrections sheet

    const template = [
      ['Artis Code', 'Correction Amount', 'Date Applied', 'Reason'],
      ['Example: 101', '-5', '2025-01-31', 'Monthly reconciliation'],
      ['', '', '', ''],
      ['Instructions:', '', '', ''],
      ['1. Enter positive numbers for additions (e.g., 50)', '', '', ''],
      ['2. Enter negative numbers for deductions (e.g., -30)', '', '', ''],
      ['3. Date format: YYYY-MM-DD', '', '', ''],
      ['4. Always provide a reason for tracking', '', '', '']
    ];

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEETS_CORRECTIONS_ID!,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: template },
    });

    // Corrections sheet ready
  }

  async setupInitialStockSheet(): Promise<void> {
    // Setting up Initial Stock sheet

    const products = await Product.findAll({
      order: [['artisCodes', 'ASC']],
      attributes: ['id', 'artisCodes', 'currentStock']
    });

    const template = [
      ['Artis Code', 'Initial Stock (kg)', 'Date', 'Notes'],
      ...products.map(p => [
        p.artisCodes[0] || '',
        p.currentStock || '0',
        new Date().toISOString().split('T')[0],
        'Opening balance'
      ])
    ];

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.initialStockSheetId!,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: template },
    });

    // Initial Stock sheet ready
  }
}

export default SheetsManagerOptimizedService;