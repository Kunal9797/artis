import { google } from 'googleapis';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import sequelize from '../config/sequelize';
import { Transaction, Product } from '../models';
import { Op } from 'sequelize';

dotenv.config();

async function fastSyncFromSheets() {
  console.log('⚡ Fast sync from Google Sheets...\n');
  
  const credentials = JSON.parse(
    fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_PATH!, 'utf8')
  );
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    await sequelize.authenticate();
    
    // Pre-fetch all products for fast lookup
    console.log('📊 Loading products...');
    const products = await Product.findAll({
      attributes: ['id', 'artisCodes']
    });
    const productMap = new Map(
      products.map(p => [p.artisCodes[0], p])
    );
    console.log(`✅ Loaded ${products.length} products\n`);

    // 1. Sync Consumption
    console.log('🔄 Syncing consumption data...');
    const consResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_CONSUMPTION_ID!,
      range: 'Sheet1!A2:D',
    });
    
    const consRows = consResponse.data.values || [];
    const consTransactions: any[] = [];
    
    for (const row of consRows) {
      const [artisCode, consumption, month, notes] = row;
      if (!artisCode || !consumption || !month) continue;
      
      const product = productMap.get(artisCode);
      if (!product) continue;
      
      const monthDate = new Date(`${month} 1`);
      const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      consTransactions.push({
        productId: product.id,
        type: 'OUT',
        quantity: parseFloat(consumption),
        date: lastDay,
        notes: notes || `Monthly consumption for ${month}`
      });
    }
    
    if (consTransactions.length > 0) {
      await Transaction.bulkCreate(consTransactions, { 
        hooks: false,
        validate: false 
      });
      console.log(`✅ Added ${consTransactions.length} consumption records\n`);
    }

    // 2. Sync Purchases
    console.log('🔄 Syncing purchase data...');
    const purchResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_PURCHASES_ID!,
      range: 'Sheet1!A2:E',
    });
    
    const purchRows = purchResponse.data.values || [];
    const purchTransactions: any[] = [];
    
    for (const row of purchRows) {
      const [artisCode, quantity, purchaseDate, notes] = row;
      if (!artisCode || !quantity || !purchaseDate) continue;
      
      const product = productMap.get(artisCode);
      if (!product) continue;
      
      purchTransactions.push({
        productId: product.id,
        type: 'IN',
        quantity: parseFloat(quantity),
        date: new Date(purchaseDate),
        notes: notes || 'Purchase order'
      });
    }
    
    if (purchTransactions.length > 0) {
      await Transaction.bulkCreate(purchTransactions, { 
        hooks: false,
        validate: false 
      });
      console.log(`✅ Added ${purchTransactions.length} purchase records\n`);
    }

    // 3. Sync Corrections
    console.log('🔄 Syncing corrections...');
    const corrResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_CORRECTIONS_ID!,
      range: 'Sheet1!A2:E',
    });
    
    const corrRows = corrResponse.data.values || [];
    const corrTransactions: any[] = [];
    
    for (const row of corrRows) {
      const [artisCode, amount, type, dateApplied, reason] = row;
      if (!artisCode || !amount) continue;
      
      const product = productMap.get(artisCode);
      if (!product) continue;
      
      corrTransactions.push({
        productId: product.id,
        type: 'CORRECTION',
        quantity: parseFloat(amount),
        date: dateApplied ? new Date(dateApplied) : new Date(),
        notes: `CORRECTION: ${type || 'Stock Adjustment'}. ${reason || ''}`
      });
    }
    
    if (corrTransactions.length > 0) {
      await Transaction.bulkCreate(corrTransactions, { 
        hooks: false,
        validate: false 
      });
      console.log(`✅ Added ${corrTransactions.length} correction records\n`);
    }

    // 4. Update Initial Stock
    console.log('🔄 Updating initial stock...');
    const stockResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_INITIAL_STOCK_ID!,
      range: 'Sheet1!A2:B',
    });
    
    const stockRows = stockResponse.data.values || [];
    let stockUpdated = 0;
    
    for (const row of stockRows) {
      const [artisCode, initialStock] = row;
      if (!artisCode || !initialStock) continue;
      
      const product = productMap.get(artisCode);
      if (!product) continue;
      
      await Product.update(
        { initialStock: parseFloat(initialStock) },
        { where: { id: product.id } }
      );
      stockUpdated++;
    }
    
    console.log(`✅ Updated initial stock for ${stockUpdated} products\n`);

    // Archive sheets
    console.log('📦 Archiving sheets...');
    const sheetsManager = require('../services/sheets-manager.service').SheetsManagerService;
    const manager = new sheetsManager();
    
    await manager.archiveSheet('consumption');
    await manager.archiveSheet('purchases');
    await manager.archiveSheet('corrections');
    await manager.archiveSheet('initialStock');
    
    console.log('✅ All data synced and archived successfully!');
    console.log('\nRun npm run verify-sync to check the results');
    
  } catch (error) {
    console.error('Error during sync:', error);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  fastSyncFromSheets().catch(console.error);
}

export { fastSyncFromSheets };